import "dotenv/config";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "../server/_core/db";

const email = process.argv[2];

if (!email) {
  console.error("Uso: npm run admin:promote -- <email>");
  process.exit(1);
}

const db = getDb();
const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (!user) {
  console.error(`Usuário não encontrado: ${email}`);
  process.exit(1);
}

if (user.role === "admin") {
  console.log(`${email} já é administrador.`);
  process.exit(0);
}

await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
console.log(`✓ ${email} promovido a administrador (uso ilimitado).`);
