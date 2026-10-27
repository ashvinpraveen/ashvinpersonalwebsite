"use client";

import type { MouseEvent } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Issue } from "../data";
import type { DisplayOptions, GroupDescriptor, IssueGroup } from "../filters";
import { GroupIcon } from "./GroupIcon";
import { IssueContextMenu } from "./IssueContextMenu";
import { IssueRow } from "./IssueRow";
import { cn } from "@/lib/utils";

export type ListInteraction = {
  focusedId: string | null;
  selectedIds: Set<string>;
  targetsFor: (issue: Issue) => Issue[];
  onOpen: (issue: Issue, event: MouseEvent) => void;
  onHover: (issue: Issue) => void;
  onToggleSelect: (issue: Issue, event: MouseEvent) => void;
  onCreateInGroup: (descriptor: GroupDescriptor) => void;
};

export function IssueList({
  groups,
  display,
  collapsed,
  onToggleGroup,
  interaction,
}: {
  groups: IssueGroup[];
  display: DisplayOptions;
  collapsed: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  interaction: ListInteraction;
}) {
  const showHeaders = display.grouping !== "none";
  const selectionActive = interaction.selectedIds.size > 0;
  return (
    <div role="grid" className="pb-24">
      {groups.map((group) => {
        const isCollapsed = Boolean(collapsed[group.key]);
        return (
          <section key={group.key}>
            {showHeaders ? (
              <div
                className="group/header sticky top-0 z-[1] flex h-9 items-center gap-2 border-b border-q-line bg-q-raised pl-3 pr-4 sm:pl-5 sm:pr-6"
                onClick={() => onToggleGroup(group.key)}
              >
                <ChevronRight
                  size={12}
                  className={cn("-ml-1 text-q-text4 transition-transform", isCollapsed ? "" : "rotate-90")}
                />
                <span className="flex w-4 items-center justify-center">
                  <GroupIcon descriptor={group.descriptor} />
                </span>
                <span className="font-medium text-q-text">{group.label}</span>
                <span className="text-q-text3">{group.issues.length}</span>
                <button
                  type="button"
                  aria-label={`Create issue in ${group.label}`}
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded text-q-text3 opacity-0 hover:bg-q-active hover:text-q-text group-hover/header:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    interaction.onCreateInGroup(group.descriptor);
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : null}
            {!isCollapsed
              ? group.issues.map((issue) => (
                  <IssueContextMenu key={issue._id} issues={interaction.targetsFor(issue)}>
                    <div>
                      <IssueRow
                        issue={issue}
                        focused={interaction.focusedId === issue._id}
                        selected={interaction.selectedIds.has(issue._id)}
                        selectionActive={selectionActive}
                        display={display}
                        targets={interaction.targetsFor(issue)}
                        onOpen={interaction.onOpen}
                        onHover={interaction.onHover}
                        onToggleSelect={interaction.onToggleSelect}
                      />
                    </div>
                  </IssueContextMenu>
                ))
              : null}
          </section>
        );
      })}
    </div>
  );
}
