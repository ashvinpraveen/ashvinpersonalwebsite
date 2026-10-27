"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Copy, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useToast, useWorkspace, type State, type Team } from "../data";
import { Avatar, LabelDot, StatusIcon, TeamIcon, type StateType } from "../icons";
import { newApiKey, randomString, type ThemePreference } from "../session";
import { useUi } from "../ui";
import { Button, Field, Menu, MenuItem, Switch, TextInput, formatShortDate, timeAgo } from "../components/primitives";
import { cn } from "@/lib/utils";

const COLORS = ["#5e6ad2", "#26b5ce", "#4cb782", "#f2c94c", "#f2994a", "#eb5757", "#bb87fc", "#95a2b3", "#bec2c8", "#e2e2e2"];

function Page({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-6 pb-24 pt-14">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-q-text">{title}</h1>
      {description ? <p className="mt-1 text-q-text3">{description}</p> : null}
      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

function Card({ title, description, children, action }: { title?: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-medium text-q-text">{title}</h2>
            {description ? <p className="mt-0.5 text-[12.5px] text-q-text3">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="rounded-[10px] border border-q-border bg-q-raised">{children}</div>
    </section>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-[52px] items-center gap-3 border-b border-q-line px-4 py-2.5 last:border-b-0", className)}>{children}</div>;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="q-scroll overflow-x-auto rounded-[8px] border border-q-border bg-q-bg p-3 pr-20 [font-family:var(--q-mono)] text-[12px] leading-[1.6] text-q-text2">{children}</pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

// ---------- account ----------

function AccountSettings({ theme, setTheme, onSignOut }: { theme: ThemePreference; setTheme: (theme: ThemePreference) => void; onSignOut: () => void }) {
  const ws = useWorkspace();
  const toast = useToast();
  const updateProfile = useMutation(api.quadratic.users.updateProfile);
  const createLoginCode = useMutation(api.quadratic.users.createLoginCode);
  const [name, setName] = useState(ws.viewer.name);
  const [handle, setHandle] = useState(ws.viewer.handle);
  const [email, setEmail] = useState(ws.viewer.email ?? "");
  const [loginLink, setLoginLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const dirty = name !== ws.viewer.name || handle !== ws.viewer.handle || email !== (ws.viewer.email ?? "");
  return (
    <Page title="Profile" description="Manage how you appear to your teammates.">
      <Card>
        <Row>
          <Avatar name={name || ws.viewer.name} hue={ws.viewer.avatarHue} size={44} />
          <div className="flex flex-wrap gap-1.5">
            {[0, 40, 140, 200, 230, 280, 330].map((hue) => (
              <button
                key={hue}
                type="button"
                aria-label={`Avatar color ${hue}`}
                onClick={() => updateProfile({ token: ws.token, avatarHue: hue }).catch(toast.error)}
                className={cn("h-5 w-5 rounded-full", ws.viewer.avatarHue === hue && "ring-2 ring-q-text3 ring-offset-2 ring-offset-q-raised")}
                style={{ background: `hsl(${hue} 52% 46%)` }}
              />
            ))}
          </div>
        </Row>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Username" hint="Used for @mentions.">
            <TextInput value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} />
          </Field>
          <Field label="Email">
            <TextInput value={email} type="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          </Field>
        </div>
        <div className="flex justify-end border-t border-q-line p-3">
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={() =>
              updateProfile({ token: ws.token, name, handle, email })
                .then(() => toast.show({ title: "Profile updated" }))
                .catch(toast.error)
            }
          >
            Update profile
          </Button>
        </div>
      </Card>

      <Card title="Interface theme" description="Quadratic follows your system setting by default.">
        <div className="grid grid-cols-3 gap-3 p-4">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              className={cn(
                "rounded-[8px] border p-2 text-left text-[12px] capitalize",
                theme === option ? "border-q-accent text-q-text" : "border-q-border text-q-text3 hover:bg-q-hover",
              )}
            >
              <div
                className={cn(
                  "mb-2 h-14 rounded-[6px] border border-q-border",
                  option === "light" ? "bg-[#f4f4f5]" : option === "dark" ? "bg-[#0f1011]" : "bg-gradient-to-r from-[#f4f4f5] to-[#0f1011]",
                )}
              />
              {option}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Sign in on another device" description="Quadratic doesn't use passwords. Open a one-time link on your other device instead.">
        <Row>
          {loginLink ? (
            <>
              <code className="min-w-0 flex-1 truncate [font-family:var(--q-mono)] text-[12px] text-q-text2">{loginLink.url}</code>
              <CopyButton text={loginLink.url} />
            </>
          ) : (
            <>
              <span className="flex-1 text-q-text3">Links expire after 15 minutes and work once.</span>
              <Button
                onClick={async () => {
                  const code = randomString(40);
                  try {
                    const expiresAt = await createLoginCode({ token: ws.token, code });
                    setLoginLink({ url: `${window.location.origin}/quadratic/login#${code}`, expiresAt });
                  } catch (error) {
                    toast.error(error);
                  }
                }}
              >
                Create sign-in link
              </Button>
            </>
          )}
        </Row>
      </Card>

      <Card>
        <Row>
          <span className="flex-1 text-q-text2">Log out of Quadratic on this device</span>
          <Button variant="danger" onClick={onSignOut}>
            Log out
          </Button>
        </Row>
      </Card>
    </Page>
  );
}

// ---------- workspace ----------

function WorkspaceSettings() {
  const ws = useWorkspace();
  const toast = useToast();
  const update = useMutation(api.quadratic.workspaces.update);
  const [name, setName] = useState(ws.workspace.name);
  const [slug, setSlug] = useState(ws.workspace.slug);
  const isAdmin = ws.role === "admin";
  return (
    <Page title="Workspace" description="Manage your workspace's name and URL.">
      <Card>
        <div className="grid gap-4 p-4">
          <Field label="Workspace name">
            <TextInput value={name} disabled={!isAdmin} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Workspace URL">
            <div className="flex items-center rounded-[6px] border border-q-border bg-q-raised pl-2.5 text-q-text3 focus-within:border-q-accent">
              <span className="shrink-0 text-[13px]">{typeof window !== "undefined" ? window.location.host : ""}/quadratic/</span>
              <input
                value={slug}
                disabled={!isAdmin}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                className="h-8 min-w-0 flex-1 bg-transparent pr-2.5 text-[13px] text-q-text outline-none"
              />
            </div>
          </Field>
        </div>
        <div className="flex justify-end border-t border-q-line p-3">
          <Button
            variant="primary"
            disabled={!isAdmin || (name === ws.workspace.name && slug === ws.workspace.slug)}
            onClick={async () => {
              try {
                const nextSlug = await update({ token: ws.token, workspaceId: ws.workspace._id, name, slug });
                toast.show({ title: "Workspace updated" });
                if (nextSlug !== ws.workspace.slug) window.location.href = `/quadratic/${nextSlug}/settings/workspace`;
              } catch (error) {
                toast.error(error);
              }
            }}
          >
            Update
          </Button>
        </div>
      </Card>
      {!isAdmin ? <p className="text-[12px] text-q-text3">Only admins can change workspace settings.</p> : null}
    </Page>
  );
}

function MembersSettings() {
  const ws = useWorkspace();
  const toast = useToast();
  const setRole = useMutation(api.quadratic.workspaces.setRole);
  const removeMember = useMutation(api.quadratic.workspaces.removeMember);
  const resetInvite = useMutation(api.quadratic.workspaces.resetInvite);
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/quadratic/join/${ws.workspace.inviteCode}` : "";
  const isAdmin = ws.role === "admin";
  return (
    <Page title="Members" description={`${ws.members.length} ${ws.members.length === 1 ? "member" : "members"} in ${ws.workspace.name}.`}>
      <Card title="Invite link" description="Anyone with this link can join the workspace.">
        <Row>
          <code className="min-w-0 flex-1 truncate [font-family:var(--q-mono)] text-[12px] text-q-text2">{inviteUrl}</code>
          <CopyButton text={inviteUrl} />
          {isAdmin ? (
            <Button
              variant="ghost"
              onClick={() =>
                resetInvite({ token: ws.token, workspaceId: ws.workspace._id })
                  .then(() => toast.show({ title: "Invite link reset", description: "The old link no longer works." }))
                  .catch(toast.error)
              }
            >
              <RefreshCw size={13} />
              Reset
            </Button>
          ) : null}
        </Row>
      </Card>
      <Card title="Members">
        {ws.members.map((member) => (
          <Row key={member._id}>
            <Avatar name={member.name} hue={member.avatarHue} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-q-text">
                {member.name}
                {member._id === ws.viewer._id ? <span className="text-q-text3"> (you)</span> : null}
              </div>
              <div className="truncate text-[12px] text-q-text3">
                @{member.handle}
                {member.email ? ` · ${member.email}` : ""} · joined {formatShortDate(member.joinedAt)}
              </div>
            </div>
            {isAdmin ? (
              <Menu
                align="end"
                trigger={
                  <Button size="sm" variant="ghost" className="capitalize">
                    {member.role}
                  </Button>
                }
              >
                <MenuItem checked={member.role === "admin"} onSelect={() => setRole({ token: ws.token, workspaceId: ws.workspace._id, userId: member._id, role: "admin" }).catch(toast.error)}>
                  Admin
                </MenuItem>
                <MenuItem checked={member.role === "member"} onSelect={() => setRole({ token: ws.token, workspaceId: ws.workspace._id, userId: member._id, role: "member" }).catch(toast.error)}>
                  Member
                </MenuItem>
                {member._id !== ws.viewer._id ? (
                  <MenuItem danger onSelect={() => removeMember({ token: ws.token, workspaceId: ws.workspace._id, userId: member._id }).catch(toast.error)}>
                    Remove from workspace
                  </MenuItem>
                ) : null}
              </Menu>
            ) : (
              <span className="text-[12px] capitalize text-q-text3">{member.role}</span>
            )}
          </Row>
        ))}
      </Card>
    </Page>
  );
}

function LabelsSettings() {
  const ws = useWorkspace();
  const toast = useToast();
  const create = useMutation(api.quadratic.labels.create);
  const update = useMutation(api.quadratic.labels.update);
  const remove = useMutation(api.quadratic.labels.remove);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const usage = (labelId: string) => ws.issues.filter((issue) => issue.labelIds.includes(labelId as never)).length;
  return (
    <Page title="Labels" description="Labels categorize issues across teams.">
      <Card>
        <form
          className="flex items-center gap-2 border-b border-q-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            create({ token: ws.token, workspaceId: ws.workspace._id, name, color })
              .then(() => setName(""))
              .catch(toast.error);
          }}
        >
          <ColorPicker value={color} onChange={setColor} />
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="New label name" />
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Create label
          </Button>
        </form>
        {ws.labels.map((label) => (
          <Row key={label._id}>
            <ColorPicker value={label.color} onChange={(next) => update({ token: ws.token, workspaceId: ws.workspace._id, labelId: label._id, color: next }).catch(toast.error)} />
            <InlineName value={label.name} onSave={(next) => update({ token: ws.token, workspaceId: ws.workspace._id, labelId: label._id, name: next }).catch(toast.error)} />
            <span className="text-[12px] text-q-text3">
              {label.teamId ? `${ws.teamsById.get(label.teamId)?.key} · ` : ""}
              {usage(label._id)} issues
            </span>
            <button
              type="button"
              aria-label={`Delete ${label.name}`}
              onClick={() => {
                if (window.confirm(`Delete label “${label.name}”? It will be removed from all issues.`)) {
                  void remove({ token: ws.token, workspaceId: ws.workspace._id, labelId: label._id }).catch(toast.error);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-q-text4 hover:bg-q-hover hover:text-[#eb5757]"
            >
              <Trash2 size={13} />
            </button>
          </Row>
        ))}
      </Card>
    </Page>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <Menu
      trigger={
        <button type="button" aria-label="Color" className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-q-hover">
          <LabelDot color={value} size={12} />
        </button>
      }
    >
      <div className="grid grid-cols-5 gap-1 p-1">
        {COLORS.map((color) => (
          <button key={color} type="button" aria-label={color} onClick={() => onChange(color)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-q-active">
            <LabelDot color={color} size={14} />
          </button>
        ))}
      </div>
    </Menu>
  );
}

function InlineName({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft.trim() && draft !== value && onSave(draft)}
      onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
      className="h-8 min-w-0 flex-1 rounded-[5px] px-1.5 text-q-text outline-none hover:bg-q-hover focus:bg-q-hover"
    />
  );
}

// ---------- API & MCP ----------

function ApiSettings() {
  const ws = useWorkspace();
  const toast = useToast();
  const keys = useQuery(api.quadratic.apiKeys.list, { token: ws.token, workspaceId: ws.workspace._id });
  const create = useMutation(api.quadratic.apiKeys.create);
  const revoke = useMutation(api.quadratic.apiKeys.revoke);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ashvinpraveen.com";
  const url = `${origin}/quadratic/mcp`;
  const key = created ?? "<your API key>";

  return (
    <Page
      title="API & MCP"
      description="Connect Claude, Cursor, VS Code and other MCP clients to Quadratic. Agents act as you, in this workspace."
    >
      <Card title="Personal API keys" description="Keys are shown once. Store them like passwords.">
        <form
          className="flex items-center gap-2 border-b border-q-line p-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            const secret = newApiKey();
            try {
              await create({ token: ws.token, workspaceId: ws.workspace._id, name, key: secret });
              setCreated(secret);
              setName("");
            } catch (error) {
              toast.error(error);
            }
          }}
        >
          <KeyRound size={15} className="shrink-0 text-q-text3" />
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Key name, e.g. Claude Code" />
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Create key
          </Button>
        </form>
        {created ? (
          <div className="border-b border-q-line bg-q-selected p-3">
            <div className="mb-2 text-[12px] text-q-text2">Copy your new key now — you won't see it again.</div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[6px] border border-q-border bg-q-bg px-2.5 py-1.5 [font-family:var(--q-mono)] text-[12px] text-q-text">{created}</code>
              <CopyButton text={created} />
            </div>
          </div>
        ) : null}
        {(keys ?? []).length === 0 ? (
          <Row>
            <span className="text-q-text3">No API keys yet.</span>
          </Row>
        ) : (
          (keys ?? []).map((apiKey) => (
            <Row key={apiKey._id}>
              <div className="min-w-0 flex-1">
                <div className="text-q-text">{apiKey.name}</div>
                <div className="text-[12px] text-q-text3">
                  <span className="[font-family:var(--q-mono)]">{apiKey.prefix}…</span> · created {formatShortDate(apiKey.createdAt)} ·{" "}
                  {apiKey.lastUsedAt ? `last used ${timeAgo(apiKey.lastUsedAt)}` : "never used"}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Revoke “${apiKey.name}”? Clients using it will stop working.`)) {
                    void revoke({ token: ws.token, workspaceId: ws.workspace._id, keyId: apiKey._id }).catch(toast.error);
                  }
                }}
              >
                Revoke
              </Button>
            </Row>
          ))
        )}
      </Card>

      <Card title="Server URL" description="Streamable HTTP transport. Authenticate with an Authorization: Bearer header.">
        <Row>
          <code className="min-w-0 flex-1 truncate [font-family:var(--q-mono)] text-[12px] text-q-text2">{url}</code>
          <CopyButton text={url} />
        </Row>
      </Card>

      <section className="space-y-4">
        <h2 className="font-medium text-q-text">Setup</h2>
        <div>
          <div className="mb-1.5 text-[12.5px] text-q-text2">Claude Code</div>
          <Code>{`claude mcp add --transport http quadratic ${url} \\\n  --header "Authorization: Bearer ${key}"`}</Code>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] text-q-text2">Cursor — ~/.cursor/mcp.json</div>
          <Code>{JSON.stringify({ mcpServers: { quadratic: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)}</Code>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] text-q-text2">VS Code — .vscode/mcp.json</div>
          <Code>{JSON.stringify({ servers: { quadratic: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)}</Code>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] text-q-text2">Claude Desktop and stdio-only clients (via mcp-remote)</div>
          <Code>
            {JSON.stringify(
              {
                mcpServers: {
                  quadratic: {
                    command: "npx",
                    args: ["-y", "mcp-remote", url, "--header", "Authorization:${QUADRATIC_AUTH}"],
                    env: { QUADRATIC_AUTH: `Bearer ${key}` },
                  },
                },
              },
              null,
              2,
            )}
          </Code>
        </div>
        <div className="rounded-[10px] border border-q-border bg-q-raised p-4 text-[12.5px] text-q-text3">
          <div className="mb-2 font-medium text-q-text2">Available tools</div>
          <div className="[font-family:var(--q-mono)] text-[12px] leading-[1.8] text-q-text2">
            list_issues · list_my_issues · get_issue · create_issue · update_issue · list_comments · create_comment · list_teams · get_team ·
            list_users · get_user · list_issue_statuses · get_issue_status · list_issue_labels · create_issue_label · list_projects ·
            get_project · create_project · update_project · list_cycles
          </div>
          <div className="mt-2">Tool names and arguments match Linear's MCP server, so existing prompts work unchanged.</div>
        </div>
      </section>
    </Page>
  );
}

// ---------- teams ----------

function TeamsList() {
  const ws = useWorkspace();
  const ui = useUi();
  return (
    <Page title="Teams" description="Teams own issues, workflows and cycles.">
      <Card
        action={
          <Button onClick={() => ui.navigate("/settings/teams/new")}>
            <Plus size={13} />
            New team
          </Button>
        }
        title="Teams"
      >
        {ws.teams.map((team) => (
          <button key={team._id} type="button" onClick={() => ui.navigate(`/settings/teams/${team.key}`)} className="flex min-h-[52px] w-full items-center gap-3 border-b border-q-line px-4 text-left last:border-b-0 hover:bg-q-hover">
            <TeamIcon name={team.name} color={team.color} icon={team.icon} size={22} />
            <div className="flex-1">
              <div className="text-q-text">{team.name}</div>
              <div className="text-[12px] text-q-text3">
                {team.key} · {ws.issues.filter((issue) => issue.teamId === team._id).length} issues
                {team.cyclesEnabled ? " · cycles on" : ""}
              </div>
            </div>
          </button>
        ))}
      </Card>
    </Page>
  );
}

function NewTeam() {
  const ws = useWorkspace();
  const ui = useUi();
  const toast = useToast();
  const create = useMutation(api.quadratic.teams.create);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [color, setColor] = useState(COLORS[1]);
  const autoKey = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return (
    <Page title="Create a new team" description="Create a team to manage separate workflows and cycles.">
      <Card>
        <div className="grid gap-4 p-4">
          <Field label="Team name">
            <div className="flex items-center gap-2">
              <ColorPicker value={color} onChange={setColor} />
              <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Engineering" />
            </div>
          </Field>
          <Field label="Identifier" hint="Used in issue IDs, like ENG-123.">
            <TextInput value={keyEdited ? key : autoKey} onChange={(event) => { setKeyEdited(true); setKey(event.target.value.toUpperCase()); }} placeholder="ENG" />
          </Field>
        </div>
        <div className="flex justify-end border-t border-q-line p-3">
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={async () => {
              const teamKey = (keyEdited ? key : autoKey) || "TEAM";
              try {
                await create({ token: ws.token, workspaceId: ws.workspace._id, name, key: teamKey, color });
                ui.navigate(`/team/${teamKey.toUpperCase()}/all`);
              } catch (error) {
                toast.error(error);
              }
            }}
          >
            Create team
          </Button>
        </div>
      </Card>
    </Page>
  );
}

const STATE_GROUPS: { type: StateType; label: string }[] = [
  { type: "backlog", label: "Backlog" },
  { type: "unstarted", label: "Unstarted" },
  { type: "started", label: "Started" },
  { type: "completed", label: "Completed" },
  { type: "canceled", label: "Canceled" },
];

function TeamSettings({ team }: { team: Team }) {
  const ws = useWorkspace();
  const toast = useToast();
  const ui = useUi();
  const update = useMutation(api.quadratic.teams.update);
  const createState = useMutation(api.quadratic.teams.createState);
  const updateState = useMutation(api.quadratic.teams.updateState);
  const deleteState = useMutation(api.quadratic.teams.deleteState);
  const [name, setName] = useState(team.name);
  const [key, setKey] = useState(team.key);
  useEffect(() => {
    setName(team.name);
    setKey(team.key);
  }, [team.key, team.name]);
  const patch = (fields: Omit<Parameters<typeof update>[0], "token" | "teamId">) =>
    update({ token: ws.token, teamId: team._id, ...fields }).catch(toast.error);
  const states = ws.statesByTeam.get(team._id) ?? [];

  return (
    <Page title={team.name} description={`Settings for the ${team.key} team.`}>
      <Card title="General">
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_140px]">
          <Field label="Name">
            <div className="flex items-center gap-2">
              <ColorPicker value={team.color} onChange={(color) => void patch({ color })} />
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          </Field>
          <Field label="Identifier">
            <TextInput value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} />
          </Field>
        </div>
        <div className="flex justify-end border-t border-q-line p-3">
          <Button
            variant="primary"
            disabled={name === team.name && key === team.key}
            onClick={async () => {
              await patch({ name, key });
              if (key !== team.key) ui.navigate(`/settings/teams/${key}`);
            }}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card title="Workflow" description="Statuses define the stages an issue moves through.">
        {STATE_GROUPS.map((group) => (
          <div key={group.type} className="border-b border-q-line last:border-b-0">
            <div className="flex h-9 items-center justify-between px-4 text-[12px] text-q-text3">
              {group.label}
              <button
                type="button"
                aria-label={`Add ${group.label} status`}
                onClick={() => {
                  const statusName = window.prompt(`New ${group.label.toLowerCase()} status name`);
                  if (statusName) {
                    void createState({
                      token: ws.token,
                      teamId: team._id,
                      name: statusName,
                      type: group.type,
                      color: group.type === "started" ? "#f2c94c" : group.type === "completed" ? "#5e6ad2" : "#95a2b3",
                    }).catch(toast.error);
                  }
                }}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-q-hover hover:text-q-text"
              >
                <Plus size={13} />
              </button>
            </div>
            {states
              .filter((state) => state.type === group.type)
              .map((state) => (
                <StateRow
                  key={state._id}
                  state={state}
                  progress={ws.stateProgress(state)}
                  others={states.filter((s) => s._id !== state._id)}
                  onRename={(next) => updateState({ token: ws.token, workspaceId: ws.workspace._id, stateId: state._id, name: next }).catch(toast.error)}
                  onColor={(color) => updateState({ token: ws.token, workspaceId: ws.workspace._id, stateId: state._id, color }).catch(toast.error)}
                  onDelete={(replacementId) =>
                    deleteState({ token: ws.token, workspaceId: ws.workspace._id, stateId: state._id, replacementId }).catch(toast.error)
                  }
                />
              ))}
          </div>
        ))}
      </Card>

      <Card title="Cycles" description="Time-boxed iterations. Unfinished issues roll over automatically.">
        <Row>
          <span className="flex-1 text-q-text2">Enable cycles</span>
          <Switch checked={team.cyclesEnabled} onChange={(cyclesEnabled) => void patch({ cyclesEnabled })} label="Enable cycles" />
        </Row>
        {team.cyclesEnabled ? (
          <>
            <Row>
              <span className="flex-1 text-q-text2">Cycle duration</span>
              <Menu align="end" trigger={<Button size="sm">{team.cycleDurationWeeks} {team.cycleDurationWeeks === 1 ? "week" : "weeks"}</Button>}>
                {[1, 2, 3, 4, 6, 8].map((weeks) => (
                  <MenuItem key={weeks} checked={team.cycleDurationWeeks === weeks} onSelect={() => void patch({ cycleDurationWeeks: weeks })}>
                    {weeks} {weeks === 1 ? "week" : "weeks"}
                  </MenuItem>
                ))}
              </Menu>
            </Row>
            <Row>
              <span className="flex-1 text-q-text2">Cycles start on</span>
              <Menu align="end" trigger={<Button size="sm">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][team.cycleStartDay]}</Button>}>
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                  <MenuItem key={day} checked={team.cycleStartDay === index} onSelect={() => void patch({ cycleStartDay: index })}>
                    {day}
                  </MenuItem>
                ))}
              </Menu>
            </Row>
            <Row>
              <span className="flex-1 text-q-text2">Upcoming cycles to create</span>
              <Menu align="end" trigger={<Button size="sm">{team.upcomingCycleCount}</Button>}>
                {[1, 2, 3, 4, 6].map((count) => (
                  <MenuItem key={count} checked={team.upcomingCycleCount === count} onSelect={() => void patch({ upcomingCycleCount: count })}>
                    {count}
                  </MenuItem>
                ))}
              </Menu>
            </Row>
          </>
        ) : null}
      </Card>

      <Card title="Estimates" description="How your team sizes issues.">
        {(
          [
            ["notUsed", "Not in use"],
            ["exponential", "Exponential (1, 2, 4, 8, 16)"],
            ["fibonacci", "Fibonacci (1, 2, 3, 5, 8)"],
            ["linear", "Linear (1, 2, 3, 4, 5)"],
            ["tShirt", "T-Shirt (XS, S, M, L, XL)"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" onClick={() => void patch({ estimateType: value })} className="flex min-h-[44px] w-full items-center gap-3 border-b border-q-line px-4 text-left last:border-b-0 hover:bg-q-hover">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", team.estimateType === value ? "border-q-accent bg-q-accent" : "border-q-text4")}>
              {team.estimateType === value ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>
            <span className="text-q-text2">{label}</span>
          </button>
        ))}
      </Card>
    </Page>
  );
}

function StateRow({
  state,
  progress,
  others,
  onRename,
  onColor,
  onDelete,
}: {
  state: State;
  progress: number;
  others: State[];
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onDelete: (replacementId: Id<"quadraticStates">) => void;
}) {
  return (
    <div className="flex h-11 items-center gap-2 px-4">
      <Menu
        trigger={
          <button type="button" aria-label="Status color" className="flex h-7 w-7 items-center justify-center rounded hover:bg-q-hover">
            <StatusIcon type={state.type} color={state.color} progress={progress} />
          </button>
        }
      >
        <div className="grid grid-cols-5 gap-1 p-1">
          {COLORS.map((color) => (
            <button key={color} type="button" aria-label={color} onClick={() => onColor(color)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-q-active">
              <StatusIcon type={state.type} color={color} progress={progress} />
            </button>
          ))}
        </div>
      </Menu>
      <InlineName value={state.name} onSave={onRename} />
      <Menu
        align="end"
        trigger={
          <button type="button" aria-label={`Delete ${state.name}`} className="flex h-7 w-7 items-center justify-center rounded text-q-text4 hover:bg-q-hover hover:text-[#eb5757]">
            <Trash2 size={13} />
          </button>
        }
      >
        <div className="px-2.5 pb-1 pt-1.5 text-[11px] text-q-text4">Move its issues to…</div>
        {others.map((other) => (
          <MenuItem key={other._id} icon={<StatusIcon type={other.type} color={other.color} />} onSelect={() => onDelete(other._id)}>
            {other.name}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

// ---------- shell ----------

const NAV: { section: string; items: { label: string; path: string }[] }[] = [
  {
    section: "Account",
    items: [{ label: "Profile & preferences", path: "account" }],
  },
  {
    section: "Workspace",
    items: [
      { label: "General", path: "workspace" },
      { label: "Members", path: "members" },
      { label: "Labels", path: "labels" },
      { label: "API & MCP", path: "api" },
    ],
  },
];

export function SettingsNav({ section }: { section: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const item = (label: string, path: string, icon?: ReactNode) => (
    <button
      key={path}
      type="button"
      onClick={() => ui.navigate(`/settings/${path}`)}
      className={cn(
        "flex h-[28px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px]",
        section === path ? "bg-q-active text-q-text" : "text-q-text2 hover:bg-q-hover hover:text-q-text",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
  return (
    <nav className="flex h-full flex-col px-2 pt-2">
      <button
        type="button"
        onClick={() => ui.navigate("/my-issues/assigned")}
        className="mb-4 flex h-8 items-center gap-2 rounded-[6px] px-2 text-q-text2 hover:bg-q-hover hover:text-q-text"
      >
        <ArrowLeft size={14} />
        Back to app
      </button>
      <div className="q-scroll -mx-2 flex-1 px-2">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="mb-1 px-2 text-[12px] font-medium text-q-text3">{group.section}</div>
            {group.items.map((entry) => item(entry.label, entry.path))}
          </div>
        ))}
        <div className="mb-4">
          <div className="mb-1 px-2 text-[12px] font-medium text-q-text3">Teams</div>
          {ws.teams.map((team) => item(team.name, `teams/${team.key}`, <TeamIcon name={team.name} color={team.color} icon={team.icon} size={16} />))}
          {item("Create a team", "teams/new", <Plus size={14} className="text-q-text3" />)}
        </div>
      </div>
    </nav>
  );
}

export function SettingsPage({
  section,
  theme,
  setTheme,
  onSignOut,
}: {
  section: string;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  onSignOut: () => void;
}) {
  const ws = useWorkspace();
  let content: ReactNode;
  if (section === "workspace") content = <WorkspaceSettings />;
  else if (section === "members") content = <MembersSettings />;
  else if (section === "labels") content = <LabelsSettings />;
  else if (section === "api") content = <ApiSettings />;
  else if (section === "teams") content = <TeamsList />;
  else if (section === "teams/new") content = <NewTeam />;
  else if (section.startsWith("teams/")) {
    const team = ws.teamByKey.get(section.slice(6).toUpperCase());
    content = team ? <TeamSettings team={team} /> : <TeamsList />;
  } else content = <AccountSettings theme={theme} setTheme={setTheme} onSignOut={onSignOut} />;
  return <div className="q-scroll h-full">{content}</div>;
}
