import {
  AVATAR_PALETTE,
  CLIENT_ID_KEY,
  MAX_DISPLAY_NAME_LENGTH,
  PROFILE_KEY,
} from "./config";
import type { RunClubProfile } from "./types";

function randomId() {
  return typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateRunClubClientId() {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const clientId = `run-${randomId()}`;
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

export function pickAvatarHue(seed?: string) {
  if (!seed) {
    return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function readStoredProfile(): RunClubProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RunClubProfile>;
    if (
      typeof parsed.clientId !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.avatarHue !== "number"
    ) {
      return null;
    }
    return {
      clientId: parsed.clientId,
      displayName: parsed.displayName.slice(0, MAX_DISPLAY_NAME_LENGTH),
      avatarHue: parsed.avatarHue,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: RunClubProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function avatarColor(hue: number) {
  return `hsl(${hue} 72% 42%)`;
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
