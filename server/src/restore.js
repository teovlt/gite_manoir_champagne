// Restores a backup e-mailed by backup.js (also possible from Administration › Espace développeur).
// Usage: node src/restore.js [--with-users] <manoir-…-donnees.json.gz> [manoir-…-photos-1-sur-2.json.gz …]
//   - a "données" file replaces every collection it contains (content, requests…), accounts excepted
//     unless --with-users is given;
//   - "photos" files add or replace the photos they contain, without removing the others.
import fs from "node:fs";
import { client, connect } from "./db.js";
import { createRestorePoint, restoreDump } from "./backup.js";

const args = process.argv.slice(2);
const keepUsers = !args.includes("--with-users");
const paths = args.filter((a) => !a.startsWith("--"));
if (!paths.length) {
  console.error("Usage: node src/restore.js [--with-users] <fichier-donnees.json.gz> [fichiers-photos.json.gz …]");
  process.exit(1);
}

await connect();
await createRestorePoint("Avant restauration en ligne de commande", "restore.js");
for (const file of paths) {
  for (const r of await restoreDump(fs.readFileSync(file), { keepUsers })) {
    console.log(`${file} › ${r.name} : ${r.count} document(s)${r.skipped ? " (ignoré)" : ""}`);
  }
}
console.log("Restauration terminée (un point de restauration a été créé juste avant).");
await client.close();
