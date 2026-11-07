// Creates an admin account, or resets its password if the e-mail already exists.
// Usage: node src/create-user.js <email> <password> "<Prénom Nom>"
import { db } from "./db.js";
import { hashPassword } from "./auth.js";

const [email, password, name = "Propriétaire"] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: node src/create-user.js <email> <mot-de-passe (10 caractères min.)> "<Prénom Nom>"');
  process.exit(1);
}

const hash = await hashPassword(password);
db.prepare(
  "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name",
).run(email, name, hash);
console.log(`Compte prêt : ${email} (${name})`);
