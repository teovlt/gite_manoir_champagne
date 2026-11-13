import { format } from "node:util";

/** Last lines written by the server (console.log / warn / error), shown in the developer space. */
const MAX = 800;
const lines = [];
let seq = 0;

for (const level of ["log", "info", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    lines.push({ id: ++seq, at: new Date(), level: level === "info" ? "log" : level, text: format(...args).slice(0, 4000) });
    if (lines.length > MAX) lines.splice(0, lines.length - MAX);
    original(...args);
  };
}

export const recentLogs = ({ level, after = 0 } = {}) =>
  lines.filter((l) => l.id > after && (!level || level === "all" || (level === "warn" ? l.level !== "log" : l.level === level)));

export const startedAt = new Date();
