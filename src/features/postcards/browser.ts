import { CLIENT_ID_KEY, DEFAULT_PEN_SIZE, DRAFT_KEY } from "./config";
import type { DrawingStroke, PostcardDraft } from "./types";

export function formatPostcardDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getOrCreatePostcardClientId() {
  const existingClientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existingClientId) return existingClientId;

  const clientId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

export function isDrawingStroke(value: unknown): value is DrawingStroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as { points?: unknown; width?: unknown };
  return (
    Array.isArray(stroke.points) &&
    stroke.points.every((point) => {
      if (!point || typeof point !== "object") return false;
      const maybePoint = point as { x?: unknown; y?: unknown };
      return typeof maybePoint.x === "number" && typeof maybePoint.y === "number";
    }) &&
    typeof stroke.width === "number"
  );
}

export function readPostcardDraft(): PostcardDraft | null {
  const rawDraft = window.localStorage.getItem(DRAFT_KEY);
  if (!rawDraft) return null;

  try {
    const draft = JSON.parse(rawDraft) as PostcardDraft;
    return {
      name: typeof draft.name === "string" ? draft.name : "",
      location: typeof draft.location === "string" ? draft.location : "",
      message: typeof draft.message === "string" ? draft.message : "",
      drawingStrokes: Array.isArray(draft.drawingStrokes)
        ? draft.drawingStrokes.filter(isDrawingStroke)
        : [],
      penSize: typeof draft.penSize === "number" ? draft.penSize : DEFAULT_PEN_SIZE,
    };
  } catch {
    return null;
  }
}
