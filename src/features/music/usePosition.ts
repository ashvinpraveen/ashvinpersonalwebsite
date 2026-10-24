"use client";

import { useSyncExternalStore } from "react";
import type { JamEngine, Position } from "./engine";

export const panelClass = "rounded-[1.6rem] bg-muted/55 p-4 sm:p-5";

const STOPPED: Position = { playing: false, countIn: 0, bar: 0, step: -1, loop: 0 };
const getStopped = () => STOPPED;
const noopSubscribe = () => () => undefined;

/** Subscribe to the transport without re-rendering the whole studio. */
export function usePosition(engine: JamEngine | null) {
  return useSyncExternalStore(
    engine?.subscribe ?? noopSubscribe,
    engine?.getPosition ?? getStopped,
    getStopped,
  );
}
