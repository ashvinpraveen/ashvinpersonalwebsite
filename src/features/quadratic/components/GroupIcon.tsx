"use client";

import { useWorkspace } from "../data";
import type { GroupDescriptor } from "../filters";
import { Avatar, LabelDot, PriorityIcon, ProjectIcon, StatusIcon, TeamIcon } from "../icons";
import { CycleGlyph } from "./pickers";

export function GroupIcon({ descriptor }: { descriptor: GroupDescriptor }) {
  const ws = useWorkspace();
  switch (descriptor.kind) {
    case "status":
      return (
        <StatusIcon
          type={descriptor.state.type}
          color={descriptor.state.color}
          progress={ws.stateProgress(descriptor.state)}
        />
      );
    case "assignee": {
      const member = descriptor.userId ? ws.membersById.get(descriptor.userId) : undefined;
      return <Avatar name={member?.name} hue={member?.avatarHue} size={16} />;
    }
    case "project": {
      const project = descriptor.projectId ? ws.projectsById.get(descriptor.projectId) : undefined;
      return <ProjectIcon color={project?.color ?? "var(--q-text-4)"} icon={project?.icon} />;
    }
    case "priority":
      return <PriorityIcon priority={descriptor.priority} />;
    case "cycle":
      return <CycleGlyph active={Boolean(descriptor.cycleId)} />;
    case "label": {
      const label = descriptor.labelId ? ws.labelsById.get(descriptor.labelId) : undefined;
      return <LabelDot color={label?.color ?? "var(--q-text-4)"} />;
    }
    case "team": {
      const team = ws.teamsById.get(descriptor.teamId);
      return team ? <TeamIcon name={team.name} color={team.color} icon={team.icon} size={16} /> : null;
    }
    default:
      return null;
  }
}
