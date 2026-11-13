// Sends a backup right away (same e-mail as the daily one).
// Usage: node src/backup-now.js [--photos]
import { config } from "./config.js";
import { client, connect } from "./db.js";
import { runBackup } from "./backup.js";

if (!config.backup || !config.mail) {
  console.error("BACKUP_DB_MAIL et RESEND_API_KEY sont nécessaires.");
  process.exit(1);
}
await connect();
await runBackup({ photos: process.argv.includes("--photos"), trigger: "manual", by: "backup-now.js" });
await client.close();
