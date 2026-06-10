export type PlanTier = "free" | "pro" | "enterprise";

export type QuotaFeature =
  | "trail_analyze"
  | "quiz_answer"
  | "chat_message"
  | "flashcard_review"
  | "visual_analysis";

export const PLAN_LIMITS: Record<PlanTier, Record<QuotaFeature, number>> = {
  free: {
    trail_analyze: 5,
    quiz_answer: 20,
    chat_message: 10,
    flashcard_review: 30,
    visual_analysis: 3,
  },
  pro: {
    trail_analyze: 50,
    quiz_answer: 200,
    chat_message: 100,
    flashcard_review: 500,
    visual_analysis: 20,
  },
  enterprise: {
    trail_analyze: -1,
    quiz_answer: -1,
    chat_message: -1,
    flashcard_review: -1,
    visual_analysis: -1,
  },
};

export const PLAN_PRICES = {
  pro: { monthly: 29.9, yearly: 299 },
  enterprise: { monthly: 99.9, yearly: 999 },
} as const;
