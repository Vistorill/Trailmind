import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../drizzle/schema";
import { env } from "./env";

let pool: mysql.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    pool = mysql.createPool(env.DATABASE_URL);
    db = drizzle(pool, { schema, mode: "default" });
  }
  return db;
}
