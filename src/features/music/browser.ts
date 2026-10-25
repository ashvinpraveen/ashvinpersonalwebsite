import { sanitizeJam, type JamState } from "./jam";

const CLIENT_ID_KEY = "ashvin-music-client-id-v1";
const DRAFT_KEY = "ashvin-music-jam-v2";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `music-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateMusicClientId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = randomId();
    window.localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

export function readJamDraft(): JamState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? sanitizeJam(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeJamDraft(jam: JamState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(jam));
  } catch {
    // Private mode or full storage: the jam just won't be remembered.
  }
}
