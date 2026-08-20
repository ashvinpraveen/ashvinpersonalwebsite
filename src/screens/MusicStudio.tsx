"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import {
  AudioLines,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import MusicPicker from "@/features/music/MusicPicker";
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
import { useTapTempo } from "@/features/music/useTapTempo";
import { isConvexConfigured, isMusicEnabled } from "@/lib/features";
import { pageShellClassName } from "@/lib/layout";
import { card } from "@/lib/styles";
import {
  cuttingMatGridDark,
  cuttingMatGridLight,
  grainSvg,
} from "@/lib/visuals";
import { cn } from "@/lib/utils";

const MusicPolishControls = dynamic(
  () => import("@/features/music/MusicPolishControls"),
  { ssr: false },
);

const PRESET_IDS = Object.keys(PROGRESSION_PRESETS) as Array<
  Exclude<ProgressionPresetId, "custom">
>;

const PAD_VOICE_IDS = Object.keys(PAD_VOICES) as PadVoiceId[];

const panelClass = cn(card, "border-0 shadow-none");
const choiceClass =
  "rounded-2xl px-3 py-3 text-left transition-colors bg-background/60 hover:bg-accent/70";
const choiceActiveClass = "bg-foreground text-background hover:bg-foreground";
const chipClass =
  "h-10 min-w-10 rounded-full px-3 text-sm transition-colors bg-background/70 hover:bg-accent/70";
const chipActiveClass = "bg-foreground text-background hover:bg-foreground";

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
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);
  const [progressionPickerOpen, setProgressionPickerOpen] = useState(false);
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

  const { tempoBpm, setTempo, tap, tapCount, resetTaps } = useTapTempo(DEFAULT_TEMPO_BPM);
  const engineRef = useRef<BackingLoopEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
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
      notes,
    }),
    [
      bars,
      customChords,
      drumPatternId,
      key,
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

  const resetBeat = useCallback(() => {
    resetTaps();
    void (async () => {
      const engine = engineRef.current;
      if (!engine) return;
      await engine.reset(params);
      setIsLoopPlaying(engine.isPlaying);
    })();
  }, [params, resetTaps]);

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
    setEngineReady(true);
    const unsubscribe = engine.subscribeTransport(setTransport);
    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
      setEngineReady(false);
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
      aiAudioRef.current.loop = false;
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
    setProgressionPickerOpen(false);
  }

  function updateCustomChord(index: number, value: RomanNumeral) {
    const base = resolveChords(params);
    setProgressionId("custom");
    setCustomChords(base.map((chord, i) => (i === index ? value : chord)));
  }

  if (!isMusicEnabled) {
    return (
      <div className="music-studio grid min-h-dvh place-items-center px-6">
        <div className={cn(panelClass, "max-w-md")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Music studio
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Backing tracks are off
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Set NEXT_PUBLIC_ENABLE_MUSIC=true to turn this page back on.
          </p>
          <Link href="/" className="mt-5 inline-block text-sm text-link underline-offset-4 hover:underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const chords = resolveChords(params);
  const progressionLabel =
    progressionId === "custom"
      ? "Custom mix"
      : PROGRESSION_PRESETS[progressionId].shortLabel;
  const progressionDetail =
    progressionId === "custom"
      ? `${chords.length} bars · edit below`
      : PROGRESSION_PRESETS[progressionId].label;

  return (
    <div className="music-studio relative min-h-dvh overflow-hidden text-foreground">
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridLight, backgroundPosition: "right top" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        aria-hidden="true"
        style={{ backgroundImage: cuttingMatGridDark, backgroundPosition: "right top" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-50"
        aria-hidden="true"
        style={{
          backgroundImage: grainSvg,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <header
        className={cn(
          pageShellClassName,
          "relative flex items-center justify-between gap-3 pb-2 pt-[max(1rem,env(safe-area-inset-top))]",
          tunerOpen ? "z-30" : "z-10",
        )}
      >
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground/[0.08] px-3 text-sm transition-colors hover:bg-foreground/[0.12]"
        >
          <span aria-hidden="true">↩</span>
          <span className="hidden sm:inline">Ashvin</span>
        </Link>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            ashvinpraveen.com/music
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Backing Track
          </h1>
        </div>
        <div className="relative z-30 flex w-10 justify-end sm:w-[4.5rem]">
          <button
            type="button"
            onClick={() => setTunerOpen((open) => !open)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              tunerOpen
                ? "bg-foreground text-background"
                : "bg-foreground/[0.08] text-muted-foreground hover:bg-foreground/[0.12] hover:text-foreground",
            )}
            aria-label={tunerOpen ? "Close tuner" : "Open tuner"}
            aria-expanded={tunerOpen}
          >
            <AudioLines size={18} />
          </button>
          <MusicTunerPanel open={tunerOpen} onClose={() => setTunerOpen(false)} />
        </div>
      </header>

      <main className={cn(pageShellClassName, "relative z-10 grid gap-4 pb-28 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5")}>
        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Tempo
                </p>
                <p className="mt-1 text-5xl font-bold tabular-nums leading-none tracking-tight">
                  {tempoBpm}
                  <span className="ml-2 text-base font-medium text-muted-foreground">
                    BPM
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={tap}
                className="music-tap flex h-24 w-24 flex-col items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition active:scale-95"
              >
                Tap
                {tapCount > 0 ? (
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-wider opacity-70">
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
              <BeatMeter transport={transport} onReset={resetBeat} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MusicPicker
                label="Key"
                value={key}
                open={keyPickerOpen}
                onOpenChange={setKeyPickerOpen}
                title="Choose key"
                description="Keys stay fixed for the loop — change between takes."
              >
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {KEYS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setKey(option);
                        setKeyPickerOpen(false);
                      }}
                      className={cn(
                        chipClass,
                        key === option && chipActiveClass,
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </MusicPicker>

              <MusicPicker
                label="Chord progression"
                value={progressionLabel}
                detail={progressionDetail}
                open={progressionPickerOpen}
                onOpenChange={setProgressionPickerOpen}
                title="Chord progression"
                description="Pick a preset, or mix your own bar by bar."
              >
                <div className="space-y-2">
                  {PRESET_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectProgression(id)}
                      className={cn(
                        "flex w-full flex-col rounded-2xl px-3 py-3 text-left transition-colors",
                        progressionId === id
                          ? choiceActiveClass
                          : "bg-muted/50 hover:bg-accent/70",
                      )}
                    >
                      <span className="text-sm font-semibold">
                        {PROGRESSION_PRESETS[id].shortLabel}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 text-xs",
                          progressionId === id
                            ? "text-background/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {PROGRESSION_PRESETS[id].label}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => selectProgression("custom")}
                    className={cn(
                      "flex w-full flex-col rounded-2xl px-3 py-3 text-left transition-colors",
                      progressionId === "custom"
                        ? choiceActiveClass
                        : "bg-muted/50 hover:bg-accent/70",
                    )}
                  >
                    <span className="text-sm font-semibold">Mix your own</span>
                    <span
                      className={cn(
                        "mt-0.5 text-xs",
                        progressionId === "custom"
                          ? "text-background/70"
                          : "text-muted-foreground",
                      )}
                    >
                      Edit each bar after closing this panel
                    </span>
                  </button>
                </div>
              </MusicPicker>
            </div>

            {progressionId === "custom" ? (
              <div
                className={cn(
                  "mt-4 grid gap-2",
                  chords.length > 8 ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4",
                )}
              >
                {chords.map((chord, index) => (
                  <label key={`${chord}-${index}`} className="block">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Bar {index + 1}
                    </span>
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-sm outline-none ring-foreground focus:ring-1"
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
            ) : (
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {chords.join(" · ")}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Pad voice
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PAD_VOICE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPadVoiceId(id)}
                  className={cn(choiceClass, padVoiceId === id && choiceActiveClass)}
                >
                  <p className="text-sm font-semibold">{PAD_VOICES[id].label}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      padVoiceId === id ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {PAD_VOICES[id].description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Drum beat · 4/4
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(DRUM_PATTERNS) as DrumPatternId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDrumPatternId(id)}
                  className={cn(choiceClass, drumPatternId === id && choiceActiveClass)}
                >
                  <p className="text-sm font-semibold">{DRUM_PATTERNS[id].label}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      drumPatternId === id
                        ? "text-background/70"
                        : "text-muted-foreground",
                    )}
                  >
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
            transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Extra notes
            </p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 240))}
              placeholder="e.g. warm Rhodes, slight swing, lo-fi hush"
              className="mt-3 min-h-24 w-full resize-y rounded-2xl border border-border bg-background/70 px-3 py-3 text-sm outline-none ring-foreground focus:ring-1"
            />
            <label className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Loop length</span>
              <select
                value={bars}
                onChange={(event) => setBars(Number(event.target.value))}
                className="rounded-xl border border-border bg-background px-3 py-2"
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
            transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(panelClass, "bg-[hsl(var(--selection)/0.22)]")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Prompt preview
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{localLabel}</p>
              </div>
              <Sparkles className="mt-1 text-link" size={18} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {stylePrompt}
            </p>
            <div className="mt-5 flex flex-wrap items-start gap-2">
              <button
                type="button"
                onClick={() => void toggleLocalLoop()}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90"
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
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground/[0.08] px-5 text-sm font-medium transition-colors hover:bg-foreground/[0.12]"
                >
                  <Sparkles size={16} />
                  Polish with ElevenLabs
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Polish asks ElevenLabs for a ~2 min professional instrumental take from your settings — not a clone of the local synth loop.
            </p>
          </motion.div>

          {aiAudioUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={panelClass}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Polished take · ~2 min
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
                src={aiAudioUrl}
              />
            </motion.div>
          ) : null}
        </section>
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[hsl(35,30%,90%)] to-transparent dark:from-[hsl(30,15%,12%)]"
        aria-hidden="true"
      />
    </div>
  );
}

export default function MusicStudio() {
  return <MusicStudioApp />;
}
