"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Menu as MenuIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  SessionProvider,
  ToastProvider,
  WorkspaceProvider,
  buildWorkspaceData,
  useWorkspace,
  type Issue,
} from "./data";
import { useQuadraticTheme, useSessionToken, type ThemePreference } from "./session";
import { useShortcuts } from "./shortcuts";
import { UiProvider, type CreateDefaults, type UiApi } from "./ui";
import { CommandMenu, ShortcutsHelp } from "./components/CommandMenu";
import { CreateIssueModal } from "./components/CreateIssueModal";
import { IssueDetail } from "./components/IssueDetail";
import {
  AuthFrame,
  JoinWorkspace,
  LoadingScreen,
  RedeemLogin,
  SignUp,
  WorkspacePicker,
} from "./components/Onboarding";
import { PortalContext, Button } from "./components/primitives";
import { PropertyDialog, type PropertyKind } from "./components/pickers";
import { Sidebar } from "./components/Sidebar";
import { InboxPage } from "./pages/InboxPage";
import { MyIssuesPage, SearchPage, TeamIssuesPage, TrashPage } from "./pages/IssuesPages";
import { CreateProjectModal, ProjectPage, ProjectsPage } from "./pages/ProjectsPages";
import { CyclePage, CyclesPage, ViewPage, ViewsPage } from "./pages/CyclesViewsPages";
import { SettingsNav, SettingsPage } from "./pages/SettingsPage";
import { cn } from "@/lib/utils";

export default function QuadraticApp() {
  const pathname = usePathname() ?? "/quadratic";
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useQuadraticTheme();
  const { token, setToken, ready } = useSessionToken();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const segments = pathname.replace(/^\/quadratic\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const signOutMutation = useMutation(api.quadratic.users.signOut);

  const signOut = useCallback(() => {
    if (token) void signOutMutation({ token }).catch(() => undefined);
    setToken(null);
    router.push("/quadratic");
  }, [router, setToken, signOutMutation, token]);

  let content: ReactNode;
  if (!ready) content = <LoadingScreen />;
  else if (segments[0] === "login") content = <RedeemLogin onSignedIn={setToken} />;
  else if (segments[0] === "join" && segments[1]) {
    content = (
      <JoinWorkspace
        token={token ?? null}
        inviteCode={segments[1]}
        onNeedAccount={setToken}
        onJoined={(slug) => router.push(`/quadratic/${slug}`)}
      />
    );
  } else if (!token) content = <SignUp onSignedUp={setToken} />;
  else if (segments.length === 0) {
    content = (
      <WorkspacePicker
        token={token}
        forceChooser={searchParams?.get("new") === "1"}
        onOpen={(slug) => router.replace(`/quadratic/${slug}`)}
        onSignOut={signOut}
      />
    );
  } else {
    content = (
      <WorkspaceApp
        key={segments[0]}
        token={token}
        slug={segments[0]}
        rest={segments.slice(1)}
        pathname={pathname}
        theme={theme.preference}
        setTheme={theme.setPreference}
        onSignOut={signOut}
      />
    );
  }

  return (
    <div ref={setRoot} className="quadratic-root" data-q-theme={theme.resolved}>
      <PortalContext.Provider value={root}>
        <ToastProvider>{content}</ToastProvider>
      </PortalContext.Provider>
    </div>
  );
}

function WorkspaceApp({
  token,
  slug,
  rest,
  pathname,
  theme,
  setTheme,
  onSignOut,
}: {
  token: string;
  slug: string;
  rest: string[];
  pathname: string;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  onSignOut: () => void;
}) {
  const boot = useQuery(api.quadratic.workspaces.bootstrap, { token, slug });
  const workspaceId = boot?.status === "ok" ? boot.workspace._id : null;
  const issues = useQuery(api.quadratic.issues.list, workspaceId ? { token, workspaceId } : "skip");
  const visit = useMutation(api.quadratic.workspaces.visit);
  const lastBoot = useRef<typeof boot>(undefined);
  if (boot !== undefined) lastBoot.current = boot;
  const current = boot ?? lastBoot.current;

  useEffect(() => {
    if (workspaceId) void visit({ token, workspaceId }).catch(() => undefined);
  }, [token, visit, workspaceId]);

  const data = useMemo(
    () => (current?.status === "ok" ? buildWorkspaceData(current, issues, token) : null),
    [current, issues, token],
  );

  if (current === undefined) return <LoadingScreen />;
  if (current.status === "missing") {
    return (
      <AuthFrame>
        <h1 className="text-center text-[20px] font-semibold text-q-text">Workspace not found</h1>
        <p className="mt-2 text-center text-q-text3">There's no workspace at /{slug}.</p>
        <div className="mt-6 flex justify-center">
          <Button variant="primary" onClick={() => (window.location.href = "/quadratic?new=1")}>
            Go to your workspaces
          </Button>
        </div>
      </AuthFrame>
    );
  }
  if (current.status === "forbidden" || !data) {
    return (
      <AuthFrame>
        <h1 className="text-center text-[20px] font-semibold text-q-text">You don't have access to {current.status === "forbidden" ? current.name : "this workspace"}</h1>
        <p className="mt-2 text-center text-q-text3">Ask a member for an invite link.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => (window.location.href = "/quadratic?new=1")}>Your workspaces</Button>
          <Button variant="ghost" onClick={onSignOut}>
            Log out
          </Button>
        </div>
      </AuthFrame>
    );
  }

  return (
    <SessionProvider value={{ token, signOut: onSignOut }}>
      <WorkspaceProvider value={data}>
        <Shell rest={rest} pathname={pathname} theme={theme} setTheme={setTheme} onSignOut={onSignOut} />
      </WorkspaceProvider>
    </SessionProvider>
  );
}

function Shell({
  rest,
  pathname,
  theme,
  setTheme,
  onSignOut,
}: {
  rest: string[];
  pathname: string;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  onSignOut: () => void;
}) {
  const ws = useWorkspace();
  const router = useRouter();
  const [createState, setCreateState] = useState<{ open: boolean; defaults: CreateDefaults }>({ open: false, defaults: {} });
  const [projectOpen, setProjectOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [picker, setPicker] = useState<{ kind: PropertyKind | null; issues: Issue[] }>({ kind: null, issues: [] });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const activeIssues = useRef<() => Issue[]>(() => []);
  const dialogOpen = createState.open || projectOpen || commandOpen || shortcutsOpen || picker.kind !== null;

  const navigate = useCallback(
    (path: string) => {
      setMobileSidebar(false);
      router.push(`/quadratic/${ws.workspace.slug}${path}`);
    },
    [router, ws.workspace.slug],
  );

  const ui = useMemo<UiApi>(
    () => ({
      navigate,
      openCreate: (defaults = {}) => setCreateState({ open: true, defaults }),
      openCreateProject: () => setProjectOpen(true),
      openCommand: () => setCommandOpen(true),
      openShortcuts: () => setShortcutsOpen(true),
      openPicker: (kind, issues) => setPicker({ kind, issues }),
      toggleSidebar: () => setSidebarOpen((open) => !open),
      activeIssues,
      dialogOpen,
    }),
    [dialogOpen, navigate],
  );

  const firstTeam = ws.teams[0];
  const goTeam = (tab: string) => {
    const match = /\/team\/([^/]+)/.exec(pathname);
    const key = match?.[1] ?? firstTeam?.key;
    if (key) navigate(`/team/${key}/${tab}`);
  };

  useShortcuts(
    {
      c: () => setCreateState({ open: true, defaults: defaultsForPath(rest, ws) }),
      "mod+k": () => setCommandOpen(true),
      "/": () => navigate("/search"),
      "?": () => setShortcutsOpen(true),
      "[": () => setSidebarOpen((open) => !open),
      "g i": () => navigate("/inbox"),
      "g m": () => navigate("/my-issues/assigned"),
      "g a": () => goTeam("active"),
      "g b": () => goTeam("backlog"),
      "g e": () => goTeam("all"),
      "g c": () => goTeam("cycles"),
      "g p": () => navigate("/projects"),
      "g v": () => navigate("/views"),
      "g s": () => navigate("/settings/account"),
    },
    !dialogOpen,
  );
  // ⌘K must also work while typing.
  useShortcuts({ "mod+k": () => setCommandOpen((open) => !open) }, true);

  const inSettings = rest[0] === "settings";
  const pickerIssues = picker.issues
    .map((issue) => ws.issuesById.get(issue._id) ?? issue)
    .filter((issue): issue is Issue => Boolean(issue));

  return (
    <UiProvider value={ui}>
      <div className="flex h-full">
        <aside
          className={cn(
            "z-40 h-full w-[244px] shrink-0 bg-q-bg transition-transform md:static md:translate-x-0",
            mobileSidebar ? "fixed inset-y-0 left-0 translate-x-0 shadow-2xl" : "fixed inset-y-0 left-0 -translate-x-full",
            !sidebarOpen && "md:hidden",
          )}
        >
          {inSettings ? <SettingsNav section={rest.slice(1).join("/") || "account"} /> : <Sidebar pathname={pathname} onSignOut={onSignOut} />}
        </aside>
        {mobileSidebar ? <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileSidebar(false)} /> : null}
        <main className="relative flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-q-line bg-q-panel px-3 md:hidden">
            <button type="button" aria-label="Open sidebar" onClick={() => setMobileSidebar(true)} className="flex h-8 w-8 items-center justify-center rounded text-q-text2 hover:bg-q-hover">
              <MenuIcon size={17} />
            </button>
            <span className="truncate font-medium text-q-text">{ws.workspace.name}</span>
          </div>
          <div className={cn("relative min-h-0 flex-1 overflow-hidden bg-q-panel md:rounded-[8px] md:border md:border-q-line", !sidebarOpen && "md:ml-2")}>
            <Route rest={rest} theme={theme} setTheme={setTheme} onSignOut={onSignOut} />
          </div>
        </main>
      </div>
      <CreateIssueModal
        open={createState.open}
        defaults={createState.defaults}
        onClose={() => setCreateState((state) => ({ ...state, open: false }))}
        onCreated={(identifier) => navigate(`/issue/${identifier}`)}
      />
      <CreateProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} setTheme={setTheme} signOut={onSignOut} />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PropertyDialog kind={picker.kind} issues={pickerIssues} onClose={() => setPicker({ kind: null, issues: [] })} />
    </UiProvider>
  );
}

/** Pressing C pre-fills the team/project/cycle of the page you're on, like Linear. */
function defaultsForPath(rest: string[], ws: ReturnType<typeof useWorkspace>): CreateDefaults {
  if (rest[0] === "team" && rest[1]) {
    const team = ws.teamByKey.get(rest[1].toUpperCase());
    if (!team) return {};
    if (rest[2] === "cycle" && rest[3]) {
      const cycle = ws.cycles.find((c) => c.teamId === team._id && c.number === Number(rest[3]));
      return { teamId: team._id, cycleId: cycle?._id };
    }
    return { teamId: team._id };
  }
  if (rest[0] === "project" && rest[1]) {
    const project = ws.projectsById.get(rest[1]);
    return project ? { projectId: project._id, teamId: project.teamIds[0] } : {};
  }
  if (rest[0] === "issue" && rest[1]) {
    const issue = ws.issueByIdentifier(rest[1]);
    return issue ? { teamId: issue.teamId } : {};
  }
  if (rest[0] === "my-issues") return { assigneeId: ws.viewer._id };
  return {};
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  const ws = useWorkspace();
  useEffect(() => {
    router.replace(`/quadratic/${ws.workspace.slug}${to}`);
  }, [router, to, ws.workspace.slug]);
  return null;
}

function Route({
  rest,
  theme,
  setTheme,
  onSignOut,
}: {
  rest: string[];
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  onSignOut: () => void;
}) {
  const ws = useWorkspace();
  const [section, a, b, c] = rest;
  switch (section) {
    case undefined:
      return <Redirect to={ws.teams[0] ? `/team/${ws.teams[0].key}/all` : "/my-issues/assigned"} />;
    case "inbox":
      return <InboxPage />;
    case "my-issues":
      return <MyIssuesPage tab={a === "created" || a === "subscribed" ? a : "assigned"} />;
    case "team":
      if (!a) return <Redirect to="/" />;
      if (b === "cycles") return <CyclesPage teamKey={a} />;
      if (b === "cycle" && c) return <CyclePage teamKey={a} number={Number(c)} />;
      if (b === "projects") return <ProjectsPage teamKey={a} />;
      return <TeamIssuesPage key={a} teamKey={a} tab={b === "active" || b === "backlog" ? b : "all"} />;
    case "issue":
      return a ? <IssueDetail key={a} identifier={a} /> : <Redirect to="/" />;
    case "projects":
      return <ProjectsPage />;
    case "project":
      return a ? <ProjectPage projectId={a} tab={b === "issues" || b === "updates" ? b : "overview"} /> : <Redirect to="/projects" />;
    case "views":
      return <ViewsPage />;
    case "view":
      return a ? <ViewPage key={a} viewId={a} /> : <Redirect to="/views" />;
    case "trash":
      return <TrashPage />;
    case "search":
      return <SearchPage />;
    case "settings":
      return <SettingsPage section={rest.slice(1).join("/") || "account"} theme={theme} setTheme={setTheme} onSignOut={onSignOut} />;
    default:
      return <Redirect to="/" />;
  }
}
