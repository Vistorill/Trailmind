export type UserRole = "user" | "admin";

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}
export type LearningLevel = "beginner" | "intermediate" | "advanced";

export interface PublicUser {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  learningLevel?: LearningLevel;
  studyGoalCertification?: string | null;
  dailyStudyMinutes?: number;
  preferredLanguage?: string;
  onboardingCompleted?: boolean;
}
