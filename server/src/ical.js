import crypto from "node:crypto";
import { col, getSetting, setSetting } from "./db.js";
import { config } from "./config.js";
import { notifyConflicts } from "./mail.js";

/** Unfolds RFC 5545 continuation lines. */
const unfold = (text) => text.replace(/\r?\n[ \t]/g, "");

/** "20260712" or "20260712T150000Z" → "2026-07-12" */
const toDay = (value) => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/** Minimal VEVENT parser: enough for Abritel/Airbnb/Booking/Google availability feeds. */
export function parseIcal(text) {
  const events = [];
  let current = null;
  for (const line of unfold(text).split(/\r?\n/)) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current?.start) events.push({ ...current, end: current.end ?? current.start });
      current = null;
    } else if (current) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const name = line.slice(0, idx).split(";")[0].toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (name === "DTSTART") current.start = toDay(value);
      else if (name === "DTEND") current.end = toDay(value);
      else if (name === "UID") current.uid = value;
      else if (name === "SUMMARY") current.summary = value.replace(/\\,/g, ",").replace(/\\n/g, " ");
    }
  }
  return events.filter((e) => e.start && e.end >= e.start);
}

export async function syncIcal() {
  const urls = await getSetting("icalUrls", []);
  const report = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ManoirDeLaChampagne/1.0 (calendar sync)" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = parseIcal(await res.text());
      await col.availability.deleteMany({ source: "ical", feed: url });
      if (events.length) {
        await col.availability.insertMany(
          events.map((e) => ({
            start: e.start,
            end: e.end,
            label: e.summary || "Réservé (calendrier externe)",
            source: "ical",
            feed: url,
            uid: e.uid,
            createdAt: new Date(),
          })),
        );
      }
      report.push({ url, ok: true, count: events.length });
    } catch (err) {
      report.push({ url, ok: false, error: err.message });
    }
  }
  await setSetting("icalLastSync", { at: new Date(), report });
  await alertNewConflicts().catch((err) => console.error("[ical] conflict alert:", err.message));
  return report;
}

// ---------------------------------------------------------------- double bookings

const platformName = (feed) => {
  try {
    return new URL(feed).hostname.replace(/^www\./, "");
  } catch {
    return "calendrier externe";
  }
};

/** Stable as long as the two periods keep their dates (imported periods get new ids on every sync). */
const conflictKey = (local, ext) => `${local._id}|${ext.feed}|${ext.start}|${ext.end}`;

/**
 * Upcoming periods imported from a platform that overlap a stay confirmed on the site or blocked by hand:
 * a probable double booking. Dates that match exactly are flagged as "exact": often just the platform
 * re-exporting the dates it imported from this site, but still worth a look.
 */
export async function findConflicts() {
  const from = new Date().toISOString().slice(0, 10);
  const [blocks, ignored] = await Promise.all([
    col.availability
      .find({ end: { $gt: from } })
      .sort({ start: 1 })
      .toArray(),
    getSetting("icalConflictsIgnored", []),
  ]);
  const skip = new Set(ignored);
  const local = blocks.filter((b) => b.source !== "ical");
  const external = blocks.filter((b) => b.source === "ical");
  const out = [];
  for (const l of local) {
    for (const e of external) {
      if (!(e.start < l.end && e.end > l.start)) continue;
      const key = conflictKey(l, e);
      if (skip.has(key)) continue;
      out.push({
        key,
        exact: e.start === l.start && e.end === l.end,
        local: { id: String(l._id), start: l.start, end: l.end, label: l.label, source: l.source },
        external: { start: e.start, end: e.end, label: e.label, platform: platformName(e.feed) },
      });
    }
  }
  return out;
}

/** Hides a conflict the owners checked. Keys of conflicts that no longer exist are pruned. */
export async function ignoreConflict(key) {
  const current = new Set((await findConflicts()).map((c) => c.key));
  if (!current.has(key)) return false;
  const kept = (await getSetting("icalConflictsIgnored", [])).filter((k) => k.split("|")[3] >= new Date().toISOString().slice(0, 10));
  await setSetting("icalConflictsIgnored", [...kept, key].slice(-300));
  return true;
}

/** E-mails the owners once per new overlap (exact re-exports excepted, they stay visible in the admin). */
async function alertNewConflicts() {
  const conflicts = (await findConflicts()).filter((c) => !c.exact);
  const notified = new Set(await getSetting("icalConflictsNotified", []));
  const fresh = conflicts.filter((c) => !notified.has(c.key));
  if (!fresh.length) return;
  await setSetting("icalConflictsNotified", [...notified, ...fresh.map((c) => c.key)].slice(-300));
  await notifyConflicts(fresh);
}

export function startIcalSync() {
  const run = () => syncIcal().catch((err) => console.error("[ical]", err.message));
  run();
  setInterval(run, Math.max(5, config.icalSyncMinutes) * 60 * 1000).unref();
}

// ---------------------------------------------------------------- export

/** Secret part of the export link, created on first use. Regenerating it invalidates the old link. */
export async function exportToken({ renew = false } = {}) {
  let token = renew ? null : await getSetting("icalExportToken", null);
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    await setSetting("icalExportToken", token);
  }
  return token;
}

export const exportUrl = (token) => `${config.publicUrl}/api/calendar/${token}.ics`;

const fold = (line) => {
  const parts = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? " " : "") + line.slice(i, i + 73));
  return parts.join("\r\n");
};

const icsDay = (day) => day.replaceAll("-", "");

/**
 * Feed for Abritel / Airbnb / Booking: the dates booked through the site or blocked by hand.
 * Periods imported from those platforms are left out, so a platform never re-imports its own bookings
 * (link the platforms to each other directly). No names or labels: every event reads "Réservé".
 */
export async function buildIcalExport() {
  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const blocks = await col.availability
    .find({ source: { $ne: "ical" }, end: { $gte: from } })
    .sort({ start: 1 })
    .toArray();
  const host = new URL(config.publicUrl).hostname;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Manoir de la Champagne//Calendrier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Manoir de la Champagne",
    ...blocks.flatMap((b) => [
      "BEGIN:VEVENT",
      `UID:${b._id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDay(b.start)}`,
      `DTEND;VALUE=DATE:${icsDay(b.end)}`,
      "SUMMARY:Réservé",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
