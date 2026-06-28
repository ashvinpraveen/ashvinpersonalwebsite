import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp({
  env: {
    CLEVE_PUBLIC_PROFILE_SLUG: v.optional(v.string()),
    CAL_API_KEY: v.optional(v.string()),
    CAL_BOOKING_LINK: v.optional(v.string()),
    CAL_EVENT_TYPE_ID: v.optional(v.string()),
    CAL_EVENT_TYPE_SLUG: v.optional(v.string()),
    CAL_USERNAME: v.optional(v.string()),
    GOOGLE_AI_API_KEY: v.optional(v.string()),
    GOOGLE_AI_MODEL: v.optional(v.string()),
    ILMU_API_KEY: v.optional(v.string()),
    ILMU_MODEL: v.optional(v.string()),
    POSTCARD_ADMIN_SECRET: v.optional(v.string()),
  },
});

app.use(agent);
app.use(migrations);

export default app;
