# Convex Agent Chat Migration Plan

Last updated: 2026-06-28

## Summary

Move the site chat from the current custom Convex action plus manual provider fetch flow to Convex Agent as the canonical chat runtime. The goal is persisted streaming, live admin visibility, human-in-the-loop readiness, and less bespoke LLM plumbing, while preserving page-control tools, booking behavior, unread admin state, markdown rendering, and the existing admin dashboard.

## Current State

- Runtime: Next.js + Convex `^1.41.0`.
- Storage: custom `chatThreads`, `chatMessages`, and `chatRateLimits` tables.
- Visitor UI: `ChatWidget` subscribes with `api.chat.getForClient`, sends with `api.chatAi.send`, and renders local shadcn-style `ai-elements` components.
- Admin UI: `/admin` reads `chatThreads` + `chatMessages`, computes unread from `lastVisitorMessageAt` versus `adminLastReadAt`.
- LLM path: `convex/chatAi.ts` manually calls ILMU via OpenAI-compatible HTTP and Gemini via Google REST fetch.
- Tool path: page navigation/highlight tools are returned to the browser; Cal.com booking is intercepted server-side after the LLM tool call.
- Not installed right now: `ai`, `@ai-sdk/react`, `@convex-dev/agent`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`.
- Baseline repo state: no unstaged work exists as of this update; the prior chat/postcard changes have been fully pushed. Implementation should still inspect touched areas before editing, but there is no known dirty worktree to preserve.

## Architecture Decision

Use Convex Agent, not `useChat`, as the source of truth.

Do not make a Next `/api/chat` endpoint with `@ai-sdk/react` `useChat` as the core architecture. AI SDK's normal React pattern streams from an HTTP endpoint like `/api/chat` into one client session, which is great for simple chat but less ideal for an admin/human-in-loop inbox that must observe the same stream reactively.

Use Convex Agent as the canonical message/thread store because it persists threads/messages, supports live-updating clients, and can save streaming deltas into Convex so the visitor and admin can both subscribe to the same response, even across reconnects.

Still use AI SDK-compatible pieces on the server where useful: `@ai-sdk/google` for Gemini, `@ai-sdk/openai-compatible` for ILMU, AI SDK tool schemas, and AI Elements UI conventions. The key distinction is that AI SDK provider/tool primitives are okay, but AI SDK `useChat` should not own chat state.

Keep the local AI Elements/shadcn-style components as the UI layer, but wire them to Convex Agent `UIMessage`/parts instead of the legacy `{ author, body }` rows.

References:

- [Convex Agents overview](https://docs.convex.dev/agents/overview)
- [Convex streaming deltas](https://docs.convex.dev/agents/streaming)
- [AI SDK useChat](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI Elements](https://elements.ai-sdk.dev/)

## Phased Rollout

### 1. Install and register Agent dependencies

- Add `@convex-dev/agent`, `ai`, `@ai-sdk/google`, and `@ai-sdk/openai-compatible`.
- Register the Agent component in `convex/convex.config.ts` with `app.use(agent)`.
- Run Convex codegen/dev sync after registration.

### 2. Widen the schema for a safe bridge

- Add optional `agentThreadId` to `chatThreads`.
- Keep `chatThreads` permanently as the app/admin index for `clientId`, `title`, `status`, `lastMessageAt`, `lastVisitorMessageAt`, and `adminLastReadAt`.
- Keep `chatMessages` during migration for old history and rollback; mark it as legacy only after Agent reads are verified.

### 3. Build the Agent-backed chat module

- Create a new Convex module for Agent chat actions/queries.
- Define model helpers:
  - ILMU: `createOpenAICompatible({ baseURL: "https://api.ilmu.ai/v1", apiKey: env.ILMU_API_KEY })`.
  - Gemini: `createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })` or default `google(...)`.
- Preserve model selection with `"ilmu"` default and `"gemini"` alternate.
- Move prompts/page-context formatting from `chatAi.ts` into shared pure helpers.

### 4. Convert tools without losing behavior

- Booking tools become server-side Agent tools with Convex context; handlers call the existing Cal.com helper and return deterministic success/failure text.
- Page-control tools remain client effects. Persist their tool call/result parts in the Agent message stream, then have `ChatWidget` apply them once per tool call id.
- Use `stopWhen: stepCountIs(3)` for booking so the model can respond naturally after tool results; avoid the old "replace reply after generation" flow.

### 5. Add streaming send/read APIs

- `send`: rate limit, create/resolve app `chatThreads`, create/resolve Agent thread, then call `agent.streamText(..., { saveStreamDeltas: { returnImmediately: true, chunking: "word", throttleMs: 150 } })`.
- Client read query: accept app `chatThreads` id, map to `agentThreadId`, return `listUIMessages` plus `syncStreams`.
- Admin read query: same Agent-backed transcript query, gated by `POSTCARD_ADMIN_SECRET`.
- Use `useUIMessages(..., { stream: true })` in the widget and admin where supported by the Agent React helpers.

### 6. Backfill existing history

- Use `@convex-dev/migrations` for a resumable migration.
- For each legacy `chatThreads` row without `agentThreadId`, create an Agent thread, copy `chatMessages` in chronological order with `saveMessage`, then patch `agentThreadId`.
- Dry-run first in dev, run in dev, verify counts/sample transcripts, then repeat in prod.

### 7. Roll out behind a flag

- Add `NEXT_PUBLIC_CHAT_BACKEND=legacy|agent`, default `legacy`.
- Ship widened schema + Agent code first with legacy still active.
- Enable `agent` locally, verify visitor/admin streaming, then enable in production.
- Keep legacy `chatAi.send` and `chatMessages` for at least one deploy after production verification.

## Rollback Path

- Set `NEXT_PUBLIC_CHAT_BACKEND=legacy`.
- Leave `chatThreads` and `chatMessages` intact throughout the first Agent rollout.
- Keep legacy `convex/chatAi.ts` callable until production Agent transcripts, unread state, booking, and page tools are verified.
- If Agent writes partial data, keep `agentThreadId` optional and continue reading legacy rows for threads that do not have verified Agent transcripts.

## Test Checklist

### Convex checks

- `npx convex dev --once --typecheck enable`
- Generated API is clean.
- No schema validation failures.

### Unit/helper tests

- Provider selection.
- Page-context prompt construction.
- Booking helper outputs.
- Tool-effect parsing.

### Migration tests

- Dry-run count.
- Migrated thread count equals legacy thread count.
- Sampled transcripts preserve chronological order.

### Browser QA

- Visitor sends a message and sees word-level streaming.
- Refresh mid-stream and confirm the stream resumes from Convex.
- Admin `/admin` sees the same conversation update live.
- Unread flips on new visitor message and clears when opened.
- Booking availability and booking failure fallback still sound like Ashvin.
- Page navigation/highlight tools still execute in the browser.

### Final gates

- `npm run lint`
- `npm run build -- --webpack` or the repo's current Next build command.
- `npx convex dev --once --typecheck enable`
- Production smoke test after deploy.

## Assumptions

- Keep `chatThreads` as app-owned admin metadata even after Agent owns message content.
- Do not delete legacy `chatMessages` in the first migration; removal is a later cleanup after production confidence.
- Use AI SDK provider/tool primitives through Convex Agent, but not `@ai-sdk/react` `useChat` as the primary runtime.
