import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  boolean,
  json,
  decimal,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  learningLevel: mysqlEnum("learningLevel", ["beginner", "intermediate", "advanced"])
    .default("beginner")
    .notNull(),
  studyGoalCertification: varchar("studyGoalCertification", { length: 100 }),
  dailyStudyMinutes: int("dailyStudyMinutes").default(30).notNull(),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("pt-BR").notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userProgress = mysqlTable("user_progress", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().unique(),
  streakDays: int("streakDays").default(0).notNull(),
  totalTrailsAnalyzed: int("totalTrailsAnalyzed").default(0).notNull(),
  totalQuizzesTaken: int("totalQuizzesTaken").default(0).notNull(),
  totalCorrectAnswers: int("totalCorrectAnswers").default(0).notNull(),
  averageQuizScore: decimal("averageQuizScore", { precision: 5, scale: 2 }).default("0"),
  lastActivityAt: timestamp("lastActivityAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const trails = mysqlTable("trails", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  url: varchar("url", { length: 1000 }),
  contentHash: varchar("contentHash", { length: 64 }),
  content: text("content").notNull(),
  summary: text("summary"),
  explanation: text("explanation"),
  examples: text("examples"),
  tips: text("tips"),
  analysisMeta: json("analysisMeta"),
  importQuality: mysqlEnum("importQuality", ["full", "partial", "failed"])
    .default("full")
    .notNull(),
  fetchedAt: timestamp("fetchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyHistory = mysqlTable("study_history", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  trailId: int("trailId"),
  type: mysqlEnum("type", [
    "trail_analyzed",
    "chat_message",
    "quiz_completed",
    "flashcard_review",
  ]).notNull(),
  durationMinutes: int("durationMinutes").default(0),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const quizzes = mysqlTable("quizzes", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  trailId: int("trailId").notNull(),
  question: text("question").notNull(),
  options: json("options").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 1 }).notNull(),
  explanation: text("explanation"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const quizResponses = mysqlTable("quiz_responses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  quizId: int("quizId").notNull(),
  selectedAnswer: varchar("selectedAnswer", { length: 1 }).notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export const weakTopics = mysqlTable("weak_topics", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  trailId: int("trailId"),
  topicId: varchar("topicId", { length: 100 }).notNull(),
  topicName: varchar("topicName", { length: 255 }).notNull(),
  errorCount: int("errorCount").default(0).notNull(),
  correctCount: int("correctCount").default(0).notNull(),
  masteryLevel: decimal("masteryLevel", { precision: 5, scale: 2 }).default("0"),
  lastErrorAt: timestamp("lastErrorAt"),
  isResolved: boolean("isResolved").default(false).notNull(),
});

export const flashcards = mysqlTable("flashcards", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  trailId: int("trailId"),
  front: text("front").notNull(),
  back: text("back").notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  reviewCount: int("reviewCount").default(0).notNull(),
  nextReview: timestamp("nextReview").defaultNow().notNull(),
  interval: int("interval").default(0).notNull(),
  easeFactor: decimal("easeFactor", { precision: 4, scale: 2 }).default("2.50").notNull(),
  lastReviewed: timestamp("lastReviewed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  trailId: int("trailId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  planName: mysqlEnum("planName", ["pro", "enterprise"]).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const usageQuotas = mysqlTable(
  "usage_quotas",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").notNull(),
    feature: varchar("feature", { length: 50 }).notNull(),
    usedCount: int("usedCount").default(0).notNull(),
    monthYear: varchar("monthYear", { length: 7 }).notNull(),
  },
  (table) => [index("user_feature_month_idx").on(table.userId, table.feature, table.monthYear)]
);

export const courses = mysqlTable("courses", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  modules: json("modules").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courseEnrollments = mysqlTable("course_enrollments", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  progress: int("progress").default(0).notNull(),
  completedModules: json("completedModules").default([]),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const certificates = mysqlTable("certificates", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  courseTitle: varchar("courseTitle", { length: 255 }).notNull(),
  verifyCode: varchar("verifyCode", { length: 20 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
});

export const userPoints = mysqlTable("user_points", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().unique(),
  totalPoints: int("totalPoints").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const badges = mysqlTable("badges", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("award"),
  threshold: int("threshold").default(0).notNull(),
});

export const userBadges = mysqlTable("user_badges", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  badgeId: int("badgeId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export const pointEvents = mysqlTable("point_events", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  event: varchar("event", { length: 50 }).notNull(),
  points: int("points").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const forumTopics = mysqlTable("forum_topics", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const forumPosts = mysqlTable("forum_posts", {
  id: int("id").primaryKey().autoincrement(),
  topicId: int("topicId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyGroups = mysqlTable("study_groups", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  creatorId: int("creatorId").notNull(),
  memberCount: int("memberCount").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyGroupMembers = mysqlTable("study_group_members", {
  id: int("id").primaryKey().autoincrement(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const apiKeys = mysqlTable("api_keys", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  keyHash: varchar("keyHash", { length: 64 }).notNull(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  name: varchar("name", { length: 100 }).default("Default"),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyPlans = mysqlTable("study_plans", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  goal: varchar("goal", { length: 255 }).notNull(),
  durationMonths: int("durationMonths").notNull(),
  milestones: json("milestones").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const visualAnalyses = mysqlTable("visual_analyses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl"),
  analysis: text("analysis").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
