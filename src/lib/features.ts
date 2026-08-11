function isDisabled(value: string | undefined) {
  if (!value) return false;
  return ["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

export const isConvexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
export const isConvexSiteConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_SITE_URL);

export const isBlogEnabled = !isDisabled(process.env.NEXT_PUBLIC_ENABLE_BLOG);
export const isAiChatEnabled =
  isConvexConfigured && !isDisabled(process.env.NEXT_PUBLIC_ENABLE_AI_CHAT);
export const chatBackend =
  process.env.NEXT_PUBLIC_CHAT_BACKEND === "agent" ? "agent" : "legacy";
export const isAgentChatBackend = chatBackend === "agent";
export const isPostcardsEnabled =
  isConvexConfigured && !isDisabled(process.env.NEXT_PUBLIC_ENABLE_POSTCARDS);
export const isRunClubEnabled =
  isConvexConfigured && !isDisabled(process.env.NEXT_PUBLIC_ENABLE_RUN_CLUB);
export const isMusicEnabled = !isDisabled(process.env.NEXT_PUBLIC_ENABLE_MUSIC);
export const isAdminEnabled = isConvexConfigured;
export const isPostHogEnabled =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
  !isDisabled(process.env.NEXT_PUBLIC_ENABLE_POSTHOG);
