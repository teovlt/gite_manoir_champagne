import zlib from "node:zlib";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { BSON, ObjectId } from "mongodb";
import { config } from "./config.js";
import { client, col, getSetting, restorePoints, setSetting } from "./db.js";
import { send } from "./mail.js";

const { EJSON } = BSON;

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const PHOTO_COLLECTIONS = ["uploads.files", "uploads.chunks"];
/**
 * Never saved nor restored: open sessions and the sign-in log (a restore must not bring back a revoked
 * session nor erase traces), the backup history and the restore points themselves.
 */
const EXCLUDED = ["sessions", "logins", "backups", "restorepoints.files", "restorepoints.chunks"];
/** Settings that describe the server's current state, kept as they are when a backup is restored. */
const KEPT_SETTINGS = ["maintenance", "adminAccess", "backupLastDate", "backupPhotosDate"];
/** Resend refuses e-mails over 40 MB once base64-encoded (+33 %): photo parts stay well under it. */
const PART_BYTES = 20 * 1024 * 1024;
const CHECK_MS = 15 * 60 * 1000;
const RESTORE_POINTS_KEPT = 10;

const db = () => client.db(config.mongoDb);

/** Short name of the site, used in the subject (the Gmail filter can rely on it): manoir-champagne. */
export const siteName = () => config.backup?.name ?? new URL(config.publicUrl).hostname.replace(/^www\./, "").split(".")[0];

const day = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const parisHour = (d) => Number(d.toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }));

/** EJSON keeps ObjectId, Date and Binary types, so the restore gets the exact same documents back. */
const pack = async (collections, kind) =>
  gzip(
    EJSON.stringify(
      { __meta: { site: siteName(), kind, createdAt: new Date(), db: db().databaseName }, ...collections },
      { relaxed: false },
    ),
  );

async function dumpData() {
  const names = (await db().listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
  const data = {};
  for (const name of names.filter((n) => !PHOTO_COLLECTIONS.includes(n) && !EXCLUDED.includes(n) && !n.startsWith("system.")).sort()) {
    data[name] = await db().collection(name).find().toArray();
  }
  return data;
}

/** Photos (GridFS), split in parts under maxBytes. A photo is never cut in two. */
async function dumpPhotos(maxBytes = Infinity) {
  const files = await db().collection("uploads.files").find().sort({ _id: 1 }).toArray();
  const groups = [];
  let current = { files: [], bytes: 0 };
  for (const file of files) {
    if (current.files.length && current.bytes + file.length > maxBytes) {
      groups.push(current);
      current = { files: [], bytes: 0 };
    }
    current.files.push(file);
    current.bytes += file.length;
  }
  if (current.files.length) groups.push(current);

  const parts = [];
  for (const group of groups) {
    const chunks = await db()
      .collection("uploads.chunks")
      .find({ files_id: { $in: group.files.map((f) => f._id) } })
      .toArray();
    parts.push({ "uploads.files": group.files, "uploads.chunks": chunks });
  }
  return { parts, count: files.length };
}

export const kb = (n) => (n < 1024 * 1024 ? `${Math.ceil(n / 1024)} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`);
const countsOf = (dump) => Object.fromEntries(Object.entries(dump).map(([c, docs]) => [c, docs.length]));

const logBackup = (entry) =>
  col.backups.insertOne({ at: new Date(), ...entry }).catch((err) => console.error("[backup] history:", err.message));

/** A backup file to download: "data" (everything but the photos), "photos", or "full". */
export async function backupFile(kind, by) {
  const collections = {};
  if (kind !== "photos") Object.assign(collections, await dumpData());
  if (kind !== "data") Object.assign(collections, (await dumpPhotos()).parts[0] ?? { "uploads.files": [], "uploads.chunks": [] });
  const buffer = await pack(collections, kind);
  const label = { data: "donnees", photos: "photos", full: "complet" }[kind];
  await logBackup({ trigger: "download", kind, by, ok: true, bytes: buffer.length, counts: countsOf(collections) });
  return { filename: `${siteName()}-${day(new Date())}-${label}.json.gz`, buffer };
}

/**
 * Dumps the database and e-mails it to BACKUP_DB_MAIL: the data every day, the photos too once a week
 * (one e-mail per part of 20 MB). Restore from the developer space, or: node src/restore.js <fichiers .json.gz>
 */
export async function runBackup({ photos = false, trigger = "auto", by = null, to = config.backup?.to } = {}) {
  const now = new Date();
  const name = siteName();
  const date = day(now);
  const tag = `[backup_${name}]`;
  try {
    const data = await dumpData();
    const dataFile = await pack(data, "data");
    const counts = Object.entries(data)
      .map(([c, docs]) => `• ${c} : ${docs.length}`)
      .join("\n");
    const photoDump = photos ? await dumpPhotos(PART_BYTES) : null;
    const photoFiles = await Promise.all((photoDump?.parts ?? []).map((p) => pack(p, "photos")));
    const total = photoFiles.length;

    const restore =
      "Restauration : Administration › Espace développeur › Sauvegardes, ou node src/restore.js <fichiers .json.gz> (voir README › Sauvegardes).";
    await send({
      to,
      subject: `${tag} Données du ${date}${total ? ` + photos (${total} e-mail${total > 1 ? "s" : ""})` : ""}`,
      text:
        `Sauvegarde ${trigger === "auto" ? "automatique" : `manuelle (${by})`} de ${config.publicUrl} (base ${db().databaseName}).\n\n` +
        `Documents par collection :\n${counts}\n\n` +
        (photoDump
          ? `Photos : ${photoDump.count}, envoyées dans ${total} e-mail(s) séparé(s) « ${tag} Photos du ${date} ».\n`
          : "Photos : non incluses (envoyées chaque lundi).\n") +
        `\n${restore}\n`,
      attachments: [{ filename: `${name}-${date}-donnees.json.gz`, content: dataFile.toString("base64") }],
      timeout: 120_000,
    });

    for (const [i, part] of photoFiles.entries()) {
      const n = `${i + 1}/${total}`;
      await send({
        to,
        subject: `${tag} Photos du ${date} (${n})`,
        text: `Photos (GridFS) de ${config.publicUrl}, partie ${n} (${kb(part.length)}).\n\n${restore}\n`,
        attachments: [{ filename: `${name}-${date}-photos-${i + 1}-sur-${total}.json.gz`, content: part.toString("base64") }],
        timeout: 120_000,
      });
    }

    const bytes = dataFile.length + photoFiles.reduce((s, f) => s + f.length, 0);
    await logBackup({ trigger, kind: photos ? "full" : "data", by, to, ok: true, bytes, parts: total, counts: countsOf(data) });
    console.log(`[backup] sent to ${to}: data ${kb(dataFile.length)}${total ? `, photos in ${total} part(s)` : ""}`);
  } catch (err) {
    await logBackup({ trigger, kind: photos ? "full" : "data", by, to, ok: false, error: err.message });
    throw err;
  }
}

// ---------------------------------------------------------------- restore

/** Reads a backup file (.json.gz, or the .json inside). */
export async function readDump(buffer) {
  const raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? await gunzip(buffer) : buffer;
  let dump;
  try {
    dump = EJSON.parse(raw.toString("utf8"), { relaxed: false });
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (.json.gz attendu).");
  }
  if (!dump || typeof dump !== "object" || Array.isArray(dump)) throw new Error("Ce fichier n'est pas une sauvegarde valide.");
  const { __meta: meta = null, ...collections } = dump;
  for (const [name, docs] of Object.entries(collections)) {
    if (!Array.isArray(docs)) throw new Error(`Collection « ${name} » illisible dans ce fichier.`);
  }
  return { meta, collections };
}

/** What a restore of this file would do, collection by collection. */
export async function inspectDump(buffer) {
  const { meta, collections } = await readDump(buffer);
  const current = Object.fromEntries(
    await Promise.all(Object.keys(collections).map(async (n) => [n, await db().collection(n).estimatedDocumentCount()])),
  );
  return {
    meta,
    bytes: buffer.length,
    collections: Object.entries(collections).map(([name, docs]) => ({
      name,
      count: docs.length,
      current: current[name],
      mode: name.startsWith("uploads.") ? "merge" : "replace",
      skipped: EXCLUDED.includes(name),
    })),
  };
}

/**
 * Restores a backup: every collection of the file replaces the current one, except the photos
 * (uploads.*) which are added or replaced one by one, so that photos added since are kept.
 * keepUsers leaves the accounts as they are (default: a restore must not lock anybody out).
 */
export async function restoreDump(buffer, { keepUsers = true } = {}) {
  const { collections } = await readDump(buffer);
  const kept = await col.settings.find({ _id: { $in: KEPT_SETTINGS } }).toArray();
  const report = [];
  for (const [name, docs] of Object.entries(collections)) {
    if (EXCLUDED.includes(name) || name.startsWith("system.") || (keepUsers && name === "users")) {
      report.push({ name, count: docs.length, skipped: true });
      continue;
    }
    const collection = db().collection(name);
    const merge = name.startsWith("uploads.");
    if (!merge) await collection.deleteMany({});
    if (docs.length) {
      await collection.bulkWrite(
        docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
        { ordered: false },
      );
    }
    report.push({ name, count: docs.length, mode: merge ? "merge" : "replace" });
  }
  if (collections.settings && kept.length) {
    await col.settings.bulkWrite(kept.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })));
  }
  return report;
}

// ---------------------------------------------------------------- restore points

/** Copy of the data (photos excepted) taken before a restore, to undo it. The last 10 are kept. */
export async function createRestorePoint(label, by) {
  const data = await dumpData();
  const buffer = await pack(data, "data");
  const stream = restorePoints.openUploadStream(`${siteName()}-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`, {
    metadata: { label, by, counts: countsOf(data) },
  });
  await new Promise((resolve, reject) => Readable.from(buffer).pipe(stream).on("finish", resolve).on("error", reject));
  const old = await restorePoints.find().sort({ uploadDate: -1 }).skip(RESTORE_POINTS_KEPT).toArray();
  for (const f of old) await restorePoints.delete(f._id).catch(() => {});
  await logBackup({ trigger: "restore-point", kind: "data", by, ok: true, bytes: buffer.length, counts: countsOf(data), label });
  return String(stream.id);
}

export const listRestorePoints = async () =>
  (await restorePoints.find().sort({ uploadDate: -1 }).toArray()).map((f) => ({
    id: String(f._id),
    filename: f.filename,
    at: f.uploadDate,
    bytes: f.length,
    label: f.metadata?.label ?? "",
    by: f.metadata?.by ?? null,
    counts: f.metadata?.counts ?? {},
  }));

export async function readRestorePoint(id) {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);
  const file = await restorePoints.find({ _id }).next();
  if (!file) return null;
  const chunks = [];
  for await (const chunk of restorePoints.openDownloadStream(_id)) chunks.push(chunk);
  return { filename: file.filename, buffer: Buffer.concat(chunks) };
}

export const deleteRestorePoint = (id) => (ObjectId.isValid(id) ? restorePoints.delete(new ObjectId(id)) : null);

// ---------------------------------------------------------------- schedule

/**
 * Every day after BACKUP_HOUR (Paris time). The last date is kept in MongoDB, so a restart neither
 * skips nor repeats a backup, and a server that was down at that hour catches up when it comes back.
 */
export function startBackups() {
  if (!config.backup) return;
  if (!config.mail) return console.warn("[backup] BACKUP_DB_MAIL is set but RESEND_API_KEY is not: no backup will be sent.");
  let running = false;
  // Up to 3 attempts a day: a lasting error (Resend refusing the e-mail…) must not send the data every 15 min.
  const failures = { date: null, count: 0 };
  const check = async () => {
    const now = new Date();
    if (running || parisHour(now) < config.backup.hour || (failures.date === day(now) && failures.count >= 3)) return;
    if ((await getSetting("backupLastDate", null)) === day(now)) return;
    running = true;
    try {
      // Monday, or the first backup ever: with the photos.
      const photos =
        now.toLocaleDateString("en-GB", { timeZone: "Europe/Paris", weekday: "short" }) === "Mon" ||
        !(await getSetting("backupPhotosDate", null));
      await runBackup({ photos });
      await setSetting("backupLastDate", day(now));
      if (photos) await setSetting("backupPhotosDate", day(now));
    } catch (err) {
      failures.count = failures.date === day(now) ? failures.count + 1 : 1;
      failures.date = day(now);
      console.error(`[backup] failed (attempt ${failures.count}/3 today):`, err.message);
    } finally {
      running = false;
    }
  };
  check();
  setInterval(check, CHECK_MS).unref();
}

/** When the next automatic backup should leave (for the developer space). */
export async function backupSchedule() {
  if (!config.backup) return null;
  return {
    to: config.backup.to,
    hour: config.backup.hour,
    lastDate: await getSetting("backupLastDate", null),
    photosDate: await getSetting("backupPhotosDate", null),
  };
}
