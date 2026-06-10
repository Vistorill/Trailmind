import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { users, userProgress } from "../../drizzle/schema";
import { SESSION_COOKIE_NAME } from "../../shared/const";
import { getDb } from "./db";
import { env } from "./env";

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function setSessionCookie(res: Response, userId: number) {
  const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "30d" });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
  });
}

async function getUserResponse(userId: number) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role,
    learningLevel: user.learningLevel,
    studyGoalCertification: user.studyGoalCertification,
    dailyStudyMinutes: user.dailyStudyMinutes,
    preferredLanguage: user.preferredLanguage,
    onboardingCompleted: user.onboardingCompleted,
  };
}

export function mountAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      const db = getDb();
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) {
        return res.status(409).json({ error: "E-mail já cadastrado" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const openId = `local_${randomUUID()}`;

      const [result] = await db.insert(users).values({
        openId,
        email,
        name: name ?? null,
        passwordHash,
      });

      const userId = result.insertId;
      await db.insert(userProgress).values({ userId });

      setSessionCookie(res, userId);
      const user = await getUserResponse(userId);
      return res.json({ ok: true, user });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      }

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      setSessionCookie(res, user.id);
      const userData = await getUserResponse(user.id);
      return res.json({ ok: true, user: userData });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearSessionCookie(res);
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token) return res.json({ user: null });

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number };
      const user = await getUserResponse(payload.userId);
      return res.json({ user });
    } catch {
      return res.json({ user: null });
    }
  });
}
