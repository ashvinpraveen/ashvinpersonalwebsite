import { DRUM_PATTERNS, PAD_VOICES, PROGRESSION_PRESETS } from "./config";
import type { BackingTrackParams } from "./types";

export const POLISH_DURATION_MS = 120_000;
export const REFERENCE_CONDITION_MS = 30_000;

function clampTempo(tempoBpm: number) {
  return Math.round(Math.min(180, Math.max(60, tempoBpm)));
}

export function resolveChords(params: Pick<BackingTrackParams, "progressionId" | "chords">) {
  if (params.progressionId === "custom") {
    return params.chords.length > 0 ? params.chords : (["I", "V", "IV", "V"] as const);
  }
  return PROGRESSION_PRESETS[params.progressionId].chords;
}

export function formatChordProgression(
  params: Pick<BackingTrackParams, "progressionId" | "chords">,
) {
  if (params.progressionId !== "custom") {
    return PROGRESSION_PRESETS[params.progressionId].label;
  }
  return resolveChords(params).join(" – ");
}

export function buildPositiveStyles(params: BackingTrackParams) {
  const tempo = clampTempo(params.tempoBpm);
  const drums = DRUM_PATTERNS[params.drumPatternId];
  const pad = PAD_VOICES[params.padVoiceId];
  const chordCount = resolveChords(params).length;
  const bars = Math.max(1, Math.min(16, Math.round(params.bars || chordCount)));
  const isBlues = params.progressionId === "blues-12";
  const notes = params.notes.trim();

  const styles = [
    `${tempo} BPM`,
    isBlues ? `${params.key} blues` : `${params.key} major`,
    isBlues
      ? "classic 12-bar blues progression"
      : `chord progression ${formatChordProgression(params)}`,
    `repeating ${bars}-bar loop`,
    `${pad.label}`,
    pad.description,
    drums.label === "No drums" ? "no drums" : `${drums.label} drums`,
    "instrumental backing track",
    "steady groove",
    "studio quality",
    "great production quality",
  ];

  if (notes) styles.push(notes);
  return styles.slice(0, 50);
}

export function buildNegativeStyles() {
  return [
    "vocals",
    "lyrics",
    "singing",
    "rap",
    "choir",
    "spoken word",
    "dramatic intro",
    "big finale",
  ];
}

/** Short human-readable summary stored on the track + shown in UI. */
export function buildStylePrompt(params: BackingTrackParams) {
  return buildPositiveStyles(params).join(", ");
}

export function buildCompositionPlan(params: {
  songId: string;
  conditionEndMs: number;
  positiveStyles: string[];
  negativeStyles: string[];
}) {
  const conditionEndMs = Math.max(
    3000,
    Math.min(REFERENCE_CONDITION_MS, Math.round(params.conditionEndMs)),
  );
  const half = Math.floor(POLISH_DURATION_MS / 2);

  return {
    chunks: [
      {
        text: "[Groove]\n{instrumental backing}",
        duration_ms: half,
        positive_styles: params.positiveStyles,
        negative_styles: params.negativeStyles,
        context_adherence: "high" as const,
        conditioning_ref: {
          song_id: params.songId,
          range: { start_ms: 0, end_ms: conditionEndMs },
        },
        condition_strength: "high" as const,
      },
      {
        text: "[Groove]\n{continue same instrumental groove}",
        duration_ms: half,
        positive_styles: [
          "same groove",
          "steady energy",
          "instrumental",
          "great production quality",
        ],
        negative_styles: params.negativeStyles,
        context_adherence: "high" as const,
      },
    ],
  };
}

export function buildTrackTitle(params: BackingTrackParams) {
  if (params.progressionId !== "custom") {
    const short = PROGRESSION_PRESETS[params.progressionId].shortLabel;
    return `${params.key} ${clampTempo(params.tempoBpm)} ${short}`.slice(0, 80);
  }
  const chords = resolveChords(params).join("-");
  return `${params.key} ${clampTempo(params.tempoBpm)} ${chords}`.slice(0, 80);
}

export function buildLocalPreviewLabel(params: BackingTrackParams) {
  return `${params.key} · ${clampTempo(params.tempoBpm)} BPM · ${formatChordProgression(params)}`;
}
