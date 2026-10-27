"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ---------- types ----------

export type Bootstrap = Extract<FunctionReturnType<typeof api.quadratic.workspaces.bootstrap>, { status: "ok" }>;
export type Member = Bootstrap["members"][number];
export type Team = Bootstrap["teams"][number];
export type State = Bootstrap["states"][number];
export type Label = Bootstrap["labels"][number];
export type Project = Bootstrap["projects"][number];
export type Cycle = Bootstrap["cycles"][number];
export type SavedView = Bootstrap["views"][number];
export type Favorite = Bootstrap["favorites"][number];
export type Issue = NonNullable<FunctionReturnType<typeof api.quadratic.issues.list>>[number];
export type IssueDetailData = NonNullable<FunctionReturnType<typeof api.quadratic.issues.get>>;
export type IssuePatch = FunctionArgs<typeof api.quadratic.issues.update>["patch"];
export type IssueId = Id<"quadraticIssues">;

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError) return String(error.data);
  if (error instanceof Error) return error.message.replace(/^.*Uncaught Error:\s*/s, "").split("\n")[0];
  return "Something went wrong.";
}

// ---------- session ----------

type SessionValue = { token: string; signOut: () => void };
const SessionContext = createContext<SessionValue | null>(null);
export const SessionProvider = SessionContext.Provider;

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

// ---------- toasts ----------

type Toast = { id: number; title: ReactNode; description?: ReactNode; action?: { label: string; onClick: () => void } };
type ToastApi = { show: (toast: Omit<Toast, "id">) => void; error: (error: unknown) => void };
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({ show, error: (error) => show({ title: errorMessage(error) }) }),
    [show],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="q-popover pointer-events-auto flex items-start gap-3 px-3.5 py-3"
            role="status"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-q-text">{toast.title}</div>
              {toast.description ? <div className="mt-0.5 truncate text-q-text3">{toast.description}</div> : null}
            </div>
            {toast.action ? (
              <button
                className="shrink-0 rounded px-1.5 py-0.5 font-medium text-q-accent-hover hover:bg-q-hover"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}

// ---------- workspace ----------

export type WorkspaceData = Bootstrap & {
  token: string;
  issues: Issue[];
  issuesLoaded: boolean;
  membersById: Map<string, Member>;
  teamsById: Map<string, Team>;
  teamByKey: Map<string, Team>;
  statesById: Map<string, State>;
  statesByTeam: Map<string, State[]>;
  labelsById: Map<string, Label>;
  projectsById: Map<string, Project>;
  cyclesById: Map<string, Cycle>;
  issuesById: Map<string, Issue>;
  childrenByParent: Map<string, Issue[]>;
  identifier: (issue: Pick<Issue, "teamId" | "number">) => string;
  stateProgress: (state: State) => number;
  issueByIdentifier: (identifier: string) => Issue | undefined;
  href: (path: string) => string;
};

const WorkspaceContext = createContext<WorkspaceData | null>(null);

const STATE_ORDER = { backlog: 0, unstarted: 1, started: 2, completed: 3, canceled: 4 } as const;

export function buildWorkspaceData(boot: Bootstrap, issues: Issue[] | null | undefined, token: string): WorkspaceData {
  const byId = <T extends { _id: string }>(items: T[]) => new Map(items.map((item) => [item._id as string, item]));
  const teamsById = byId(boot.teams);
  const statesByTeam = new Map<string, State[]>();
  for (const state of [...boot.states].sort(
    (a, b) => STATE_ORDER[a.type] - STATE_ORDER[b.type] || a.position - b.position,
  )) {
    statesByTeam.set(state.teamId, [...(statesByTeam.get(state.teamId) ?? []), state]);
  }
  const issueList = issues ?? [];
  const issuesById = byId(issueList);
  const childrenByParent = new Map<string, Issue[]>();
  for (const issue of issueList) {
    if (issue.parentId) childrenByParent.set(issue.parentId, [...(childrenByParent.get(issue.parentId) ?? []), issue]);
  }
  const teamByKey = new Map(boot.teams.map((team) => [team.key, team]));
  const identifier = (issue: Pick<Issue, "teamId" | "number">) =>
    `${teamsById.get(issue.teamId)?.key ?? "?"}-${issue.number}`;
  const byIdentifier = new Map(issueList.map((issue) => [identifier(issue), issue]));
  return {
    ...boot,
    token,
    issues: issueList,
    issuesLoaded: issues !== undefined && issues !== null,
    membersById: byId(boot.members),
    teamsById,
    teamByKey,
    statesById: byId(boot.states),
    statesByTeam,
    labelsById: byId(boot.labels),
    projectsById: byId(boot.projects),
    cyclesById: byId(boot.cycles),
    issuesById,
    childrenByParent,
    identifier,
    stateProgress: (state) => {
      const started = (statesByTeam.get(state.teamId) ?? []).filter((s) => s.type === "started");
      const index = started.findIndex((s) => s._id === state._id);
      return started.length ? (index + 1) / (started.length + 1) : 0.5;
    },
    issueByIdentifier: (value) => byIdentifier.get(value.toUpperCase()),
    href: (path) => `/quadratic/${boot.workspace.slug}${path}`,
  };
}

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

// ---------- optimistic issue mutations ----------

function applyPatch<T extends Partial<Issue>>(issue: T, patch: IssuePatch): T {
  const next: Record<string, unknown> = { ...issue, updatedAt: Date.now() };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    next[key] = value === null ? undefined : value;
  }
  if (typeof patch.title === "string") next.title = patch.title.replace(/\s+/g, " ").trim() || issue.title;
  return next as T;
}

export function useIssueActions() {
  const { token, workspace } = useWorkspace();
  const toast = useToast();
  const workspaceId = workspace._id;

  const update = useMutation(api.quadratic.issues.update).withOptimisticUpdate((store, args) => {
    const listArgs = { token: args.token, workspaceId: args.workspaceId };
    const list = store.getQuery(api.quadratic.issues.list, listArgs);
    if (list) {
      store.setQuery(
        api.quadratic.issues.list,
        listArgs,
        list.map((issue) => (issue._id === args.issueId ? applyPatch(issue, args.patch) : issue)),
      );
    }
    for (const { args: detailArgs, value } of store.getAllQueries(api.quadratic.issues.get)) {
      if (value && value.issue._id === args.issueId) {
        store.setQuery(api.quadratic.issues.get, detailArgs, { ...value, issue: applyPatch(value.issue, args.patch) });
      }
    }
  });

  const bulk = useMutation(api.quadratic.issues.bulkUpdate).withOptimisticUpdate((store, args) => {
    const listArgs = { token: args.token, workspaceId: args.workspaceId };
    const list = store.getQuery(api.quadratic.issues.list, listArgs);
    if (!list) return;
    const ids = new Set<string>(args.issueIds);
    store.setQuery(
      api.quadratic.issues.list,
      listArgs,
      list.map((issue) => {
        if (!ids.has(issue._id)) return issue;
        const patched = applyPatch(issue, args.patch);
        if (args.addLabelIds?.length || args.removeLabelIds?.length) {
          const labels = new Set(issue.labelIds);
          for (const id of args.addLabelIds ?? []) labels.add(id);
          for (const id of args.removeLabelIds ?? []) labels.delete(id);
          patched.labelIds = [...labels];
        }
        return patched;
      }),
    );
  });

  const archive = useMutation(api.quadratic.issues.setArchivedState).withOptimisticUpdate((store, args) => {
    if (!args.archived) return;
    const listArgs = { token: args.token, workspaceId: args.workspaceId };
    const list = store.getQuery(api.quadratic.issues.list, listArgs);
    if (!list) return;
    const ids = new Set<string>(args.issueIds);
    store.setQuery(
      api.quadratic.issues.list,
      listArgs,
      list.filter((issue) => !ids.has(issue._id) && !(issue.parentId && ids.has(issue.parentId))),
    );
  });

  const create = useMutation(api.quadratic.issues.create);

  return useMemo(
    () => ({
      update: (issueId: IssueId, patch: IssuePatch) =>
        update({ token, workspaceId, issueId, patch }).catch(toast.error),
      updateMany: (
        issueIds: IssueId[],
        patch: IssuePatch,
        labels?: { add?: Id<"quadraticLabels">[]; remove?: Id<"quadraticLabels">[] },
      ) => {
        if (issueIds.length === 1 && !labels) return update({ token, workspaceId, issueId: issueIds[0], patch }).catch(toast.error);
        return bulk({
          token,
          workspaceId,
          issueIds,
          patch,
          addLabelIds: labels?.add,
          removeLabelIds: labels?.remove,
        }).catch(toast.error);
      },
      setArchived: (issueIds: IssueId[], archived: boolean) =>
        archive({ token, workspaceId, issueIds, archived }).catch(toast.error),
      create: (args: Omit<FunctionArgs<typeof api.quadratic.issues.create>, "token" | "workspaceId">) =>
        create({ token, workspaceId, ...args }),
    }),
    [archive, bulk, create, toast.error, token, update, workspaceId],
  );
}

/** Binds token + workspace to any workspace-scoped mutation. */
export function useWorkspaceMutation<
  Args extends { token: string; workspaceId: Id<"quadraticWorkspaces"> },
  Result,
>(mutation: (args: Args) => Promise<Result>) {
  const { token, workspace } = useWorkspace();
  const toast = useToast();
  return useCallback(
    async (args: Omit<Args, "token" | "workspaceId">): Promise<Result | undefined> => {
      try {
        return await mutation({ ...args, token, workspaceId: workspace._id } as Args);
      } catch (error) {
        toast.error(error);
        return undefined;
      }
    },
    [mutation, toast, token, workspace._id],
  );
}
