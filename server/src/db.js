import fs from "node:fs";
import path from "node:path";
import { GridFSBucket, MongoClient } from "mongodb";
import { config } from "./config.js";
import { hashPassword } from "./auth.js";

export const client = new MongoClient(config.mongoUri);

/** Collections, set by connect(). */
export const col = {};
export let uploads;
/** Safety copies taken before a restore (GridFS), listed in the developer space. */
export let restorePoints;

const readShared = (file) => JSON.parse(fs.readFileSync(path.join(config.sharedDir, file), "utf8"));
export const contentSchema = readShared("content.json");

export async function connect() {
  await client.connect();
  const db = client.db(config.mongoDb);
  for (const name of ["users", "content", "settings", "photos", "events", "requests", "activity", "availability", "sessions", "logins", "backups"]) {
    col[name] = db.collection(name);
  }
  uploads = new GridFSBucket(db, { bucketName: "uploads" });
  restorePoints = new GridFSBucket(db, { bucketName: "restorepoints" });

  await Promise.all([
    col.users.createIndex({ email: 1 }, { unique: true }),
    col.users.createIndex({ resetTokenHash: 1 }, { sparse: true }),
    col.users.createIndex({ emailTokenHash: 1 }, { sparse: true }),
    col.content.createIndex({ page: 1, key: 1, lang: 1 }, { unique: true }),
    col.photos.createIndex({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } }),
    col.photos.createIndex({ section: 1, sort: 1 }),
    col.events.createIndex({ active: 1, endDate: 1 }),
    col.requests.createIndex({ createdAt: -1 }),
    col.activity.createIndex({ createdAt: -1 }),
    // The activity log keeps one year: older entries are removed by MongoDB.
    col.activity.createIndex({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 }),
    col.availability.createIndex({ start: 1, end: 1 }),
    // Signed-in sessions (listed and revoked from the developer space) disappear when they expire.
    col.sessions.createIndex({ uid: 1 }),
    col.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    // Sign-in attempts, successful or not, kept 6 months.
    col.logins.createIndex({ at: -1 }),
    col.logins.createIndex({ at: 1 }, { expireAfterSeconds: 182 * 24 * 3600 }),
    col.backups.createIndex({ at: -1 }),
  ]);
  console.log(`[db] connected to ${db.databaseName}`);
  return db;
}

export async function getSetting(key, fallback) {
  const doc = await col.settings.findOne({ _id: key });
  return doc ? doc.value : fallback;
}

export const setSetting = (key, value) => col.settings.updateOne({ _id: key }, { $set: { value } }, { upsert: true });

/** kind "login" marks sign-ins: listed in the feed, but not counted as a change to the site. */
export const logActivity = (userName, message, kind = "change") =>
  col.activity.insertOne({ userName, message, kind, createdAt: new Date() });

const SEEN_STEP = 5 * 60 * 1000;
const VISIT_GAP = 30 * 60 * 1000;

/**
 * Records that a signed-in user is active. "Remember me" sessions last weeks without asking for the
 * password again, so coming back after 30 minutes away counts as a new sign-in (date + activity entry).
 * The conditional update lets parallel requests of one page log a single entry.
 */
export async function markSeen(user, { signIn = false } = {}) {
  const now = new Date();
  const last = user.lastSeenAt ?? user.lastLoginAt ?? null;
  if (!signIn && last && now - last < SEEN_STEP) return;
  const newVisit = signIn || !last || now - last > VISIT_GAP;
  const filter = signIn ? { _id: user._id } : { _id: user._id, lastSeenAt: user.lastSeenAt ?? { $exists: false } };
  const { modifiedCount } = await col.users.updateOne(filter, { $set: { lastSeenAt: now, ...(newVisit ? { lastLoginAt: now } : {}) } });
  if (modifiedCount && newVisit) await logActivity(user.name.split(" ")[0], "a ouvert une session", "login");
}

/** Idempotent seeding: adds whatever is missing, never overwrites the owners' edits. */
export async function seed() {
  const photos = readShared("photos.json");
  await Promise.all(
    photos.map((p, i) =>
      col.photos.updateOne({ key: p.key }, { $setOnInsert: { ...p, sort: i, createdAt: new Date() } }, { upsert: true }),
    ),
  );
  // The bundled default photos moved from JPEG to WebP: follow them, unless the owners replaced the photo.
  await Promise.all(
    photos
      .filter((p) => p.url?.endsWith(".webp"))
      .map((p) => col.photos.updateOne({ key: p.key, url: p.url.replace(/\.webp$/, ".jpg") }, { $set: { url: p.url } })),
  );
  // Slots that got a bundled photo after launch: fill them once if still empty, so an owner's later removal sticks.
  const filledLater = [
    "region.hero",
    "region.mont",
    "region.saint-malo",
    "region.debarquement",
    "region.barneville",
    "region.hague",
    "region.cherbourg",
    "region.barfleur",
    "region.gatteville",
    "region.racine",
    "region.vauban",
    "region.saint-vaast",
    "jardins.nord-2",
    "jardins.nord-3",
    "jardins.spa",
    "accueil.portrait",
  ];
  await Promise.all(
    photos
      .filter((p) => filledLater.includes(p.key) && p.url)
      .map((p) =>
        col.photos.updateOne({ key: p.key, url: null, bundleFilled: { $ne: true } }, { $set: { url: p.url, bundleFilled: true } }),
      ),
  );
  // Bundled gallery photos (shared/gallery.json): added once each, at the end of the gallery,
  // so they show up in the admin like an upload and an owner's later deletion sticks.
  const seededGallery = new Set(await getSetting("seededGallery", []));
  const newGallery = readShared("gallery.json").filter((g) => !seededGallery.has(g.url));
  if (newGallery.length) {
    const last = await col.photos.find().sort({ sort: -1 }).limit(1).next();
    let sort = (last?.sort ?? 0) + 1;
    for (const g of newGallery) {
      await col.photos.updateOne(
        { key: null, url: g.url },
        { $setOnInsert: { key: null, section: g.section, alt: g.alt, url: g.url, sort: sort++, createdAt: new Date() } },
        { upsert: true },
      );
      seededGallery.add(g.url);
    }
    await setSetting("seededGallery", [...seededGallery]);
  }
  // Captions of bundled gallery photos corrected after their first seeding (owners' own edits are kept).
  const fixedCaptions = [
    ["/photos/galerie/chambre-serenite-3.webp", "Chambre Sérénité"],
    ["/photos/galerie/chambre-familiale-2.webp", "Lits superposés"],
  ];
  const gallery = readShared("gallery.json");
  await Promise.all(
    fixedCaptions.map(([url, oldFr]) => {
      const g = gallery.find((x) => x.url === url);
      return g && col.photos.updateOne({ key: null, url, "alt.fr": oldFr }, { $set: { alt: g.alt } });
    }),
  );

  // Text overrides that only repeat the default, or still hold a "[to be completed]" placeholder, are dropped:
  // the site then shows the current default text (older admin versions saved every field of a page).
  const defaultText = new Map(
    contentSchema.pages.flatMap((p) =>
      p.sections.flatMap((s) => s.fields.flatMap((f) => Object.entries(f.value ?? {}).map(([lang, v]) => [`${p.id}|${f.key}|${lang}`, v]))),
    ),
  );
  const stale = [];
  for await (const row of col.content.find({}, { projection: { page: 1, key: 1, lang: 1, value: 1 } })) {
    const value = String(row.value ?? "").trim();
    const def = defaultText.get(`${row.page}|${row.key}|${row.lang}`);
    if (!value || (def !== undefined && value === def.trim()) || /^\[[^\]]*\]$/.test(value)) stale.push(row._id);
  }
  if (stale.length) await col.content.deleteMany({ _id: { $in: stale } });

  const defaults = {
    pricing: readShared("pricing.json"),
    navLinks: contentSchema.navLinks,
    bannerEnabled: true,
    site: contentSchema.settings,
    icalUrls: [],
  };
  for (const [key, value] of Object.entries(defaults)) {
    await col.settings.updateOne({ _id: key }, { $setOnInsert: { value } }, { upsert: true });
  }
  // 2027 price list: new seasons, mid-week in 4 nights, spa per stay length, horses. The admin screen
  // only edits prices, so the new grid replaces the stored one once.
  if (!(await getSetting("pricing2027", false))) {
    await setSetting("pricing", defaults.pricing);
    await setSetting("pricing2027", true);
  }

  if ((await col.users.countDocuments()) === 0) {
    const { email, password, name } = config.admin;
    if (email && password) {
      await col.users.insertOne({
        email: email.toLowerCase(),
        name,
        role: "admin",
        passwordHash: await hashPassword(password),
        createdAt: new Date(),
      });
      console.log(`[seed] admin account created for ${email}`);
    } else {
      console.warn("[seed] no admin account: set ADMIN_EMAIL and ADMIN_PASSWORD, or run `node src/create-user.js`.");
    }
  }
}
