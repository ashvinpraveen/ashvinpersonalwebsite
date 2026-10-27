import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

const TOKEN_A = "a".repeat(40);
const TOKEN_B = "b".repeat(40);
const API_KEY = `qk_${"K".repeat(40)}`;

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(api.quadratic.users.signUp, { token: TOKEN_A, name: "Ada Lovelace", email: "ada@example.com" });
  const slug = await t.mutation(api.quadratic.workspaces.create, { token: TOKEN_A, name: "Acme", slug: "acme" });
  const boot = await t.query(api.quadratic.workspaces.bootstrap, { token: TOKEN_A, slug });
  if (boot.status !== "ok") throw new Error("bootstrap failed");
  return { t, slug, boot };
}

async function mcp(t: ReturnType<typeof convexTest>, body: unknown, key = API_KEY) {
  const response = await t.fetch("/quadratic/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: response.status === 202 ? null : await response.json() };
}

async function callTool(t: ReturnType<typeof convexTest>, name: string, args: Record<string, unknown>) {
  const { body } = await mcp(t, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
  const text = body.result.content[0].text as string;
  return { isError: body.result.isError as boolean, text, data: body.result.isError ? null : JSON.parse(text) };
}

describe("workspaces", () => {
  test("creating a workspace seeds a team, workflow and onboarding issues", async () => {
    const { t, boot } = await setup();
    expect(boot.teams).toHaveLength(1);
    expect(boot.teams[0].key).toBe("ACM");
    expect(boot.states.map((s) => s.name)).toEqual([
      "Backlog",
      "Todo",
      "In Progress",
      "In Review",
      "Done",
      "Canceled",
      "Duplicate",
    ]);
    expect(boot.labels.map((l) => l.name)).toEqual(["Bug", "Feature", "Improvement"]);
    const issues = await t.query(api.quadratic.issues.list, { token: TOKEN_A, workspaceId: boot.workspace._id });
    expect(issues).toHaveLength(8);
    const welcome = await t.query(api.quadratic.issues.get, {
      token: TOKEN_A,
      workspaceId: boot.workspace._id,
      identifier: "acm-1",
    });
    expect(welcome?.issue.title).toBe("Welcome to Quadratic 👋");
    expect(welcome?.identifier).toBe("ACM-1");
  });

  test("outsiders are gated until they join with the invite code", async () => {
    const { t, slug, boot } = await setup();
    await t.mutation(api.quadratic.users.signUp, { token: TOKEN_B, name: "Grace Hopper" });
    expect((await t.query(api.quadratic.workspaces.bootstrap, { token: TOKEN_B, slug })).status).toBe("forbidden");
    expect(await t.query(api.quadratic.issues.list, { token: TOKEN_B, workspaceId: boot.workspace._id })).toBeNull();
    await expect(
      t.mutation(api.quadratic.issues.create, {
        token: TOKEN_B,
        workspaceId: boot.workspace._id,
        teamId: boot.teams[0]._id,
        title: "Sneaky",
      }),
    ).rejects.toThrow(/access/);
    await t.mutation(api.quadratic.workspaces.join, { token: TOKEN_B, inviteCode: boot.workspace.inviteCode });
    const joined = await t.query(api.quadratic.workspaces.bootstrap, { token: TOKEN_B, slug });
    expect(joined.status).toBe("ok");
    if (joined.status === "ok") expect(joined.members.map((m) => m.handle).sort()).toEqual(["adalovelace", "gracehopper"]);
  });
});

describe("issues", () => {
  test("status changes stamp timestamps and record history", async () => {
    const { t, boot } = await setup();
    const workspaceId = boot.workspace._id;
    const done = boot.states.find((s) => s.name === "Done")!;
    const { issueId, identifier } = await t.mutation(api.quadratic.issues.create, {
      token: TOKEN_A,
      workspaceId,
      teamId: boot.teams[0]._id,
      title: "  Ship   the thing ",
      priority: 2,
    });
    expect(identifier).toBe("ACM-9");
    await t.mutation(api.quadratic.issues.update, { token: TOKEN_A, workspaceId, issueId, patch: { stateId: done._id } });
    const detail = await t.query(api.quadratic.issues.get, { token: TOKEN_A, workspaceId, identifier });
    expect(detail?.issue.title).toBe("Ship the thing");
    expect(detail?.issue.completedAt).toBeTypeOf("number");
    expect(detail?.history.map((h) => h.kind)).toEqual(["created", "state"]);
  });

  test("assignment, comments and @mentions notify the right people", async () => {
    const { t, slug, boot } = await setup();
    const workspaceId = boot.workspace._id;
    const graceId = await t.mutation(api.quadratic.users.signUp, { token: TOKEN_B, name: "Grace Hopper" });
    await t.mutation(api.quadratic.workspaces.join, { token: TOKEN_B, inviteCode: boot.workspace.inviteCode });

    const { issueId } = await t.mutation(api.quadratic.issues.create, {
      token: TOKEN_A,
      workspaceId,
      teamId: boot.teams[0]._id,
      title: "Review compiler",
      assigneeId: graceId,
    });
    await t.mutation(api.quadratic.comments.create, {
      token: TOKEN_B,
      workspaceId,
      issueId,
      body: "On it @adalovelace",
    });

    const graceInbox = await t.query(api.quadratic.inbox.list, { token: TOKEN_B, workspaceId });
    expect(graceInbox?.map((n) => n.kind)).toEqual(["assigned"]);
    const adaInbox = await t.query(api.quadratic.inbox.list, { token: TOKEN_A, workspaceId });
    expect(adaInbox?.map((n) => n.kind)).toEqual(["mention"]);

    const boot2 = await t.query(api.quadratic.workspaces.bootstrap, { token: TOKEN_A, slug });
    expect(boot2.status === "ok" && boot2.unreadCount).toBe(1);
  });

  test("an issue can't become its own ancestor", async () => {
    const { t, boot } = await setup();
    const workspaceId = boot.workspace._id;
    const teamId = boot.teams[0]._id;
    const parent = await t.mutation(api.quadratic.issues.create, { token: TOKEN_A, workspaceId, teamId, title: "Parent" });
    const child = await t.mutation(api.quadratic.issues.create, {
      token: TOKEN_A,
      workspaceId,
      teamId,
      title: "Child",
      parentId: parent.issueId,
    });
    await expect(
      t.mutation(api.quadratic.issues.update, {
        token: TOKEN_A,
        workspaceId,
        issueId: parent.issueId,
        patch: { parentId: child.issueId },
      }),
    ).rejects.toThrow(/own parent/);
  });

  test("enabling cycles schedules the current and upcoming cycles", async () => {
    const { t, slug, boot } = await setup();
    await t.mutation(api.quadratic.teams.update, { token: TOKEN_A, teamId: boot.teams[0]._id, cyclesEnabled: true });
    await t.mutation(internal.quadratic.cycles.tick, {});
    const after = await t.query(api.quadratic.workspaces.bootstrap, { token: TOKEN_A, slug });
    if (after.status !== "ok") throw new Error("bootstrap failed");
    expect(after.cycles).toHaveLength(3);
    const now = Date.now();
    expect(after.cycles.some((c) => c.startsAt <= now && c.endsAt > now)).toBe(true);
  });
});

describe("mcp", () => {
  async function withKey() {
    const ctx = await setup();
    await ctx.t.mutation(api.quadratic.apiKeys.create, {
      token: TOKEN_A,
      workspaceId: ctx.boot.workspace._id,
      name: "Claude",
      key: API_KEY,
    });
    return ctx;
  }

  test("rejects requests without a valid key", async () => {
    const { t } = await withKey();
    const { status } = await mcp(t, { jsonrpc: "2.0", id: 1, method: "tools/list" }, "qk_nope");
    expect(status).toBe(401);
  });

  test("handshake and tool listing", async () => {
    const { t } = await withKey();
    const init = await mcp(t, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    });
    expect(init.body.result.protocolVersion).toBe("2025-03-26");
    expect(init.body.result.serverInfo.name).toBe("quadratic");
    const note = await mcp(t, { jsonrpc: "2.0", method: "notifications/initialized" });
    expect(note.status).toBe(202);
    const list = await mcp(t, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    const names = list.body.result.tools.map((tool: { name: string }) => tool.name);
    expect(names).toEqual(expect.arrayContaining(["list_issues", "create_issue", "update_issue", "create_comment"]));
  });

  test("create, update, read and comment through tools", async () => {
    const { t, boot } = await withKey();
    const created = await callTool(t, "create_issue", {
      title: "Wire up billing",
      priority: "High",
      assignee: "me",
      labels: ["Feature"],
      state: "In Progress",
    });
    expect(created.isError).toBe(false);
    expect(created.data.identifier).toBe("ACM-9");
    expect(created.data.status.name).toBe("In Progress");
    expect(created.data.labels).toEqual(["Feature"]);
    expect(created.data.url).toBe("https://ashvinpraveen.com/quadratic/acme/issue/ACM-9");

    const updated = await callTool(t, "update_issue", { id: "ACM-9", state: "completed", assignee: null, dueDate: "2026-12-01" });
    expect(updated.data.status.type).toBe("completed");
    expect(updated.data.assignee).toBeNull();
    expect(updated.data.dueDate).toBe("2026-12-01");

    const comment = await callTool(t, "create_comment", { issueId: "ACM-9", body: "Done via MCP" });
    expect(comment.isError).toBe(false);
    const comments = await callTool(t, "list_comments", { issueId: "ACM-9" });
    expect(comments.data.comments[0].body).toBe("Done via MCP");

    const mine = await callTool(t, "list_my_issues", {});
    expect(mine.data.issues.map((i: { identifier: string }) => i.identifier).sort()).toEqual(["ACM-1", "ACM-2", "ACM-3"]);

    const detail = await t.query(api.quadratic.issues.get, {
      token: TOKEN_A,
      workspaceId: boot.workspace._id,
      identifier: "ACM-9",
    });
    expect(detail?.history.every((h) => h.viaApi)).toBe(true);
  });

  test("bad references come back as tool errors, not protocol errors", async () => {
    const { t } = await withKey();
    const result = await callTool(t, "create_issue", { title: "x", state: "Nope" });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/No status matches "Nope"/);
  });

  test("projects and labels", async () => {
    const { t } = await withKey();
    const label = await callTool(t, "create_issue_label", { name: "Infra", color: "#26b5ce" });
    expect(label.data.name).toBe("Infra");
    const project = await callTool(t, "create_project", { name: "Launch", state: "started", targetDate: "2026-12-31" });
    expect(project.data.teams.map((team: { key: string }) => team.key)).toEqual(["ACM"]);
    await callTool(t, "create_issue", { title: "Landing page", project: "Launch", labels: ["Infra"] });
    const got = await callTool(t, "get_project", { query: "launch" });
    expect(got.data.issueCount).toBe(1);
    expect(got.data.status).toBe("started");
  });
});
