import { eq, desc } from "drizzle-orm";
import { userPoints, badges, userBadges, pointEvents } from "../../drizzle/schema";
import { getDb } from "../_core/db";

const POINT_VALUES: Record<string, number> = {
  trail_completed: 50,
  quiz_perfect: 100,
  streak_day: 10,
  quiz_completed: 25,
  flashcard_review: 5,
  chat_message: 2,
};

const DEFAULT_BADGES = [
  { slug: "first_trail", name: "Primeira Trilha", description: "Analisou sua primeira trilha", icon: "map", threshold: 1 },
  { slug: "quiz_master", name: "Mestre do Quiz", description: "Completou 10 quizzes", icon: "brain", threshold: 10 },
  { slug: "streak_7", name: "Semana de Fogo", description: "7 dias de sequência", icon: "flame", threshold: 7 },
  { slug: "streak_30", name: "Mês Dedicado", description: "30 dias de sequência", icon: "trophy", threshold: 30 },
  { slug: "flashcard_100", name: "Memória de Aço", description: "100 flashcards revisados", icon: "layers", threshold: 100 },
];

export async function ensureBadgesExist() {
  const db = getDb();
  for (const badge of DEFAULT_BADGES) {
    const [existing] = await db.select().from(badges).where(eq(badges.slug, badge.slug)).limit(1);
    if (!existing) {
      await db.insert(badges).values(badge);
    }
  }
}

export async function awardPoints(
  userId: number,
  event: string,
  metadata?: Record<string, unknown>
) {
  const db = getDb();
  const points = POINT_VALUES[event] ?? 5;

  await db.insert(pointEvents).values({ userId, event, points, metadata: metadata ?? null });

  const [existing] = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);
  if (existing) {
    await db
      .update(userPoints)
      .set({ totalPoints: existing.totalPoints + points })
      .where(eq(userPoints.userId, userId));
  } else {
    await db.insert(userPoints).values({ userId, totalPoints: points });
  }

  await checkAndAwardBadges(userId);
  return points;
}

async function checkAndAwardBadges(userId: number) {
  const db = getDb();
  await ensureBadgesExist();

  const [points] = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);
  const totalPoints = points?.totalPoints ?? 0;

  const allBadges = await db.select().from(badges);
  const earned = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  const earnedIds = new Set(earned.map((b) => b.badgeId));

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;
    if (totalPoints >= badge.threshold * 10) {
      await db.insert(userBadges).values({ userId, badgeId: badge.id });
    }
  }
}

export async function getGamificationSummary(userId: number) {
  const db = getDb();
  const [points] = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);

  const earnedBadges = await db
    .select({ badge: badges, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));

  const recentEvents = await db
    .select()
    .from(pointEvents)
    .where(eq(pointEvents.userId, userId))
    .orderBy(desc(pointEvents.createdAt))
    .limit(10);

  return {
    totalPoints: points?.totalPoints ?? 0,
    badges: earnedBadges,
    recentEvents,
  };
}

export async function getLeaderboard(limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(userPoints)
    .orderBy(desc(userPoints.totalPoints))
    .limit(limit);
}
