export const SESSION_COOKIE_NAME = "app_session_id";

export const LEARNING_LEVELS = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" },
] as const;

export const LANGUAGES = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "en-US", label: "English (US)" },
] as const;

export const CERTIFICATIONS = [
  "Administrator",
  "Platform Developer I",
  "Platform Developer II",
  "Sales Cloud Consultant",
  "Service Cloud Consultant",
  "Marketing Cloud Consultant",
  "Data Cloud Consultant",
  "AI Associate",
] as const;
