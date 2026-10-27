"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  Archive,
  Box,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Inbox,
  Layers,
  LogOut,
  Plug,
  Plus,
  Search,
  Settings,
  SquarePen,
  UserPlus,
  UserRound,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useWorkspace } from "../data";
import { ProjectIcon, StatusIcon, TeamIcon, WorkspaceIcon } from "../icons";
import { usePersistentState } from "../session";
import { useUi } from "../ui";
import { CycleGlyph } from "./pickers";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, Tooltip } from "./primitives";
import { cn } from "@/lib/utils";

function NavItem({
  icon,
  label,
  href,
  active,
  badge,
  indent = false,
  onNavigate,
}: {
  icon: ReactNode;
  label: ReactNode;
  href: string;
  active: boolean;
  badge?: ReactNode;
  indent?: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        onNavigate(href);
      }}
      className={cn(
        "flex h-[28px] items-center gap-2 rounded-[6px] pr-2 text-[13px] transition-colors",
        indent ? "pl-[26px]" : "pl-2",
        active ? "bg-q-active text-q-text" : "text-q-text2 hover:bg-q-hover hover:text-q-text",
      )}
    >
      <span className={cn("flex w-4 shrink-0 items-center justify-center", active ? "text-q-text" : "text-q-text3")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge}
    </a>
  );
}

function Section({ title, children, defaultOpen = true, id }: { title: string; children: ReactNode; defaultOpen?: boolean; id: string }) {
  const [state, setState] = usePersistentState<{ open: boolean }>(`sidebar:${id}`, { open: defaultOpen });
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setState({ open: !state.open })}
        className="group flex h-6 w-full items-center gap-1 rounded-[5px] px-2 text-[12px] font-medium text-q-text3 hover:text-q-text2"
      >
        {title}
        <ChevronDown size={11} className={cn("transition-transform", state.open ? "" : "-rotate-90")} />
      </button>
      {state.open ? <div className="mt-0.5 space-y-px">{children}</div> : null}
    </div>
  );
}

export function Sidebar({ pathname, onSignOut }: { pathname: string; onSignOut: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const workspaces = useQuery(api.quadratic.workspaces.mine, { token: ws.token }) ?? [];
  const [expandedTeams, setExpandedTeams] = usePersistentState<Record<string, boolean>>("sidebar:teams", {});
  const base = `/quadratic/${ws.workspace.slug}`;
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  const navigate = (href: string) => ui.navigate(href.startsWith(base) ? href.slice(base.length) : href);
  const isActive = (path: string, exact = false) => (exact ? rel === path : rel === path || rel.startsWith(`${path}/`));

  const favorites = ws.favorites
    .map((fav) => {
      if (fav.kind === "issue") {
        const issue = ws.issuesById.get(fav.targetId);
        if (!issue) return null;
        const state = ws.statesById.get(issue.stateId);
        return {
          id: fav._id,
          href: `${base}/issue/${ws.identifier(issue)}`,
          label: issue.title,
          icon: state ? <StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} /> : null,
        };
      }
      if (fav.kind === "project") {
        const project = ws.projectsById.get(fav.targetId);
        return project
          ? { id: fav._id, href: `${base}/project/${project._id}`, label: project.name, icon: <ProjectIcon color={project.color} icon={project.icon} /> }
          : null;
      }
      if (fav.kind === "view") {
        const view = ws.views.find((v) => v._id === fav.targetId);
        return view ? { id: fav._id, href: `${base}/view/${view._id}`, label: view.name, icon: <Layers size={14} style={{ color: view.color }} /> } : null;
      }
      const cycle = ws.cyclesById.get(fav.targetId);
      const team = cycle ? ws.teamsById.get(cycle.teamId) : undefined;
      return cycle && team
        ? { id: fav._id, href: `${base}/team/${team.key}/cycle/${cycle.number}`, label: cycle.name ?? `Cycle ${cycle.number}`, icon: <CycleGlyph active /> }
        : null;
    })
    .filter((fav) => fav !== null);

  return (
    <nav className="flex h-full w-full flex-col px-2 pb-2 pt-2" aria-label="Sidebar">
      <div className="flex items-center gap-1">
        <Menu
          trigger={
            <button type="button" className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px] px-1.5 text-left hover:bg-q-hover">
              <WorkspaceIcon name={ws.workspace.name} size={20} />
              <span className="truncate font-semibold text-q-text">{ws.workspace.name}</span>
              <ChevronDown size={12} className="shrink-0 text-q-text3" />
            </button>
          }
        >
          <MenuLabel>{ws.viewer.email ?? `@${ws.viewer.handle}`}</MenuLabel>
          {workspaces.map((workspace) => (
            <MenuItem
              key={workspace._id}
              icon={<WorkspaceIcon name={workspace.name} size={16} />}
              checked={workspace._id === ws.workspace._id}
              onSelect={() => {
                window.location.href = `/quadratic/${workspace.slug}`;
              }}
            >
              {workspace.name}
            </MenuItem>
          ))}
          <MenuItem icon={<Plus size={14} />} onSelect={() => (window.location.href = "/quadratic?new=1")}>
            Create or join a workspace
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Settings size={14} />} keys={["G", "S"]} onSelect={() => ui.navigate("/settings/workspace")}>
            Settings
          </MenuItem>
          <MenuItem icon={<UserPlus size={14} />} onSelect={() => ui.navigate("/settings/members")}>
            Invite and manage members
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<LogOut size={14} />} onSelect={onSignOut}>
            Log out
          </MenuItem>
        </Menu>
        <Tooltip label="Search" keys={["/"]}>
          <IconButton label="Search" onClick={() => ui.navigate("/search")}>
            <Search size={15} />
          </IconButton>
        </Tooltip>
        <Tooltip label="Create new issue" keys={["C"]}>
          <IconButton label="Create new issue" onClick={() => ui.openCreate()} className="border border-q-border bg-q-raised text-q-text2 shadow-sm">
            <SquarePen size={14} />
          </IconButton>
        </Tooltip>
      </div>

      <div className="q-scroll -mx-2 mt-3 flex-1 px-2">
        <div className="space-y-px">
          <NavItem
            icon={<Inbox size={15} />}
            label="Inbox"
            href={`${base}/inbox`}
            active={isActive("/inbox")}
            onNavigate={navigate}
            badge={
              ws.unreadCount > 0 ? (
                <span className="min-w-[18px] rounded-full bg-q-accent px-1.5 text-center text-[11px] font-medium leading-[18px] text-white">
                  {ws.unreadCount}
                </span>
              ) : null
            }
          />
          <NavItem icon={<UserRound size={15} />} label="My issues" href={`${base}/my-issues/assigned`} active={isActive("/my-issues")} onNavigate={navigate} />
        </div>

        <Section title="Workspace" id="workspace">
          <NavItem icon={<Box size={15} />} label="Projects" href={`${base}/projects`} active={isActive("/projects") || rel.startsWith("/project/")} onNavigate={navigate} />
          <NavItem icon={<Layers size={15} />} label="Views" href={`${base}/views`} active={isActive("/views") || rel.startsWith("/view/")} onNavigate={navigate} />
          <NavItem icon={<Archive size={15} />} label="Trash" href={`${base}/trash`} active={isActive("/trash")} onNavigate={navigate} />
        </Section>

        {favorites.length ? (
          <Section title="Favorites" id="favorites">
            {favorites.map((fav) => (
              <NavItem key={fav.id} icon={fav.icon} label={fav.label} href={fav.href} active={pathname === fav.href} onNavigate={navigate} />
            ))}
          </Section>
        ) : null}

        <Section title="Your teams" id="teams">
          {ws.teams.map((team) => {
            const expanded = expandedTeams[team._id] ?? true;
            return (
              <div key={team._id}>
                <button
                  type="button"
                  onClick={() => setExpandedTeams((current) => ({ ...current, [team._id]: !expanded }))}
                  className="flex h-[28px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-q-text2 hover:bg-q-hover hover:text-q-text"
                >
                  <TeamIcon name={team.name} color={team.color} icon={team.icon} size={16} />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  <ChevronRight size={11} className={cn("shrink-0 text-q-text4 transition-transform", expanded && "rotate-90")} />
                </button>
                {expanded ? (
                  <div className="space-y-px">
                    <NavItem
                      indent
                      icon={<Layers size={14} />}
                      label="Issues"
                      href={`${base}/team/${team.key}/all`}
                      active={["all", "active", "backlog"].some((tab) => isActive(`/team/${team.key}/${tab}`))}
                      onNavigate={navigate}
                    />
                    {team.cyclesEnabled ? (
                      <NavItem
                        indent
                        icon={<CycleGlyph />}
                        label="Cycles"
                        href={`${base}/team/${team.key}/cycles`}
                        active={isActive(`/team/${team.key}/cycles`) || isActive(`/team/${team.key}/cycle`)}
                        onNavigate={navigate}
                      />
                    ) : null}
                    <NavItem
                      indent
                      icon={<Box size={14} />}
                      label="Projects"
                      href={`${base}/team/${team.key}/projects`}
                      active={isActive(`/team/${team.key}/projects`)}
                      onNavigate={navigate}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => ui.navigate("/settings/teams/new")}
            className="flex h-[28px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-q-text3 hover:bg-q-hover hover:text-q-text"
          >
            <Plus size={14} />
            Create a team
          </button>
        </Section>
      </div>

      <div className="mt-2 space-y-px border-t border-q-line pt-2">
        <NavItem icon={<UserPlus size={15} />} label="Invite people" href={`${base}/settings/members`} active={false} onNavigate={navigate} />
        <NavItem icon={<Plug size={15} />} label="Connect AI tools (MCP)" href={`${base}/settings/api`} active={isActive("/settings/api")} onNavigate={navigate} />
        <button
          type="button"
          onClick={() => ui.openShortcuts()}
          className="flex h-[28px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-q-text2 hover:bg-q-hover hover:text-q-text"
        >
          <span className="flex w-4 justify-center text-q-text3">
            <CircleHelp size={15} />
          </span>
          Keyboard shortcuts
        </button>
      </div>
    </nav>
  );
}
