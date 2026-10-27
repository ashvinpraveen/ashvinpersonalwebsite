"use client";

import { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "quadratic:token";
const THEME_KEY = "quadratic:theme";
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomString(length: number, alphabet = BASE62) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // 248 is the largest multiple of 62 below 256; re-roll above it to avoid bias.
  let out = "";
  for (let i = 0; out.length < length; i += 1) {
    if (i >= bytes.length) {
      crypto.getRandomValues(bytes);
      i = 0;
    }
    if (bytes[i] < 248) out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export const newSessionToken = () => randomString(48);
export const newApiKey = () => `qk_${randomString(40)}`;

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the session lasts for this tab only.
  }
}

/** The browser's Quadratic session token (or null when signed out). */
export function useSessionToken() {
  const [token, setTokenState] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setTokenState(readToken());
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY) setTokenState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setToken = useCallback((next: string | null) => {
    writeToken(next);
    setTokenState(next);
  }, []);

  return { token, setToken, ready: token !== undefined };
}

export type ThemePreference = "system" | "dark" | "light";

export function useQuadraticTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light" || stored === "system") setPreference(stored);
    } catch {
      // ignore
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const update = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    setPreference(next);
  }, []);

  const resolved: "dark" | "light" = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  return { preference, resolved, setPreference: update };
}

/** Small persisted UI preferences (display options, collapsed sections). */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const storageKey = `quadratic:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setValue(raw ? { ...initial, ...JSON.parse(raw) } : initial);
    } catch {
      setValue(initial);
    }
    // `initial` is a fresh object each render; only reload when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [storageKey],
  );

  return [value, update] as const;
}
