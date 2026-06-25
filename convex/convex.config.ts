import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    CLEVE_PUBLIC_PROFILE_SLUG: v.optional(v.string()),
    GOOGLE_AI_API_KEY: v.optional(v.string()),
    GOOGLE_AI_MODEL: v.optional(v.string()),
    POSTCARD_ADMIN_SECRET: v.optional(v.string()),
  },
});

export default app;
