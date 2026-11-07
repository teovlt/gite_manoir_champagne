// Creates an admin account, or resets its password if the e-mail already exists.
// Usage: node src/create-user.js <email> <password> "<Prénom Nom>"
import { client, col, connect } from "./db.js";
import { hashPassword } from "./auth.js";

const [email, password, name = "Propriétaire"] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: node src/create-user.js <email> <mot-de-passe (10 caractères min.)> "<Prénom Nom>"');
  process.exit(1);
}

await connect();
const existing = await col.users.findOne({ email: email.toLowerCase() });
await col.users.updateOne(
  { email: email.toLowerCase() },
  {
    $set: { name, passwordHash: await hashPassword(password), sessionVersion: (existing?.sessionVersion ?? 0) + 1 },
    $setOnInsert: { role: "admin", createdAt: new Date() },
    $unset: { resetTokenHash: "", resetExpires: "" },
  },
  { upsert: true },
);
console.log(`Compte prêt : ${email} (${name})`);
await client.close();
