import { router } from "../_core/trpc";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { trailsRouter } from "./trails";
import { quizRouter } from "./quiz";
import { weakTopicsRouter } from "./weakTopics";
import { flashcardsRouter } from "./flashcards";
import { chatRouter } from "./chat";
import { historyRouter } from "./history";
import { billingRouter } from "./billing";
import { coursesRouter } from "./courses";
import { gamificationRouter } from "./gamification";
import { communityRouter } from "./community";
import { analyticsRouter } from "./analytics";
import { integrationsRouter } from "./integrations";
import { visualRouter } from "./visual";

export const appRouter = router({
  auth: authRouter,
  profile: profileRouter,
  trails: trailsRouter,
  quiz: quizRouter,
  weakTopics: weakTopicsRouter,
  flashcards: flashcardsRouter,
  chat: chatRouter,
  history: historyRouter,
  billing: billingRouter,
  courses: coursesRouter,
  gamification: gamificationRouter,
  community: communityRouter,
  analytics: analyticsRouter,
  integrations: integrationsRouter,
  visual: visualRouter,
});

export type AppRouter = typeof appRouter;
