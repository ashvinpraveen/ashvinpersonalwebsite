"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AudioLines,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { BackingLoopEngine } from "@/features/music/audioEngine";
import BeatMeter from "@/features/music/BeatMeter";
import {
  getOrCreateMusicClientId,
  readMusicDraft,
  writeMusicDraft,
} from "@/features/music/browser";
import {
  DEFAULT_BARS,
  DEFAULT_KEY,
  DEFAULT_PAD_VOICE,
  DEFAULT_TEMPO_BPM,
  DRUM_PATTERNS,
  KEYS,
  MAX_TEMPO_BPM,
  MIN_TEMPO_BPM,
  PAD_VOICES,
  PROGRESSION_PRESETS,
  ROMAN_OPTIONS,
} from "@/features/music/config";
import MusicTunerPanel from "@/features/music/MusicTunerPanel";
import {
  buildLocalPreviewLabel,
  buildStylePrompt,
  resolveChords,
} from "@/features/music/prompt";
import type {
  BackingTrackParams,
  DrumPatternId,
  MusicKey,
  PadVoiceId,
  ProgressionPresetId,
  RomanNumeral,
  TransportState,
} from "@/features/music/types";
import { useMicRecorder } from "@/features/music/useMicRecorder";
import { useTapTempo } from "@/features/music/useTapTempo";
import { isConvexConfigured, isMusicEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

const MusicPolishControls = dynamic(
  () => import("@/features/music/MusicPolishControls"),
  { ssr: false },
);

const PRESET_IDS = Object.keys(PROGRESSION_PRESETS) as Array<
  Exclude<ProgressionPresetId, "custom">
>;

const PAD_VOICE_IDS = Object.keys(PAD_VOICES) as PadVoiceId[];

function barsForProgression(id: ProgressionPresetId) {
  if (id === "custom") return DEFAULT_BARS;
  return PROGRESSION_PRESETS[id].chords.length;
}

function MusicStudioApp() {
  const [clientId, setClientId] = useState("");
  const [key, setKey] = useState<MusicKey>(DEFAULT_KEY);
  const [progressionId, setProgressionId] =
    useState<ProgressionPresetId>("blues-12");
  const [customChords, setCustomChords] = useState<RomanNumeral[]>([
    "I7",
    "I7",
    "I7",
    "I7",
    "IV7",
    "IV7",
    "I7",
    "I7",
    "V7",
    "IV7",
    "I7",
    "V7",
  ]);
  const [drumPatternId, setDrumPatternId] =
    useState<DrumPatternId>("softPop");
  const [padVoiceId, setPadVoiceId] = useState<PadVoiceId>(DEFAULT_PAD_VOICE);
  const [bars, setBars] = useState(12);
  const [notes, setNotes] = useState("");
  const [isLoopPlaying, setIsLoopPlaying] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [transport, setTransport] = useState<TransportState>({
    beat: 1,
    barIndex: 0,
    chord: "I7",
    playing: false,
  });
  const [polishTrackId, setPolishTrackId] = useState<Id<"musicTracks"> | null>(
    null,
  );
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const { tempoBpm, setTempo, tap, tapCount } = useTapTempo(DEFAULT_TEMPO_BPM);
  const mic = useMicRecorder();
  const engineRef = useRef<BackingLoopEngine | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

  const params: BackingTrackParams = useMemo(
    () => ({
      tempoBpm,
      key,
      progressionId,
      chords:
        progressionId === "custom"
          ? customChords
          : PROGRESSION_PRESETS[progressionId].chords,
      drumPatternId,
      padVoiceId,
      bars,
      hasMicTake: mic.hasTake,
      notes,
    }),
    [
      bars,
      customChords,
      drumPatternId,
      key,
      mic.hasTake,
      notes,
      padVoiceId,
      progressionId,
      tempoBpm,
    ],
  );

  const stylePrompt = useMemo(() => buildStylePrompt(params), [params]);
  const localLabel = useMemo(() => buildLocalPreviewLabel(params), [params]);

  const stopLocalLoop = useCallback(() => {
    engineRef.current?.stop();
    setIsLoopPlaying(false);
  }, []);

  useEffect(() => {
    setClientId(getOrCreateMusicClientId());
    const draft = readMusicDraft();
    if (draft) {
      if (typeof draft.tempoBpm === "number") setTempo(draft.tempoBpm);
      if (draft.key) setKey(draft.key);
      if (
        draft.progressionId === "custom" ||
        (draft.progressionId && draft.progressionId in PROGRESSION_PRESETS)
      ) {
        setProgressionId(draft.progressionId);
      }
      if (draft.chords?.length) setCustomChords(draft.chords);
      if (draft.drumPatternId) setDrumPatternId(draft.drumPatternId);
      if (draft.padVoiceId && draft.padVoiceId in PAD_VOICES) {
        setPadVoiceId(draft.padVoiceId);
      }
      if (typeof draft.bars === "number") setBars(draft.bars);
      if (typeof draft.notes === "string") setNotes(draft.notes);
    }
    setDraftReady(true);
    const engine = new BackingLoopEngine();
    engineRef.current = engine;
    const unsubscribe = engine.subscribeTransport(setTransport);
    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, [setTempo]);

  useEffect(() => {
    if (!draftReady) return;
    writeMusicDraft(params);
  }, [draftReady, params]);

  useEffect(() => {
    engineRef.current?.setParams(params);
  }, [params]);

  useEffect(() => {
    if (aiAudioRef.current) {
      aiAudioRef.current.loop = true;
    }
  }, [aiAudioUrl]);

  async function toggleLocalLoop() {
    const engine = engineRef.current;
    if (!engine) return;
    const playing = await engine.toggle(params);
    setIsLoopPlaying(playing);
    if (playing && aiAudioRef.current) {
      aiAudioRef.current.pause();
    }
  }

  function handlePolishFallback() {
    toast.message("Local loop is ready", {
      description: "Connect Convex and set ELEVENLABS_API_KEY to polish with ElevenLabs.",
    });
  }

  function selectProgression(id: ProgressionPresetId) {
    setProgressionId(id);
    if (id !== "custom") {
      setBars(barsForProgression(id));
      setCustomChords([...PROGRESSION_PRESETS[id].chords]);
    }
  }

  function updateCustomChord(index: number, value: RomanNumeral) {
    const base = resolveChords(params);
    setProgressionId("custom");
    setCustomChords(base.map((chord, i) => (i === index ? value : chord)));
  }

  if (!isMusicEnabled) {
    return (
      <div className="music-studio grid min-h-dvh place-items-center px-6">
        <div className="max-w-md rounded-2xl border border-[var(--music-line)] bg-[var(--music-panel)] p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--music-muted)]">
            Music studio
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-music-display)] text-2xl">
            Backing tracks are off
          </h1>
          <p className="mt-3 text-sm text-[var(--music-muted)]">
            Set NEXT_PUBLIC_ENABLE_MUSIC=true to turn this page back on.
          </p>
          <Link href="/" className="mt-5 inline-block text-sm underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const chords = resolveChords(params);

  return (
    <div className="music-studio relative min-h-dvh overflow-hidden text-[var(--music-ink)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="music-wash music-wash-a" />
        <div className="music-wash music-wash-b" />
        <div className="music-grid" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--music-line)] bg-[var(--music-panel)] px-3 text-sm transition hover:border-[var(--music-accent)]"
        >
          <span aria-hidden="true">↩</span>
          <span className="hidden sm:inline">Ashvin</span>
        </Link>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--music-muted)]">
            ashvinpraveen.com/music
          </p>
          <h1 className="font-[family-name:var(--font-music-display)] text-xl tracking-tight sm:text-2xl">
            Backing Track
          </h1>
        </div>
        <div className="relative flex w-10 justify-end sm:w-[4.5rem]">
          <button
            type="button"
            onClick={() => setTunerOpen((open) => !open)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
              tunerOpen
                ? "border-[var(--music-accent)] bg-[var(--music-accent-soft)] text-[var(--music-accent)]"
                : "border-[var(--music-line)] bg-[var(--music-panel)] text-[var(--music-muted)] hover:border-[var(--music-accent)] hover:text-[var(--music-ink)]",
            )}
            aria-label={tunerOpen ? "Close tuner" : "Open tuner"}
            aria-expanded={tunerOpen}
          >
            <AudioLines size={18} />
          </button>
          <MusicTunerPanel open={tunerOpen} onClose={() => setTunerOpen(false)} />
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-5xl gap-5 px-4 pb-28 pt-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 shadow-[0_20px_60px_rgba(8,12,10,0.28)] sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
                  Tempo
                </p>
                <p className="mt-1 font-[family-name:var(--font-music-display)] text-5xl tabular-nums leading-none">
                  {tempoBpm}
                  <span className="ml-2 text-base text-[var(--music-muted)]">BPM</span>
                </p>
              </div>
              <button
                type="button"
                onClick={tap}
                className="music-tap h-24 w-24 rounded-full border border-[var(--music-accent)] bg-[var(--music-accent-soft)] text-sm font-semibold text-[var(--music-accent-ink)] transition active:scale-95"
              >
                Tap
                {tapCount > 0 ? (
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider opacity-70">
                    {tapCount} taps
                  </span>
                ) : null}
              </button>
            </div>
            <input
              type="range"
              min={MIN_TEMPO_BPM}
              max={MAX_TEMPO_BPM}
              value={tempoBpm}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="music-slider mt-5 w-full"
              aria-label="Tempo BPM"
            />
            <div className="mt-4">
              <BeatMeter transport={transport} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
              Key
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {KEYS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKey(option)}
                  className={cn(
                    "h-10 min-w-10 rounded-xl border px-3 text-sm transition",
                    key === option
                      ? "border-[var(--music-accent)] bg-[var(--music-accent)] text-[var(--music-accent-ink)]"
                      : "border-[var(--music-line)] bg-transparent hover:border-[var(--music-accent)]",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
                Chord progression
              </p>
              <button
                type="button"
                className="text-xs text-[var(--music-muted)] underline-offset-2 hover:underline"
                onClick={() => setProgressionId("custom")}
              >
                Mix your own
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectProgression(id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    progressionId === id
                      ? "border-[var(--music-accent)] bg-[var(--music-accent-soft)] text-[var(--music-accent-ink)]"
                      : "border-[var(--music-line)] hover:border-[var(--music-accent)]",
                  )}
                >
                  {PROGRESSION_PRESETS[id].shortLabel}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--music-muted)]">
              {progressionId === "custom"
                ? "Custom mix"
                : PROGRESSION_PRESETS[progressionId].label}
            </p>
            <div
              className={cn(
                "mt-4 grid gap-2",
                chords.length > 8 ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4",
              )}
            >
              {chords.map((chord, index) => (
                <label key={`${chord}-${index}`} className="block">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--music-muted)]">
                    Bar {index + 1}
                  </span>
                  <select
                    className="mt-1 w-full rounded-xl border border-[var(--music-line)] bg-[var(--music-inset)] px-2 py-2 text-sm"
                    value={chord}
                    onChange={(event) =>
                      updateCustomChord(index, event.target.value as RomanNumeral)
                    }
                  >
                    {ROMAN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
              Pad voice
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PAD_VOICE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPadVoiceId(id)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    padVoiceId === id
                      ? "border-[var(--music-accent)] bg-[var(--music-accent-soft)]"
                      : "border-[var(--music-line)] hover:border-[var(--music-accent)]",
                  )}
                >
                  <p className="text-sm font-semibold">{PAD_VOICES[id].label}</p>
                  <p className="mt-1 text-xs text-[var(--music-muted)]">
                    {PAD_VOICES[id].description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
              Drum beat · 4/4
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(DRUM_PATTERNS) as DrumPatternId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDrumPatternId(id)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    drumPatternId === id
                      ? "border-[var(--music-accent)] bg-[var(--music-accent-soft)]"
                      : "border-[var(--music-line)] hover:border-[var(--music-accent)]",
                  )}
                >
                  <p className="text-sm font-semibold">{DRUM_PATTERNS[id].label}</p>
                  <p className="mt-1 text-xs text-[var(--music-muted)]">
                    {DRUM_PATTERNS[id].description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
              Mic take
            </p>
            <p className="mt-2 text-sm text-[var(--music-muted)]">
              Hum a melody or record a riff. It stays local as reference and gets mentioned in the Polish prompt.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {mic.status === "recording" ? (
                <button
                  type="button"
                  onClick={mic.stopRecording}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#c45c4a] px-4 text-sm font-semibold text-white"
                >
                  <Square size={16} />
                  Stop · {(mic.elapsedMs / 1000).toFixed(1)}s
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mic.startRecording()}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--music-line)] bg-[var(--music-inset)] px-4 text-sm font-semibold transition hover:border-[var(--music-accent)]"
                >
                  <Mic size={16} />
                  Record
                </button>
              )}
              {mic.hasTake ? (
                <button
                  type="button"
                  onClick={mic.clearTake}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--music-line)] px-3 text-sm text-[var(--music-muted)]"
                >
                  <Trash2 size={15} />
                  Clear
                </button>
              ) : null}
            </div>
            {mic.status === "denied" ? (
              <p className="mt-3 text-xs text-[#c45c4a]">
                Mic permission denied — enable it in the browser to record a take.
              </p>
            ) : null}
            {mic.status === "unsupported" ? (
              <p className="mt-3 text-xs text-[#c45c4a]">
                This browser does not support mic recording.
              </p>
            ) : null}
            <AnimatePresence>
              {mic.audioUrl ? (
                <motion.audio
                  key={mic.audioUrl}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0 }}
                  controls
                  src={mic.audioUrl}
                  className="mt-4 w-full"
                />
              ) : null}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
              Extra notes
            </p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 240))}
              placeholder="e.g. warm Rhodes, slight swing, lo-fi hush"
              className="mt-3 min-h-24 w-full resize-y rounded-2xl border border-[var(--music-line)] bg-[var(--music-inset)] px-3 py-3 text-sm outline-none ring-[var(--music-accent)] focus:ring-1"
            />
            <label className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--music-muted)]">Loop length</span>
              <select
                value={bars}
                onChange={(event) => setBars(Number(event.target.value))}
                className="rounded-xl border border-[var(--music-line)] bg-[var(--music-inset)] px-3 py-2"
              >
                {[2, 4, 8, 12].map((value) => (
                  <option key={value} value={value}>
                    {value} bars
                  </option>
                ))}
              </select>
            </label>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="rounded-[28px] border border-[var(--music-accent)]/40 bg-[linear-gradient(160deg,rgba(212,160,23,0.16),rgba(18,28,24,0.92))] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
                  Prompt preview
                </p>
                <p className="mt-2 font-[family-name:var(--font-music-display)] text-lg">
                  {localLabel}
                </p>
              </div>
              <Sparkles className="mt-1 text-[var(--music-accent)]" size={18} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--music-ink)]/85">
              {stylePrompt}
            </p>
            <div className="mt-5 flex flex-wrap items-start gap-2">
              <button
                type="button"
                onClick={() => void toggleLocalLoop()}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--music-ink)] px-5 text-sm font-semibold text-[var(--music-bg)] transition hover:opacity-90"
              >
                {isLoopPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isLoopPlaying ? "Stop local loop" : "Play local loop"}
              </button>
              {isConvexConfigured && clientId ? (
                <MusicPolishControls
                  clientId={clientId}
                  params={params}
                  polishTrackId={polishTrackId}
                  isPolishing={isPolishing}
                  onPolishTrackId={setPolishTrackId}
                  onPolishingChange={setIsPolishing}
                  onAiAudioUrl={setAiAudioUrl}
                  onLocalStop={stopLocalLoop}
                />
              ) : (
                <button
                  type="button"
                  onClick={handlePolishFallback}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--music-accent)] bg-[var(--music-accent)] px-5 text-sm font-semibold text-[var(--music-accent-ink)]"
                >
                  <Sparkles size={16} />
                  Polish with ElevenLabs
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-[var(--music-muted)]">
              Default is instrumental only — no lyrics. Local loop works offline; Polish needs ElevenLabs API.
            </p>
          </motion.div>

          {aiAudioUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[28px] border border-[var(--music-line)] bg-[var(--music-panel)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
                  Polished loop
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[var(--music-muted)]"
                  onClick={() => {
                    setAiAudioUrl(null);
                    setPolishTrackId(null);
                  }}
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              </div>
              <audio
                ref={aiAudioRef}
                className="mt-3 w-full"
                controls
                autoPlay
                loop
                src={aiAudioUrl}
              />
            </motion.div>
          ) : null}
        </section>
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[rgba(10,14,12,0.9)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

export default function MusicStudio() {
  return (
    <div
      style={
        {
          "--music-bg": "#101612",
          "--music-ink": "#e8efe6",
          "--music-muted": "#8fa194",
          "--music-panel": "rgba(22, 30, 26, 0.88)",
          "--music-inset": "rgba(12, 18, 15, 0.9)",
          "--music-line": "rgba(232, 239, 230, 0.12)",
          "--music-accent": "#d4a017",
          "--music-accent-soft": "rgba(212, 160, 23, 0.18)",
          "--music-accent-ink": "#1a1406",
        } as CSSProperties
      }
    >
      <MusicStudioApp />
    </div>
  );
}
