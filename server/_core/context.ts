import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { SESSION_COOKIE_NAME } from "../../shared/const";
import type { PublicUser } from "../../shared/types";
import { getDb } from "./db";
import { env } from "./env";

interface JwtPayload {
  userId: number;
}

export async function createContext({ req, res }: CreateExpressContextOptions) {
  let user: PublicUser | null = null;

  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const db = getDb();
      const [row] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (row) {
        user = {
          id: row.id,
          openId: row.openId,
          name: row.name,
          email: row.email,
          role: row.role,
          learningLevel: row.learningLevel,
          studyGoalCertification: row.studyGoalCertification,
          dailyStudyMinutes: row.dailyStudyMinutes,
          preferredLanguage: row.preferredLanguage,
          onboardingCompleted: row.onboardingCompleted,
        };
      }
    } catch {
      // invalid token — treat as unauthenticated
    }
  }

  return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
