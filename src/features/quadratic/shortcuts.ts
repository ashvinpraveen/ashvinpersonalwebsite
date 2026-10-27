"use client";

import { useEffect, useRef } from "react";

export type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

/** Keys that still fire while typing in an input. */
const ALLOWED_WHILE_TYPING = new Set(["mod+k", "escape", "mod+enter", "mod+s"]);
const SEQUENCE_TIMEOUT = 900;

let pendingPrefix: { key: string; at: number } | null = null;

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = () => (isMac() ? "⌘" : "Ctrl");

export function comboFromEvent(event: KeyboardEvent) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("mod");
  if (event.altKey) parts.push("alt");
  const isLetter = /^[a-z]$/.test(key);
  if (event.shiftKey && (isLetter || key.length > 1)) parts.push("shift");
  parts.push(key === " " ? "space" : key);
  return parts.join("+");
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit"].includes(type);
  }
  return false;
}

type Registration = { map: { current: ShortcutMap } };
const registry: Registration[] = [];
let listening = false;

function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return;
  const combo = comboFromEvent(event);
  if (isTypingTarget(event.target) && !ALLOWED_WHILE_TYPING.has(combo)) return;
  // Most recently mounted handlers (dialogs, detail views) win over the shell.
  const layers = [...registry].reverse().map((registration) => registration.map.current);

  // A layer with a "*" binding (an open dialog) swallows everything below it.
  const run = (key: string) => {
    for (const bindings of layers) {
      if (bindings[key]) {
        event.preventDefault();
        bindings[key](event);
        return true;
      }
      if (bindings["*"]) return false;
    }
    return false;
  };

  if (pendingPrefix && Date.now() - pendingPrefix.at < SEQUENCE_TIMEOUT) {
    const sequence = `${pendingPrefix.key} ${combo}`;
    pendingPrefix = null;
    if (run(sequence)) return;
  }

  const reachable: ShortcutMap[] = [];
  for (const bindings of layers) {
    reachable.push(bindings);
    if (bindings["*"]) break;
  }
  if (reachable.some((bindings) => Object.keys(bindings).some((binding) => binding.startsWith(`${combo} `)))) {
    pendingPrefix = { key: combo, at: Date.now() };
  }

  run(combo);
}

/**
 * Linear-style keyboard shortcuts, including two-key sequences such as "g i".
 * Handlers registered later (a dialog over the shell) take precedence.
 */
export function useShortcuts(map: ShortcutMap, enabled = true) {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const registration: Registration = { map: mapRef };
    registry.push(registration);
    if (!listening) {
      window.addEventListener("keydown", handleKeyDown);
      listening = true;
    }
    return () => {
      registry.splice(registry.indexOf(registration), 1);
      if (registry.length === 0) {
        window.removeEventListener("keydown", handleKeyDown);
        listening = false;
      }
    };
  }, [enabled]);
}
