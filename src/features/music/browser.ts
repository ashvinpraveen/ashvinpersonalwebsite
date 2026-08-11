import { MUSIC_CLIENT_ID_KEY, MUSIC_DRAFT_KEY } from "./config";
import type { BackingTrackParams } from "./types";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `music-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateMusicClientId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(MUSIC_CLIENT_ID_KEY);
  if (existing) return existing;
  const next = randomId();
  window.localStorage.setItem(MUSIC_CLIENT_ID_KEY, next);
  return next;
}

export function readMusicDraft(): Partial<BackingTrackParams> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MUSIC_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<BackingTrackParams>;
  } catch {
    return null;
  }
}

export function writeMusicDraft(params: BackingTrackParams) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUSIC_DRAFT_KEY, JSON.stringify(params));
}
