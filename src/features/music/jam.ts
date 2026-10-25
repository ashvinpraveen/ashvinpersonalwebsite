import {
  MAX_BARS,
  PROGRESSIONS,
  STYLE_IDS,
  chordToken,
  clampTempo,
  findProgression,
  mod12,
  parseChordToken,
  progressionsForMode,
  type Chord,
  type Mode,
  type StyleId,
} from "../../../convex/lib/musicTheory";
import {
  DRUM_LANES,
  VOICES,
  cloneGrid,
  grooveFor,
  type DrumGrid,
  type VoiceId,
} from "./grooves";

export const CHANNELS = ["drums", "bass", "keys", "click"] as const;
export type Channel = (typeof CHANNELS)[number];

export type ChannelMix = { level: number; muted: boolean };
export type Mix = Record<Channel, ChannelMix> & { space: number };

export type Trainer = {
  enabled: boolean;
  /** BPM added each time the trainer fires. */
  step: number;
  /** Fire after this many full loops. */
  every: number;
  target: number;
};

export type JamState = {
  tonic: number;
  mode: Mode;
  tempo: number;
  styleId: StyleId;
  /** Preset id, or null once the chords have been edited by hand. */
  progressionId: string | null;
  chords: Chord[];
  voice: VoiceId;
  drums: DrumGrid;
  drumsEdited: boolean;
  mix: Mix;
  countIn: boolean;
  click: boolean;
  trainer: Trainer;
  notes: string;
};

export const DEFAULT_MIX: Mix = {
  drums: { level: 0.85, muted: false },
  bass: { level: 0.8, muted: false },
  keys: { level: 0.75, muted: false },
  click: { level: 0.6, muted: false },
  space: 0.35,
};

export const DEFAULT_TRAINER: Trainer = {
  enabled: false,
  step: 4,
  every: 2,
  target: 140,
};

export function defaultJam(): JamState {
  const groove = grooveFor("lofi");
  const progression = findProgression("lofi-minor")!;
  return {
    tonic: 9,
    mode: progression.mode,
    tempo: groove.tempo,
    styleId: groove.id,
    progressionId: progression.id,
    chords: progression.chords.map((ch) => ({ ...ch })),
    voice: groove.voice,
    drums: cloneGrid(groove.drums),
    drumsEdited: false,
    mix: structuredCloneMix(DEFAULT_MIX),
    countIn: true,
    click: false,
    trainer: { ...DEFAULT_TRAINER },
    notes: "",
  };
}

function structuredCloneMix(mix: Mix): Mix {
  return {
    drums: { ...mix.drums },
    bass: { ...mix.bass },
    keys: { ...mix.keys },
    click: { ...mix.click },
    space: mix.space,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeChords(value: unknown): Chord[] | null {
  if (!Array.isArray(value)) return null;
  const chords: Chord[] = [];
  for (const item of value.slice(0, MAX_BARS)) {
    const parsed =
      typeof item === "string"
        ? parseChordToken(item)
        : isRecord(item)
          ? parseChordToken(`${String(item.offset)}:${String(item.quality)}`)
          : null;
    if (parsed) chords.push(parsed);
  }
  return chords.length > 0 ? chords : null;
}

function sanitizeGrid(value: unknown, fallback: DrumGrid): DrumGrid {
  if (!isRecord(value)) return cloneGrid(fallback);
  const next = cloneGrid(fallback);
  for (const lane of DRUM_LANES) {
    const row = value[lane];
    if (typeof row === "string" && /^[xo.]{16}$/.test(row)) next[lane] = row;
  }
  return next;
}

function sanitizeMix(value: unknown): Mix {
  const mix = structuredCloneMix(DEFAULT_MIX);
  if (!isRecord(value)) return mix;
  for (const channel of CHANNELS) {
    const entry = value[channel];
    if (isRecord(entry)) {
      mix[channel] = {
        level: num(entry.level, mix[channel].level, 0, 1),
        muted: bool(entry.muted, mix[channel].muted),
      };
    }
  }
  mix.space = num(value.space, mix.space, 0, 1);
  return mix;
}

/** Turn anything (old drafts, URL payloads) into a safe JamState. */
export function sanitizeJam(value: unknown): JamState {
  const base = defaultJam();
  if (!isRecord(value)) return base;

  const styleId = STYLE_IDS.includes(value.styleId as StyleId)
    ? (value.styleId as StyleId)
    : base.styleId;
  const groove = grooveFor(styleId);
  const mode: Mode = value.mode === "major" || value.mode === "minor" ? value.mode : base.mode;
  const chords = sanitizeChords(value.chords);
  const preset =
    typeof value.progressionId === "string" ? findProgression(value.progressionId) : null;

  let progressionId: string | null = null;
  let resolvedChords: Chord[];
  if (chords) {
    resolvedChords = chords;
    progressionId = preset && sameChords(preset.chords, chords) ? preset.id : null;
  } else if (preset) {
    resolvedChords = preset.chords.map((ch) => ({ ...ch }));
    progressionId = preset.id;
  } else {
    const fallback = progressionsForMode(mode)[0]!;
    resolvedChords = fallback.chords.map((ch) => ({ ...ch }));
    progressionId = fallback.id;
  }

  const voice =
    typeof value.voice === "string" && value.voice in VOICES
      ? (value.voice as VoiceId)
      : groove.voice;
  const drumsEdited = bool(value.drumsEdited, false);
  const trainer = isRecord(value.trainer) ? value.trainer : {};

  return {
    tonic: mod12(Math.round(num(value.tonic, base.tonic, 0, 11))),
    mode,
    tempo: clampTempo(num(value.tempo, groove.tempo, 0, 1000)),
    styleId,
    progressionId,
    chords: resolvedChords,
    voice,
    drums: drumsEdited ? sanitizeGrid(value.drums, groove.drums) : cloneGrid(groove.drums),
    drumsEdited,
    mix: sanitizeMix(value.mix),
    countIn: bool(value.countIn, base.countIn),
    click: bool(value.click, base.click),
    trainer: {
      enabled: bool(trainer.enabled, false),
      step: Math.round(num(trainer.step, DEFAULT_TRAINER.step, 1, 20)),
      every: Math.round(num(trainer.every, DEFAULT_TRAINER.every, 1, 8)),
      target: clampTempo(num(trainer.target, DEFAULT_TRAINER.target, 40, 220)),
    },
    notes: typeof value.notes === "string" ? value.notes.slice(0, 240) : "",
  };
}

export function sameChords(a: Chord[], b: Chord[]) {
  return a.length === b.length && a.every((ch, i) => chordToken(ch) === chordToken(b[i]!));
}

/** Apply a groove: tempo, voice, and drums follow the style. */
export function applyStyle(jam: JamState, styleId: StyleId): JamState {
  const groove = grooveFor(styleId);
  return {
    ...jam,
    styleId,
    tempo: groove.tempo,
    voice: groove.voice,
    drums: cloneGrid(groove.drums),
    drumsEdited: false,
  };
}

export function applyProgression(jam: JamState, id: string): JamState {
  const preset = findProgression(id);
  if (!preset) return jam;
  return {
    ...jam,
    mode: preset.mode,
    progressionId: preset.id,
    chords: preset.chords.map((ch) => ({ ...ch })),
  };
}

export function setChords(jam: JamState, chords: Chord[]): JamState {
  const clipped = chords.slice(0, MAX_BARS);
  if (clipped.length === 0) return jam;
  const preset = PROGRESSIONS.find((p) => p.mode === jam.mode && sameChords(p.chords, clipped));
  return { ...jam, chords: clipped, progressionId: preset?.id ?? null };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/** "Surprise me": a fresh, musically coherent jam. */
export function surpriseJam(jam: JamState, random: () => number = Math.random): JamState {
  const styleId = pick(STYLE_IDS.filter((id) => id !== jam.styleId), random);
  const mode: Mode = random() < 0.55 ? "major" : "minor";
  const options = progressionsForMode(mode).filter((p) => p.id !== jam.progressionId);
  const preset = pick(options, random);
  const styled = applyStyle(jam, styleId);
  const nudge = Math.round((random() - 0.5) * 12);
  return {
    ...styled,
    tonic: Math.floor(random() * 12),
    mode,
    progressionId: preset.id,
    chords: preset.chords.map((ch) => ({ ...ch })),
    tempo: clampTempo(styled.tempo + nudge),
  };
}

// ---------- Share links ----------

type SharePayload = {
  k: number;
  m: "M" | "m";
  t: number;
  s: StyleId;
  c: string;
  v: VoiceId;
  d?: string;
};

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "===".slice((padded.length + 3) % 4));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeJam(jam: JamState) {
  const payload: SharePayload = {
    k: jam.tonic,
    m: jam.mode === "major" ? "M" : "m",
    t: jam.tempo,
    s: jam.styleId,
    c: jam.chords.map(chordToken).join(","),
    v: jam.voice,
  };
  if (jam.drumsEdited) payload.d = DRUM_LANES.map((lane) => jam.drums[lane]).join("|");
  return toBase64Url(JSON.stringify(payload));
}

/** Decode a share code into a jam, keeping the visitor's own mix settings. */
export function decodeJam(code: string, current: JamState): JamState | null {
  try {
    const raw: unknown = JSON.parse(fromBase64Url(code.trim()));
    if (!isRecord(raw)) return null;
    const lanes = typeof raw.d === "string" ? raw.d.split("|") : null;
    const drums =
      lanes && lanes.length === DRUM_LANES.length
        ? Object.fromEntries(DRUM_LANES.map((lane, i) => [lane, lanes[i]]))
        : null;
    const chords = typeof raw.c === "string" ? raw.c.split(",") : null;
    if (!chords) return null;
    return sanitizeJam({
      ...current,
      tonic: raw.k,
      mode: raw.m === "M" ? "major" : raw.m === "m" ? "minor" : undefined,
      tempo: raw.t,
      styleId: raw.s,
      chords,
      progressionId: PROGRESSIONS.find((p) =>
        sameChords(p.chords, sanitizeChords(chords) ?? []),
      )?.id,
      voice: raw.v,
      drums: drums ?? undefined,
      drumsEdited: Boolean(drums),
    });
  } catch {
    return null;
  }
}
