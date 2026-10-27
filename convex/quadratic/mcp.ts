import { ConvexError } from "convex/values";
import { env, httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { sha256Hex } from "./access";

/**
 * A stateless MCP server (Streamable HTTP transport, JSON responses) for
 * Quadratic. Clients authenticate with `Authorization: Bearer qk_...` keys
 * created in Settings → API & MCP. Routed in convex/http.ts and proxied by
 * the Next.js app at /quadratic/mcp.
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "quadratic", title: "Quadratic", version: "1.0.0" };
const DEFAULT_APP_URL = "https://ashvinpraveen.com";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, accept, mcp-protocol-version, mcp-session-id, x-api-key, x-quadratic-app-url",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id, www-authenticate",
};

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: Record<string, unknown> };

type Schema = Record<string, unknown>;
const str = (description: string): Schema => ({ type: "string", description });
const num = (description: string): Schema => ({ type: "number", description });
const bool = (description: string): Schema => ({ type: "boolean", description });
const strArray = (description: string): Schema => ({ type: "array", items: { type: "string" }, description });
const nullableStr = (description: string): Schema => ({ type: ["string", "null"], description });

const ISSUE_FIELDS: Record<string, Schema> = {
  description: str("Markdown description."),
  team: str("Team key, name or id. Optional when the workspace has a single team."),
  state: str("Status name, type (backlog/unstarted/started/completed/canceled) or id."),
  priority: num("0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low."),
  assignee: nullableStr('Member name, @handle, email, id, or "me". null unassigns.'),
  labels: strArray("Label names or ids. Replaces the issue's labels."),
  project: nullableStr("Project name or id. null removes it from its project."),
  cycle: nullableStr('Cycle number, id, or "current"/"next"/"previous". null removes it.'),
  parentId: nullableStr("Parent issue identifier (e.g. ENG-12) or id, to make this a sub-issue."),
  dueDate: nullableStr("Due date as YYYY-MM-DD."),
  estimate: { type: ["number", "null"], description: "Estimate in points." },
};

const PROJECT_FIELDS: Record<string, Schema> = {
  summary: str("One-line summary."),
  description: str("Markdown description."),
  state: str("backlog, planned, started, paused, completed or canceled."),
  priority: num("0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low."),
  lead: nullableStr('Lead: member name, @handle, email, id or "me".'),
  teams: strArray("Team keys, names or ids."),
  startDate: nullableStr("YYYY-MM-DD."),
  targetDate: nullableStr("YYYY-MM-DD."),
};

const LIST_FILTERS: Record<string, Schema> = {
  query: str("Search issue titles, or an exact identifier like ENG-12."),
  team: str("Team key, name or id."),
  state: str("Status name or type."),
  assignee: str('Member name, @handle, email, id, "me" or "none".'),
  label: str("Label name or id."),
  project: str("Project name or id."),
  cycle: str('Cycle number, id, or "current"/"next"/"previous".'),
  priority: num("0–4."),
  parentId: str("Only sub-issues of this issue."),
  includeArchived: bool("Include archived issues. Defaults to false."),
  orderBy: { type: "string", enum: ["updatedAt", "createdAt"], description: "Defaults to updatedAt." },
  limit: num("Max results, 1–250. Defaults to 50."),
};

type ToolDef = {
  name: string;
  title: string;
  description: string;
  kind: "read" | "write";
  properties?: Record<string, Schema>;
  required?: string[];
};

const TOOLS: ToolDef[] = [
  { name: "list_teams", title: "List teams", kind: "read", description: "List the teams in the workspace." },
  {
    name: "get_team",
    title: "Get team",
    kind: "read",
    description: "Get a team and its workflow statuses.",
    properties: { query: str("Team key, name or id.") },
    required: ["query"],
  },
  { name: "list_users", title: "List users", kind: "read", description: "List workspace members." },
  {
    name: "get_user",
    title: "Get user",
    kind: "read",
    description: 'Get a member by name, @handle, email or id. Use "me" for the authenticated user.',
    properties: { query: str('Member reference, or "me".') },
  },
  {
    name: "list_issues",
    title: "List issues",
    kind: "read",
    description: "List or search issues with optional filters. Most recently updated first.",
    properties: LIST_FILTERS,
  },
  {
    name: "list_my_issues",
    title: "List my issues",
    kind: "read",
    description: "List issues assigned to the authenticated user.",
    properties: { state: LIST_FILTERS.state, team: LIST_FILTERS.team, includeArchived: LIST_FILTERS.includeArchived, limit: LIST_FILTERS.limit },
  },
  {
    name: "get_issue",
    title: "Get issue",
    kind: "read",
    description: "Get an issue's full details, sub-issues and relations.",
    properties: { id: str("Issue identifier (e.g. ENG-12) or id.") },
    required: ["id"],
  },
  {
    name: "create_issue",
    title: "Create issue",
    kind: "write",
    description: "Create a new issue.",
    properties: { title: str("Issue title."), ...ISSUE_FIELDS },
    required: ["title"],
  },
  {
    name: "update_issue",
    title: "Update issue",
    kind: "write",
    description: "Update an existing issue. Only the fields you pass change. Pass team to move it to another team.",
    properties: { id: str("Issue identifier (e.g. ENG-12) or id."), title: str("New title."), ...ISSUE_FIELDS },
    required: ["id"],
  },
  {
    name: "list_comments",
    title: "List comments",
    kind: "read",
    description: "List comments on an issue, oldest first.",
    properties: { issueId: str("Issue identifier or id.") },
    required: ["issueId"],
  },
  {
    name: "create_comment",
    title: "Create comment",
    kind: "write",
    description: "Comment on an issue. Markdown supported; @handle mentions notify members.",
    properties: {
      issueId: str("Issue identifier or id."),
      body: str("Markdown comment body."),
      parentId: str("Comment id to reply to."),
    },
    required: ["issueId", "body"],
  },
  {
    name: "list_issue_statuses",
    title: "List issue statuses",
    kind: "read",
    description: "List a team's workflow statuses in order.",
    properties: { team: str("Team key, name or id.") },
  },
  {
    name: "get_issue_status",
    title: "Get issue status",
    kind: "read",
    description: "Get one workflow status by name, type or id.",
    properties: { query: str("Status name, type or id."), team: str("Team key, name or id.") },
    required: ["query"],
  },
  {
    name: "list_issue_labels",
    title: "List issue labels",
    kind: "read",
    description: "List labels available in the workspace or for a team.",
    properties: { team: str("Team key, name or id.") },
  },
  {
    name: "create_issue_label",
    title: "Create issue label",
    kind: "write",
    description: "Create a label. Workspace-wide unless teamId is given.",
    properties: {
      name: str("Label name."),
      color: str("Hex color like #5e6ad2."),
      description: str("Description."),
      teamId: str("Team key, name or id for a team-only label."),
    },
    required: ["name"],
  },
  {
    name: "list_projects",
    title: "List projects",
    kind: "read",
    description: "List projects.",
    properties: {
      team: str("Only projects for this team."),
      state: str("Filter by status, e.g. started."),
      includeArchived: bool("Include archived projects."),
    },
  },
  {
    name: "get_project",
    title: "Get project",
    kind: "read",
    description: "Get a project's details and progress.",
    properties: { query: str("Project name or id.") },
    required: ["query"],
  },
  {
    name: "create_project",
    title: "Create project",
    kind: "write",
    description: "Create a project.",
    properties: { name: str("Project name."), ...PROJECT_FIELDS },
    required: ["name"],
  },
  {
    name: "update_project",
    title: "Update project",
    kind: "write",
    description: "Update a project. Only the fields you pass change.",
    properties: { id: str("Project name or id."), name: str("New name."), ...PROJECT_FIELDS },
    required: ["id"],
  },
  {
    name: "list_cycles",
    title: "List cycles",
    kind: "read",
    description: "List a team's cycles, or get the current/next/previous one.",
    properties: {
      teamId: str("Team key, name or id."),
      type: { type: "string", enum: ["current", "previous", "next"], description: "Return only this cycle." },
    },
  },
];

export const MCP_TOOL_NAMES = TOOLS.map((tool) => tool.name);

function toolList() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: tool.properties ?? {},
      ...(tool.required ? { required: tool.required } : {}),
      additionalProperties: false,
    },
    annotations: {
      title: tool.title,
      readOnlyHint: tool.kind === "read",
      destructiveHint: false,
      idempotentHint: tool.kind === "read",
      openWorldHint: false,
    },
  }));
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function errorMessage(error: unknown) {
  if (error instanceof ConvexError) return String(error.data);
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function bearerKey(req: Request) {
  const header = req.headers.get("authorization");
  const match = header ? /^Bearer\s+(\S+)$/i.exec(header.trim()) : null;
  return match?.[1] ?? req.headers.get("x-api-key") ?? null;
}

function appUrlFrom(req: Request) {
  const forwarded = req.headers.get("x-quadratic-app-url");
  if (forwarded && /^https?:\/\/[^/\s]+$/.test(forwarded)) return forwarded;
  return env.QUADRATIC_APP_URL ?? DEFAULT_APP_URL;
}

const INSTRUCTIONS =
  "Quadratic is a Linear-style issue tracker. Issues are referenced by identifiers like ENG-12. " +
  "Teams, members, statuses, labels, projects and cycles can be referenced by name, so you rarely need ids. " +
  "Use list_teams and list_issue_statuses to discover valid values before creating issues.";

export const handleMcp = httpAction(async (ctx, req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    // Stateless server: no standalone SSE stream and no sessions to delete.
    return json(rpcError(null, -32000, "Method not allowed. POST JSON-RPC messages."), 405, { Allow: "POST" });
  }

  const key = bearerKey(req);
  const resolved = key ? await ctx.runQuery(internal.quadratic.apiKeys.resolve, { keyHash: await sha256Hex(key) }) : null;
  if (!resolved) {
    return json(
      rpcError(null, -32001, "Missing or invalid API key. Create one in Quadratic → Settings → API & MCP."),
      401,
      { "WWW-Authenticate": 'Bearer realm="quadratic"' },
    );
  }
  if (!resolved.lastUsedAt || Date.now() - resolved.lastUsedAt > 10 * 60 * 1000) {
    await ctx.runMutation(internal.quadratic.apiKeys.touch, { keyId: resolved.keyId });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error."), 400);
  }

  const appUrl = appUrlFrom(req);
  const isBatch = Array.isArray(payload);
  const messages = (isBatch ? payload : [payload]) as JsonRpcRequest[];
  const responses: unknown[] = [];

  for (const message of messages) {
    if (!message || typeof message !== "object" || typeof message.method !== "string") {
      // Responses from the client (we never send requests) or junk.
      if (message && typeof message === "object" && "id" in message && !("result" in message || "error" in message)) {
        responses.push(rpcError(message.id ?? null, -32600, "Invalid request."));
      }
      continue;
    }
    const isNotification = message.id === undefined || message.id === null;
    if (isNotification) continue;
    const id = message.id as JsonRpcId;
    const params = message.params ?? {};

    switch (message.method) {
      case "initialize": {
        const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
          },
        });
        break;
      }
      case "ping":
        responses.push({ jsonrpc: "2.0", id, result: {} });
        break;
      case "tools/list":
        responses.push({ jsonrpc: "2.0", id, result: { tools: toolList() } });
        break;
      case "resources/list":
        responses.push({ jsonrpc: "2.0", id, result: { resources: [] } });
        break;
      case "resources/templates/list":
        responses.push({ jsonrpc: "2.0", id, result: { resourceTemplates: [] } });
        break;
      case "prompts/list":
        responses.push({ jsonrpc: "2.0", id, result: { prompts: [] } });
        break;
      case "tools/call": {
        const name = typeof params.name === "string" ? params.name : "";
        const tool = TOOLS.find((t) => t.name === name);
        if (!tool) {
          responses.push(rpcError(id, -32602, `Unknown tool: ${name}`));
          break;
        }
        const toolArgs =
          params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
            ? params.arguments
            : {};
        const call = { userId: resolved.userId, workspaceId: resolved.workspaceId, appUrl, tool: name, args: toolArgs };
        try {
          const result: unknown =
            tool.kind === "read"
              ? await ctx.runQuery(internal.quadratic.mcpTools.read, call)
              : await ctx.runMutation(internal.quadratic.mcpTools.write, call);
          responses.push({
            jsonrpc: "2.0",
            id,
            result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false },
          });
        } catch (error) {
          responses.push({
            jsonrpc: "2.0",
            id,
            result: { content: [{ type: "text", text: errorMessage(error) }], isError: true },
          });
        }
        break;
      }
      default:
        responses.push(rpcError(id, -32601, `Method not found: ${message.method}`));
    }
  }

  if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders });
  return json(isBatch ? responses : responses[0]);
});
