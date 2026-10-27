"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { Layers, Plus, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useIssueActions, useToast, useWorkspace, type Issue } from "../data";
import {
  DEFAULT_DISPLAY,
  applyDisplayFilters,
  filterCount,
  groupIssues,
  matchesFilter,
  patchForGroup,
  type DisplayOptions,
  type FilterField,
  type GroupDescriptor,
  type Grouping,
  type IssueFilter,
} from "../filters";
import { usePersistentState } from "../session";
import { useShortcuts } from "../shortcuts";
import { useUi, type CreateDefaults } from "../ui";
import { DisplayButton, FilterButton, FilterChips } from "./FilterBar";
import { IssueBoard } from "./IssueBoard";
import { useIssueClipboard } from "./IssueContextMenu";
import { IssueList, type ListInteraction } from "./IssueList";
import { Button, EmptyState, IconButton, Kbd, Tooltip } from "./primitives";
import type { PropertyKind } from "./pickers";

/** The last list's visible order and path, so the issue page can step through it
 * with J/K and return to it with Escape. */
export const lastListOrder: { ids: string[]; path: string | null } = { ids: [], path: null };

export function ViewHeader({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-q-line px-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
    </div>
  );
}

export function ViewTabs({ tabs }: { tabs: { label: string; href: string; active: boolean }[] }) {
  const ui = useUi();
  return (
    <div className="ml-1 flex items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          type="button"
          onClick={() => ui.navigate(tab.href)}
          className={
            tab.active
              ? "h-7 shrink-0 rounded-[6px] border border-q-border bg-q-active px-2.5 text-[12px] font-medium text-q-text"
              : "h-7 shrink-0 rounded-[6px] border border-transparent px-2.5 text-[12px] text-q-text3 hover:bg-q-hover hover:text-q-text"
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const PROPERTY_SHORTCUTS: Record<string, PropertyKind> = {
  s: "status",
  p: "priority",
  a: "assignee",
  l: "labels",
  "shift+p": "project",
  "shift+c": "cycle",
  "shift+d": "dueDate",
  "shift+e": "estimate",
  "shift+m": "team",
};

export function IssueView({
  header,
  headerRight,
  viewKey,
  issues: baseIssues,
  teamId,
  createDefaults,
  defaultDisplay,
  initialFilter,
  hiddenFilters,
  groupings,
  emptyTitle = "No issues",
  emptyDescription,
  onSaveView,
  savedFilterDirty,
}: {
  header?: ReactNode;
  headerRight?: ReactNode;
  viewKey: string;
  issues: Issue[];
  teamId?: string;
  createDefaults?: CreateDefaults;
  defaultDisplay?: Partial<DisplayOptions>;
  initialFilter?: IssueFilter;
  hiddenFilters?: FilterField[];
  groupings?: Grouping[];
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  onSaveView?: (filter: IssueFilter, display: DisplayOptions) => void;
  savedFilterDirty?: (filter: IssueFilter) => boolean;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const actions = useIssueActions();
  const toast = useToast();
  const clipboard = useIssueClipboard();
  const [display, setDisplay] = usePersistentState<DisplayOptions>(`display:${viewKey}`, {
    ...DEFAULT_DISPLAY,
    ...defaultDisplay,
    properties: { ...DEFAULT_DISPLAY.properties, ...defaultDisplay?.properties },
  });
  const [collapsed, setCollapsed] = usePersistentState<Record<string, boolean>>(`collapsed:${viewKey}`, {});
  const [filter, setFilter] = useState<IssueFilter>(initialFilter ?? {});
  const [filterOpen, setFilterOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const keyboardNav = useRef(false);

  useEffect(() => {
    setFilter(initialFilter ?? {});
    setSelectedIds(new Set());
    // Reset when switching views; initialFilter identity changes every render otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  const filtered = useMemo(
    () => applyDisplayFilters(baseIssues.filter((issue) => matchesFilter(issue, filter, ws)), display, ws),
    [baseIssues, display, filter, ws],
  );
  const groups = useMemo(() => groupIssues(filtered, display, ws, teamId), [display, filtered, teamId, ws]);
  const visible = useMemo(
    () => groups.flatMap((group) => (display.layout === "list" && collapsed[group.key] ? [] : group.issues)),
    [collapsed, display.layout, groups],
  );
  const visibleIds = useMemo(() => visible.map((issue) => issue._id as string), [visible]);
  useEffect(() => {
    lastListOrder.ids = visibleIds;
    const base = `/quadratic/${ws.workspace.slug}`;
    lastListOrder.path = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : null;
  }, [visibleIds, ws.workspace.slug]);

  const selectedIssues = useMemo(
    () => visible.filter((issue) => selectedIds.has(issue._id)),
    [selectedIds, visible],
  );
  const singles = useMemo(() => new Map(visible.map((issue) => [issue._id as string, [issue]])), [visible]);
  const targetsFor = useCallback(
    (issue: Issue) => (selectedIds.has(issue._id) && selectedIssues.length > 0 ? selectedIssues : (singles.get(issue._id) ?? [issue])),
    [selectedIds, selectedIssues, singles],
  );
  const activeTargets = useCallback((): Issue[] => {
    if (selectedIssues.length) return selectedIssues;
    const focused = visible.find((issue) => issue._id === focusedId);
    return focused ? [focused] : [];
  }, [focusedId, selectedIssues, visible]);

  useEffect(() => {
    ui.activeIssues.current = activeTargets;
  }, [activeTargets, ui.activeIssues]);

  const open = useCallback(
    (issue: Issue) => ui.navigate(`/issue/${ws.identifier(issue)}`),
    [ui, ws],
  );

  const toggleSelect = useCallback(
    (issue: Issue, event?: MouseEvent) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (event?.shiftKey && anchorRef.current) {
          const from = visibleIds.indexOf(anchorRef.current);
          const to = visibleIds.indexOf(issue._id);
          if (from >= 0 && to >= 0) {
            const [start, end] = from < to ? [from, to] : [to, from];
            for (const id of visibleIds.slice(start, end + 1)) next.add(id);
            return next;
          }
        }
        if (next.has(issue._id)) next.delete(issue._id);
        else next.add(issue._id);
        anchorRef.current = issue._id;
        return next;
      });
    },
    [visibleIds],
  );

  // Row callbacks read the latest state through a ref so they stay referentially
  // stable and hovering doesn't re-render every memoized row.
  const latest = useRef({ open, toggleSelect, createDefaults, ws, ui });
  latest.current = { open, toggleSelect, createDefaults, ws, ui };
  const onOpen = useCallback((issue: Issue, event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) latest.current.toggleSelect(issue, event);
    else latest.current.open(issue);
  }, []);
  const onHover = useCallback((issue: Issue) => {
    if (!keyboardNav.current) setFocusedId(issue._id);
  }, []);
  const onToggleSelect = useCallback((issue: Issue, event: MouseEvent) => latest.current.toggleSelect(issue, event), []);
  const onCreateInGroup = useCallback((descriptor: GroupDescriptor) => {
    const { ws: current, createDefaults: base, ui: shell } = latest.current;
    const patch = patchForGroup(descriptor, null, current) as Record<string, unknown>;
    const defaults: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) if (value !== null) defaults[key] = value;
    if (descriptor.kind === "status") defaults.teamId = descriptor.state.teamId;
    shell.openCreate(defaults as CreateDefaults);
  }, []);

  const interaction: ListInteraction = useMemo(
    () => ({ focusedId, selectedIds, targetsFor, onOpen, onHover, onToggleSelect, onCreateInGroup }),
    [focusedId, onCreateInGroup, onHover, onOpen, onToggleSelect, selectedIds, targetsFor],
  );

  const moveFocus = (delta: number, extend = false) => {
    if (!visibleIds.length) return;
    keyboardNav.current = true;
    const index = focusedId ? visibleIds.indexOf(focusedId) : -1;
    const nextIndex = index < 0 ? (delta > 0 ? 0 : visibleIds.length - 1) : Math.max(0, Math.min(visibleIds.length - 1, index + delta));
    const nextId = visibleIds[nextIndex];
    setFocusedId(nextId);
    if (extend) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (focusedId) next.add(focusedId);
        next.add(nextId);
        return next;
      });
    }
    requestAnimationFrame(() => {
      document.querySelector(`[data-issue-id="${nextId}"]`)?.scrollIntoView({ block: "nearest" });
    });
  };

  useEffect(() => {
    const onMove = () => {
      keyboardNav.current = false;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const shortcutMap: Record<string, (event: KeyboardEvent) => void> = {
    j: () => moveFocus(1),
    arrowdown: () => moveFocus(1),
    k: () => moveFocus(-1),
    arrowup: () => moveFocus(-1),
    "shift+j": () => moveFocus(1, true),
    "shift+arrowdown": () => moveFocus(1, true),
    "shift+k": () => moveFocus(-1, true),
    "shift+arrowup": () => moveFocus(-1, true),
    x: () => {
      const focused = visible.find((issue) => issue._id === focusedId);
      if (focused) toggleSelect(focused);
    },
    enter: () => {
      const focused = visible.find((issue) => issue._id === focusedId);
      if (focused) open(focused);
    },
    o: () => {
      const focused = visible.find((issue) => issue._id === focusedId);
      if (focused) open(focused);
    },
    escape: () => {
      if (selectedIds.size) setSelectedIds(new Set());
      else setFocusedId(null);
    },
    "mod+a": () => setSelectedIds(new Set(visibleIds)),
    f: () => setFilterOpen(true),
    "mod+b": () => setDisplay((current) => ({ ...current, layout: current.layout === "list" ? "board" : "list" })),
    i: () => {
      const targets = activeTargets();
      if (targets.length) void actions.updateMany(targets.map((t) => t._id), { assigneeId: ws.viewer._id });
    },
    "mod+.": () => {
      const [first] = activeTargets();
      if (first) void clipboard.copy(ws.identifier(first), `Copied ${ws.identifier(first)}`);
    },
    "mod+backspace": () => {
      const targets = activeTargets();
      if (!targets.length) return;
      void actions.setArchived(targets.map((t) => t._id), true);
      setSelectedIds(new Set());
      toast.show({
        title: targets.length === 1 ? `${ws.identifier(targets[0])} deleted` : `${targets.length} issues deleted`,
        action: { label: "Undo", onClick: () => void actions.setArchived(targets.map((t) => t._id), false) },
      });
    },
  };
  for (const [key, kind] of Object.entries(PROPERTY_SHORTCUTS)) {
    shortcutMap[key] = () => {
      const targets = activeTargets();
      if (targets.length) ui.openPicker(kind, targets);
    };
  }
  useShortcuts(shortcutMap, !ui.dialogOpen);

  const saveView = useMutation(api.quadratic.views.create);
  const activeFilters = filterCount(filter);
  const showSave = onSaveView ? savedFilterDirty?.(filter) ?? activeFilters > 0 : activeFilters > 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {header ? <ViewHeader right={headerRight}>{header}</ViewHeader> : null}
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-1.5 border-b border-q-line px-3 py-1.5 sm:px-5">
        <FilterButton
          filter={filter}
          onChange={setFilter}
          teamId={teamId}
          hiddenFields={hiddenFilters}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />
        <FilterChips filter={filter} onChange={setFilter} teamId={teamId} />
        {activeFilters > 0 ? (
          <button type="button" className="h-7 rounded-[6px] px-2 text-[12px] text-q-text3 hover:bg-q-hover hover:text-q-text" onClick={() => setFilter(initialFilter ?? {})}>
            Clear
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          {showSave ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (onSaveView) return onSaveView(filter, display);
                const name = window.prompt("Name this view");
                if (!name) return;
                try {
                  const viewId = await saveView({
                    token: ws.token,
                    workspaceId: ws.workspace._id,
                    name,
                    filters: JSON.stringify(filter),
                    display: JSON.stringify(display),
                    teamId: teamId as never,
                  });
                  ui.navigate(`/view/${viewId}`);
                } catch (error) {
                  toast.error(error);
                }
              }}
            >
              <Layers size={13} />
              Save view
            </Button>
          ) : null}
          <DisplayButton display={display} onChange={setDisplay} groupings={groupings} />
        </div>
      </div>

      <div className={display.layout === "board" ? "min-h-0 flex-1" : "q-scroll min-h-0 flex-1"}>
        {!ws.issuesLoaded ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-[39px] animate-pulse rounded bg-q-hover" />
            ))}
          </div>
        ) : filtered.length === 0 && display.layout === "list" ? (
          <EmptyState
            icon={<Layers size={36} strokeWidth={1.25} />}
            title={activeFilters ? "No issues match these filters" : emptyTitle}
            description={activeFilters ? "Try removing a filter." : emptyDescription}
            action={
              activeFilters ? (
                <Button onClick={() => setFilter({})}>Clear filters</Button>
              ) : (
                <Button variant="primary" onClick={() => ui.openCreate(createDefaults)}>
                  <Plus size={14} />
                  Create issue
                  <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">C</Kbd>
                </Button>
              )
            }
          />
        ) : display.layout === "board" ? (
          <IssueBoard groups={groups} display={display} interaction={interaction} />
        ) : (
          <IssueList
            groups={groups}
            display={display}
            collapsed={collapsed}
            onToggleGroup={(key) => setCollapsed((current) => ({ ...current, [key]: !current[key] }))}
            interaction={interaction}
          />
        )}
      </div>

      {selectedIssues.length > 0 ? (
        <SelectionBar
          count={selectedIssues.length}
          onClear={() => setSelectedIds(new Set())}
          onPick={(kind) => ui.openPicker(kind, selectedIssues)}
          onDelete={() => shortcutMap["mod+backspace"](new KeyboardEvent("keydown"))}
        />
      ) : null}
    </div>
  );
}

function SelectionBar({
  count,
  onClear,
  onPick,
  onDelete,
}: {
  count: number;
  onClear: () => void;
  onPick: (kind: PropertyKind) => void;
  onDelete: () => void;
}) {
  const items: { kind: PropertyKind; label: string; key: string }[] = [
    { kind: "status", label: "Status", key: "S" },
    { kind: "priority", label: "Priority", key: "P" },
    { kind: "assignee", label: "Assignee", key: "A" },
    { kind: "labels", label: "Labels", key: "L" },
    { kind: "project", label: "Project", key: "⇧P" },
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
      <div className="q-popover pointer-events-auto flex items-center gap-1 p-1">
        <span className="flex h-7 items-center gap-2 rounded-[6px] border border-dashed border-q-text4 px-2 text-[12px] text-q-text2">
          {count} selected
          <button type="button" aria-label="Clear selection" onClick={onClear} className="text-q-text3 hover:text-q-text">
            <X size={12} />
          </button>
        </span>
        {items.map((item) => (
          <Tooltip key={item.kind} label={`Change ${item.label.toLowerCase()}`} keys={[item.key]} side="top">
            <button
              type="button"
              onClick={() => onPick(item.kind)}
              className="h-7 rounded-[6px] px-2 text-[12px] text-q-text2 hover:bg-q-active hover:text-q-text"
            >
              {item.label}
            </button>
          </Tooltip>
        ))}
        <IconButton label="Delete" onClick={onDelete} className="hover:text-[#eb5757]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
