import fs from "node:fs";
import path from "node:path";
import { GridFSBucket, MongoClient } from "mongodb";
import { config } from "./config.js";
import { hashPassword } from "./auth.js";

export const client = new MongoClient(config.mongoUri);

/** Collections, set by connect(). */
export const col = {};
export let uploads;

const readShared = (file) => JSON.parse(fs.readFileSync(path.join(config.sharedDir, file), "utf8"));
export const contentSchema = readShared("content.json");

export async function connect() {
  await client.connect();
  const db = client.db(config.mongoDb);
  for (const name of ["users", "content", "settings", "photos", "events", "requests", "activity", "availability"]) {
    col[name] = db.collection(name);
  }
  uploads = new GridFSBucket(db, { bucketName: "uploads" });

  await Promise.all([
    col.users.createIndex({ email: 1 }, { unique: true }),
    col.users.createIndex({ resetTokenHash: 1 }, { sparse: true }),
    col.content.createIndex({ page: 1, key: 1, lang: 1 }, { unique: true }),
    col.photos.createIndex({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } }),
    col.photos.createIndex({ section: 1, sort: 1 }),
    col.events.createIndex({ active: 1, endDate: 1 }),
    col.requests.createIndex({ createdAt: -1 }),
    col.activity.createIndex({ createdAt: -1 }),
    col.availability.createIndex({ start: 1, end: 1 }),
  ]);
  console.log(`[db] connected to ${db.databaseName}`);
  return db;
}

export async function getSetting(key, fallback) {
  const doc = await col.settings.findOne({ _id: key });
  return doc ? doc.value : fallback;
}

export const setSetting = (key, value) => col.settings.updateOne({ _id: key }, { $set: { value } }, { upsert: true });

export const logActivity = (userName, message) => col.activity.insertOne({ userName, message, createdAt: new Date() });

/** Idempotent seeding: adds whatever is missing, never overwrites the owners' edits. */
export async function seed() {
  const photos = readShared("photos.json");
  await Promise.all(
    photos.map((p, i) =>
      col.photos.updateOne({ key: p.key }, { $setOnInsert: { ...p, sort: i, createdAt: new Date() } }, { upsert: true }),
    ),
  );

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
