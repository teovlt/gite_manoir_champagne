import { col, getSetting, setSetting } from "./db.js";
import { config } from "./config.js";

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
      const res = await fetch(url, { headers: { "User-Agent": "ManoirDeLaChampagne/1.0 (calendar sync)" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = parseIcal(await res.text());
      await col.availability.deleteMany({ source: "ical", feed: url });
      if (events.length) {
        await col.availability.insertMany(
          events.map((e) => ({ start: e.start, end: e.end, label: e.summary || "Réservé (calendrier externe)", source: "ical", feed: url, uid: e.uid, createdAt: new Date() })),
        );
      }
      report.push({ url, ok: true, count: events.length });
    } catch (err) {
      report.push({ url, ok: false, error: err.message });
    }
  }
  await setSetting("icalLastSync", { at: new Date(), report });
  return report;
}

export function startIcalSync() {
  const run = () => syncIcal().catch((err) => console.error("[ical]", err.message));
  run();
  setInterval(run, Math.max(5, config.icalSyncMinutes) * 60 * 1000).unref();
}
