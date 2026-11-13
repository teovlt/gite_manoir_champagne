// Creates an admin account, or resets its password if the e-mail already exists.
// Usage: node src/create-user.js <email> <password> "<Prénom Nom>" [admin|editor|developer]
// The role is only applied when given (an existing account keeps its role otherwise); the account is
// also reactivated if it was suspended.
import { client, col, connect } from "./db.js";
import { hashPassword } from "./auth.js";

const [email, password, name = "Propriétaire", role] = process.argv.slice(2);
if (!email || !password || password.length < 10 || (role && !["admin", "editor", "developer"].includes(role))) {
  console.error('Usage: node src/create-user.js <email> <mot-de-passe (10 caractères min.)> "<Prénom Nom>" [admin|editor|developer]');
  process.exit(1);
}

await connect();
const existing = await col.users.findOne({ email: email.toLowerCase() });
await col.users.updateOne(
  { email: email.toLowerCase() },
  {
    $set: { name, passwordHash: await hashPassword(password), sessionVersion: (existing?.sessionVersion ?? 0) + 1, ...(role && { role }) },
    $setOnInsert: { ...(!role && { role: "admin" }), createdAt: new Date() },
    $unset: { resetTokenHash: "", resetExpires: "", disabled: "" },
  },
  { upsert: true },
);
console.log(`Compte prêt : ${email} (${name}, ${role ?? existing?.role ?? "admin"})`);
await client.close();
