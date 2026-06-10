import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import type { UserRole } from "../../shared/types";
import { getDb } from "../_core/db";

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export async function isAdminUser(userId: number): Promise<boolean> {
  const db = getDb();
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return isAdminRole(user.role);
}
