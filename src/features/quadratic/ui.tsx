"use client";

import { createContext, useContext, type MutableRefObject } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Issue } from "./data";
import type { PropertyKind } from "./components/pickers";

export type CreateDefaults = Partial<{
  teamId: Id<"quadraticTeams">;
  stateId: Id<"quadraticStates">;
  priority: number;
  assigneeId: Id<"quadraticUsers">;
  projectId: Id<"quadraticProjects">;
  cycleId: Id<"quadraticCycles">;
  parentId: Id<"quadraticIssues">;
  labelIds: Id<"quadraticLabels">[];
}>;

export type UiApi = {
  navigate: (path: string) => void;
  openCreate: (defaults?: CreateDefaults) => void;
  openCreateProject: () => void;
  openCommand: () => void;
  openShortcuts: () => void;
  openPicker: (kind: PropertyKind, issues: Issue[]) => void;
  toggleSidebar: () => void;
  /** The issues the current screen considers "active" (selection or focus), for the command menu. */
  activeIssues: MutableRefObject<() => Issue[]>;
  dialogOpen: boolean;
};

const UiContext = createContext<UiApi | null>(null);
export const UiProvider = UiContext.Provider;

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error("useUi must be used inside UiProvider");
  return value;
}
