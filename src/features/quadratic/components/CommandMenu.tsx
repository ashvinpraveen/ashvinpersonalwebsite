"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Command } from "cmdk";
import {
  Archive,
  Box,
  Copy,
  Inbox,
  Keyboard,
  Layers,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  Target,
  UserRound,
} from "lucide-react";
import { useWorkspace, type Issue } from "../data";
import { PriorityIcon, ProjectIcon, StatusIcon, TeamIcon } from "../icons";
import type { ThemePreference } from "../session";
import { useUi } from "../ui";
import { CycleGlyph, type PropertyKind } from "./pickers";
import { Dialog, Kbd } from "./primitives";

type Action = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  keys?: string[];
  keywords?: string;
  run: () => void;
};

export function CommandMenu({
  open,
  onClose,
  setTheme,
  signOut,
}: {
  open: boolean;
  onClose: () => void;
  setTheme: (theme: ThemePreference) => void;
  signOut: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} position="top" className="max-w-[640px]" label="Command menu">
      {open ? <CommandMenuBody onClose={onClose} setTheme={setTheme} signOut={signOut} /> : null}
    </Dialog>
  );
}

function CommandMenuBody({
  onClose,
  setTheme,
  signOut,
}: {
  onClose: () => void;
  setTheme: (theme: ThemePreference) => void;
  signOut: () => void;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [search, setSearch] = useState("");
  const [targets] = useState<Issue[]>(() => ui.activeIssues.current());
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const go = (path: string) => run(() => ui.navigate(path));
  const pick = (kind: PropertyKind) => run(() => window.setTimeout(() => ui.openPicker(kind, targets), 0));

  const actions = useMemo(() => {
    const list: Action[] = [];
    if (targets.length) {
      const subject = targets.length === 1 ? ws.identifier(targets[0]) : `${targets.length} issues`;
      const issueGroup = `Issue · ${subject}`;
      list.push(
        { id: "status", label: "Change status…", group: issueGroup, icon: <StatusIcon type="started" color="var(--q-text-3)" />, keys: ["S"], run: pick("status") },
        { id: "priority", label: "Change priority…", group: issueGroup, icon: <PriorityIcon priority={2} size={14} />, keys: ["P"], run: pick("priority") },
        { id: "assignee", label: "Assign to…", group: issueGroup, icon: <UserRound size={14} />, keys: ["A"], run: pick("assignee") },
        { id: "labels", label: "Change labels…", group: issueGroup, icon: <Layers size={14} />, keys: ["L"], run: pick("labels") },
        { id: "project", label: "Add to project…", group: issueGroup, icon: <ProjectIcon color="var(--q-text-3)" />, keys: ["⇧", "P"], run: pick("project") },
        { id: "cycle", label: "Move to cycle…", group: issueGroup, icon: <CycleGlyph />, keys: ["⇧", "C"], run: pick("cycle") },
        { id: "due", label: "Set due date…", group: issueGroup, icon: <Target size={14} />, keys: ["⇧", "D"], run: pick("dueDate") },
        { id: "team", label: "Move to team…", group: issueGroup, icon: <Box size={14} />, keys: ["⇧", "M"], run: pick("team") },
      );
      if (targets.length === 1) {
        list.push({
          id: "copy-id",
          label: "Copy issue ID",
          group: issueGroup,
          icon: <Copy size={14} />,
          keys: ["⌘", "."],
          run: run(() => void navigator.clipboard.writeText(ws.identifier(targets[0]))),
        });
      }
    }
    list.push(
      { id: "create", label: "Create new issue", group: "Issues", icon: <Plus size={14} />, keys: ["C"], run: run(() => ui.openCreate()) },
      { id: "create-project", label: "Create new project", group: "Projects", icon: <ProjectIcon color="var(--q-text-3)" />, run: run(() => ui.openCreateProject()) },
      { id: "inbox", label: "Go to inbox", group: "Navigation", icon: <Inbox size={14} />, keys: ["G", "I"], run: go("/inbox") },
      { id: "my", label: "Go to my issues", group: "Navigation", icon: <UserRound size={14} />, keys: ["G", "M"], run: go("/my-issues/assigned") },
      { id: "projects", label: "Go to projects", group: "Navigation", icon: <Box size={14} />, keys: ["G", "P"], run: go("/projects") },
      { id: "views", label: "Go to views", group: "Navigation", icon: <Layers size={14} />, keys: ["G", "V"], run: go("/views") },
      { id: "trash", label: "Go to trash", group: "Navigation", icon: <Archive size={14} />, run: go("/trash") },
      { id: "settings", label: "Go to settings", group: "Navigation", icon: <Settings size={14} />, keys: ["G", "S"], run: go("/settings/account") },
    );
    for (const team of ws.teams) {
      list.push(
        {
          id: `team-${team._id}`,
          label: `Go to ${team.name} issues`,
          group: "Teams",
          keywords: team.key,
          icon: <TeamIcon name={team.name} color={team.color} icon={team.icon} size={14} />,
          run: go(`/team/${team.key}/all`),
        },
        {
          id: `team-active-${team._id}`,
          label: `Go to ${team.name} active issues`,
          group: "Teams",
          keywords: team.key,
          icon: <TeamIcon name={team.name} color={team.color} icon={team.icon} size={14} />,
          run: go(`/team/${team.key}/active`),
        },
      );
      if (team.cyclesEnabled) {
        list.push({ id: `cycles-${team._id}`, label: `Go to ${team.name} cycles`, group: "Teams", icon: <CycleGlyph />, run: go(`/team/${team.key}/cycles`) });
      }
    }
    for (const project of ws.projects) {
      list.push({
        id: `project-${project._id}`,
        label: project.name,
        group: "Projects",
        keywords: "project",
        icon: <ProjectIcon color={project.color} icon={project.icon} />,
        run: go(`/project/${project._id}`),
      });
    }
    list.push(
      { id: "theme-dark", label: "Switch to dark theme", group: "Preferences", icon: <Moon size={14} />, run: run(() => setTheme("dark")) },
      { id: "theme-light", label: "Switch to light theme", group: "Preferences", icon: <Sun size={14} />, run: run(() => setTheme("light")) },
      { id: "theme-system", label: "Use system theme", group: "Preferences", icon: <Monitor size={14} />, run: run(() => setTheme("system")) },
      { id: "shortcuts", label: "Open keyboard shortcuts", group: "Help", icon: <Keyboard size={14} />, keys: ["?"], run: run(() => ui.openShortcuts()) },
      { id: "logout", label: "Log out", group: "Account", icon: <LogOut size={14} />, run: run(signOut) },
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, ws]);

  const issueMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return ws.issues
      .filter((issue) => issue.title.toLowerCase().includes(query) || ws.identifier(issue).toLowerCase() === query)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8);
  }, [search, ws]);

  const groups = [...new Set(actions.map((action) => action.group))];

  return (
    <Command className="q-cmd flex max-h-[min(520px,70vh)] flex-col" loop>
      {targets.length ? (
        <div className="px-4 pt-3">
          <span className="inline-block max-w-full truncate rounded-[5px] bg-q-raised px-2 py-0.5 text-[12px] text-q-text3">
            {targets.length === 1 ? `${ws.identifier(targets[0])} – ${targets[0].title}` : `${targets.length} issues selected`}
          </span>
        </div>
      ) : null}
      <div className="flex h-12 items-center border-b border-q-border px-4">
        <Command.Input autoFocus value={search} onValueChange={setSearch} placeholder="Type a command or search…" className="text-[14px]" />
      </div>
      <Command.List className="q-scroll flex-1 py-1">
        <Command.Empty>No results found.</Command.Empty>
        {issueMatches.length ? (
          <Command.Group heading="Issues">
            {issueMatches.map((issue) => {
              const state = ws.statesById.get(issue.stateId);
              return (
                <Command.Item
                  key={issue._id}
                  value={`issue ${ws.identifier(issue)} ${issue.title}`}
                  onSelect={go(`/issue/${ws.identifier(issue)}`)}
                >
                  {state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null}
                  <span className="w-[56px] shrink-0 text-[12px] text-q-text3">{ws.identifier(issue)}</span>
                  <span className="truncate">{issue.title}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : null}
        {groups.map((group) => (
          <Command.Group key={group} heading={group}>
            {actions
              .filter((action) => action.group === group)
              .map((action) => (
                <Command.Item key={action.id} value={`${action.label} ${action.keywords ?? ""}`} onSelect={action.run}>
                  <span className="flex w-4 justify-center text-q-text3">{action.icon}</span>
                  <span className="flex-1 truncate">{action.label}</span>
                  {action.keys ? (
                    <span className="flex gap-1">
                      {action.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  ) : null}
                </Command.Item>
              ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );
}

const SHORTCUT_SECTIONS: { title: string; items: [string, string[]][] }[] = [
  {
    title: "General",
    items: [
      ["Open command menu", ["⌘", "K"]],
      ["Search", ["/"]],
      ["Create issue", ["C"]],
      ["Keyboard shortcuts", ["?"]],
      ["Toggle sidebar", ["["]],
    ],
  },
  {
    title: "Navigation",
    items: [
      ["Go to inbox", ["G", "I"]],
      ["Go to my issues", ["G", "M"]],
      ["Go to active issues", ["G", "A"]],
      ["Go to backlog", ["G", "B"]],
      ["Go to all issues", ["G", "E"]],
      ["Go to cycles", ["G", "C"]],
      ["Go to projects", ["G", "P"]],
      ["Go to views", ["G", "V"]],
      ["Go to settings", ["G", "S"]],
    ],
  },
  {
    title: "Issue list",
    items: [
      ["Move down / up", ["J", "K"]],
      ["Open issue", ["↵"]],
      ["Select issue", ["X"]],
      ["Extend selection", ["⇧", "J"]],
      ["Select all", ["⌘", "A"]],
      ["Filter", ["F"]],
      ["Toggle list / board", ["⌘", "B"]],
    ],
  },
  {
    title: "Issues",
    items: [
      ["Change status", ["S"]],
      ["Change priority", ["P"]],
      ["Assign", ["A"]],
      ["Assign to me", ["I"]],
      ["Change labels", ["L"]],
      ["Add to project", ["⇧", "P"]],
      ["Move to cycle", ["⇧", "C"]],
      ["Set due date", ["⇧", "D"]],
      ["Set estimate", ["⇧", "E"]],
      ["Move to team", ["⇧", "M"]],
      ["Copy ID", ["⌘", "."]],
      ["Delete", ["⌘", "⌫"]],
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} className="max-w-[720px]" label="Keyboard shortcuts">
      <div className="flex h-12 items-center border-b border-q-border px-5 font-medium text-q-text">Keyboard shortcuts</div>
      <div className="q-scroll grid max-h-[65vh] gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
        {SHORTCUT_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-2 text-[12px] font-medium text-q-text3">{section.title}</div>
            {section.items.map(([label, keys]) => (
              <div key={label} className="flex h-8 items-center justify-between border-b border-q-line text-q-text2">
                <span>{label}</span>
                <span className="flex gap-1">
                  {keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
