"use client";

import type { ReactNode } from "react";
import {
  Copy,
  CopyPlus,
  GitBranch,
  Link2,
  Star,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useIssueActions, useToast, useWorkspace, type Issue } from "../data";
import { Avatar, PRIORITIES, PriorityIcon, ProjectIcon, StatusIcon, LabelDot } from "../icons";
import { useUi } from "../ui";
import { ContextItem, ContextMenu, ContextSeparator, ContextSub } from "./primitives";
import { CycleGlyph, useApplyProperty } from "./pickers";

export function branchName(identifier: string, title: string, handle: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${handle}/${identifier.toLowerCase()}-${slug}`;
}

export function useIssueClipboard() {
  const ws = useWorkspace();
  const toast = useToast();
  return {
    copy: async (text: string, message: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.show({ title: message });
      } catch {
        toast.show({ title: "Couldn't copy to clipboard" });
      }
    },
    url: (issue: Issue) => `${window.location.origin}${ws.href(`/issue/${ws.identifier(issue)}`)}`,
  };
}

/** Right-click menu for one or more issues, mirroring Linear's. */
export function IssueContextMenu({ issues, children }: { issues: Issue[]; children: ReactNode }) {
  if (issues.length === 0) return <>{children}</>;
  // Menu content (and its hooks) only mounts while the menu is open.
  return <ContextMenu menu={<IssueMenuItems issues={issues} />}>{children}</ContextMenu>;
}

function IssueMenuItems({ issues }: { issues: Issue[] }) {
  const ws = useWorkspace();
  const ui = useUi();
  const apply = useApplyProperty(issues);
  const actions = useIssueActions();
  const toast = useToast();
  const clipboard = useIssueClipboard();
  const toggleFavorite = useMutation(api.quadratic.favorites.toggle);
  const first = issues[0];
  const teamStates = ws.statesByTeam.get(first.teamId) ?? [];
  const now = Date.now();
  const single = issues.length === 1;
  const isFavorite = single && ws.favorites.some((fav) => fav.kind === "issue" && fav.targetId === first._id);

  return (
    <>
      <ContextSub label="Status" icon={<StatusIcon type="started" color="var(--q-text-3)" />}>
        {teamStates.map((state) => (
          <ContextItem
            key={state._id}
            icon={<StatusIcon type={state.type} color={state.color} progress={ws.stateProgress(state)} />}
            onSelect={() => apply("status", state._id)}
          >
            {state.name}
          </ContextItem>
        ))}
      </ContextSub>
      <ContextSub label="Assignee" icon={<UserRound size={14} />}>
        <ContextItem icon={<Avatar size={16} />} onSelect={() => apply("assignee", "none")}>
          No assignee
        </ContextItem>
        {ws.members.map((member) => (
          <ContextItem
            key={member._id}
            icon={<Avatar name={member.name} hue={member.avatarHue} size={16} />}
            onSelect={() => apply("assignee", member._id)}
          >
            {member.name}
          </ContextItem>
        ))}
      </ContextSub>
      <ContextSub label="Priority" icon={<PriorityIcon priority={2} size={14} />}>
        {PRIORITIES.map((priority) => (
          <ContextItem
            key={priority.value}
            icon={<PriorityIcon priority={priority.value} size={14} />}
            onSelect={() => apply("priority", String(priority.value))}
            keys={[String(priority.value)]}
          >
            {priority.name}
          </ContextItem>
        ))}
      </ContextSub>
      <ContextSub label="Labels" icon={<Tag size={14} />}>
        {ws.labels
          .filter((label) => !label.teamId || label.teamId === first.teamId)
          .map((label) => (
            <ContextItem key={label._id} icon={<LabelDot color={label.color} />} onSelect={() => apply("labels", label._id)}>
              {label.name}
              {issues.every((issue) => issue.labelIds.includes(label._id)) ? " ✓" : ""}
            </ContextItem>
          ))}
      </ContextSub>
      <ContextSub label="Project" icon={<ProjectIcon color="var(--q-text-3)" />}>
        <ContextItem onSelect={() => apply("project", "none")}>No project</ContextItem>
        {ws.projects
          .filter((project) => project.status !== "completed" && project.status !== "canceled")
          .map((project) => (
            <ContextItem
              key={project._id}
              icon={<ProjectIcon color={project.color} icon={project.icon} />}
              onSelect={() => apply("project", project._id)}
            >
              {project.name}
            </ContextItem>
          ))}
      </ContextSub>
      {ws.teamsById.get(first.teamId)?.cyclesEnabled ? (
        <ContextSub label="Cycle" icon={<CycleGlyph />}>
          <ContextItem onSelect={() => apply("cycle", "none")}>No cycle</ContextItem>
          {ws.cycles
            .filter((cycle) => cycle.teamId === first.teamId && cycle.endsAt > now)
            .sort((a, b) => a.startsAt - b.startsAt)
            .map((cycle) => (
              <ContextItem key={cycle._id} icon={<CycleGlyph active={cycle.startsAt <= now} />} onSelect={() => apply("cycle", cycle._id)}>
                {cycle.name ?? `Cycle ${cycle.number}`}
              </ContextItem>
            ))}
        </ContextSub>
      ) : null}
      <ContextSeparator />
      {single ? (
        <>
          <ContextItem
            icon={<Copy size={14} />}
            keys={["⌘", "."]}
            onSelect={() => clipboard.copy(ws.identifier(first), `Copied ${ws.identifier(first)}`)}
          >
            Copy ID
          </ContextItem>
          <ContextItem
            icon={<Link2 size={14} />}
            onSelect={() => clipboard.copy(clipboard.url(first), "Copied issue URL")}
          >
            Copy link
          </ContextItem>
          <ContextItem
            icon={<GitBranch size={14} />}
            onSelect={() =>
              clipboard.copy(branchName(ws.identifier(first), first.title, ws.viewer.handle), "Copied git branch name")
            }
          >
            Copy git branch name
          </ContextItem>
          <ContextItem
            icon={<CopyPlus size={14} />}
            onSelect={() => ui.openCreate({ teamId: first.teamId, parentId: first._id, projectId: first.projectId, cycleId: first.cycleId })}
          >
            Add sub-issue
          </ContextItem>
          <ContextItem
            icon={<Star size={14} />}
            onSelect={() =>
              toggleFavorite({ token: ws.token, workspaceId: ws.workspace._id, kind: "issue", targetId: first._id }).catch(toast.error)
            }
          >
            {isFavorite ? "Remove from favorites" : "Add to favorites"}
          </ContextItem>
          <ContextSeparator />
        </>
      ) : null}
      <ContextItem
        danger
        icon={<Trash2 size={14} />}
        keys={["⌘", "⌫"]}
        onSelect={() => {
          void actions.setArchived(issues.map((issue) => issue._id), true);
          toast.show({
            title: single ? `${ws.identifier(first)} deleted` : `${issues.length} issues deleted`,
            action: { label: "Undo", onClick: () => void actions.setArchived(issues.map((issue) => issue._id), false) },
          });
        }}
      >
        Delete
      </ContextItem>
    </>
  );
}
