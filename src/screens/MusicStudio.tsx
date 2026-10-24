"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { AudioLines, Dices, Minus, Pause, Play, Plus, Share2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { notify } from "@/features/music/notify";
import {
  chordName,
  clampTempo,
  findProgression,
  keyName,
  progressionsForMode,
  type Chord,
  type Mode,
} from "../../convex/lib/musicTheory";
import ChordChart from "@/features/music/ChordChart";
import ChordEditor from "@/features/music/ChordEditor";
import {
  JamEngine,
  buildPlan,
  loopSeconds,
  renderLoopWav,
  type SongPlan,
} from "@/features/music/engine";
import GroovePanel from "@/features/music/GroovePanel";
import { grooveFor } from "@/features/music/grooves";
import {
  applyProgression,
  applyStyle,
  decodeJam,
  defaultJam,
  encodeJam,
  setChords,
  surpriseJam,
  type JamState,
} from "@/features/music/jam";
import {
  getOrCreateMusicClientId,
  readJamDraft,
  writeJamDraft,
} from "@/features/music/browser";
import KeySheet from "@/features/music/KeySheet";
import MixPanel, { type ExportChoice } from "@/features/music/MixPanel";
import Stage from "@/features/music/Stage";
import TempoPanel from "@/features/music/TempoPanel";
import TunerSheet from "@/features/music/TunerSheet";
import { Label } from "@/features/music/ui";
import { panelClass, usePosition } from "@/features/music/usePosition";
import { useTapTempo } from "@/features/music/useTapTempo";
import { isConvexConfigured, isMusicEnabled } from "@/lib/features";
import { cuttingMatGridDark, cuttingMatGridLight } from "@/lib/visuals";
import { cn } from "@/lib/utils";

const StudioTakes = dynamic(() => import("@/features/music/StudioTakes"), { ssr: false });

type Tab = "groove" | "tempo" | "mix";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "groove", label: "Groove" },
  { id: "tempo", label: "Tempo" },
  { id: "mix", label: "Mix & export" },
];

type WakeLockSentinelLike = { release: () => Promise<void> };

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    Boolean(target.closest("[role=dialog]"))
  );
}

function exportChoices(plan: SongPlan): ExportChoice[] {
  const seconds = loopSeconds(plan);
  const fit = Math.max(1, Math.round(120 / seconds));
  const fmt = (s: number) => (s < 60 ? `${Math.round(s)}s` : `${Math.round(s / 6) / 10} min`);
  return [
    { id: "one", label: `1 loop · ${fmt(seconds)}`, loops: 1 },
    { id: "four", label: `4 loops · ${fmt(seconds * 4)}`, loops: 4 },
    { id: "long", label: `~2 min`, loops: fit },
  ];
}

function MusicStudioApp() {
  const [jam, setJam] = useState<JamState>(defaultJam);
  const [ready, setReady] = useState(false);
  const [clientId, setClientId] = useState("");
  const [engine, setEngine] = useState<JamEngine | null>(null);
  const [tab, setTab] = useState<Tab>("groove");
  const [editing, setEditing] = useState<number | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [droneOn, setDroneOn] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const position = usePosition(engine);
  const playing = position.playing;
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const plan = useMemo(() => buildPlan(jam), [jam]);
  const groove = grooveFor(jam.styleId);

  const update = useCallback((patch: Partial<JamState> | ((jam: JamState) => JamState)) => {
    setJam((current) => (typeof patch === "function" ? patch(current) : { ...current, ...patch }));
  }, []);

  const setTempo = useCallback(
    (bpm: number) => update((current) => ({ ...current, tempo: clampTempo(bpm) })),
    [update],
  );
  const { tap, tapCount } = useTapTempo(setTempo);

  // Boot: shared link > saved draft > defaults. Engine lives for the page's lifetime.
  useEffect(() => {
    setClientId(getOrCreateMusicClientId());
    const draft = readJamDraft();
    const base = draft ?? defaultJam();
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("jam");
    const decoded = shared ? decodeJam(shared, base) : null;
    setJam(decoded ?? base);
    if (shared) {
      if (decoded) notify.success("Loaded a shared jam 🎶", { description: "Hit play to hear it." });
      params.delete("jam");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
    setReady(true);

    const instance = new JamEngine();
    setEngine(instance);
    return () => instance.dispose();
  }, []);

  useEffect(() => {
    engine?.setPlan(plan);
  }, [engine, plan]);

  useEffect(() => {
    engine?.setMix(jam.mix);
  }, [engine, jam.mix]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => writeJamDraft(jam), 250);
    return () => window.clearTimeout(id);
  }, [jam, ready]);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    void engine.toggle({ countIn: jam.countIn });
  }, [engine, jam.countIn]);

  // Speed trainer: bump the tempo every N completed loops.
  const jamRef = useRef(jam);
  jamRef.current = jam;
  useEffect(() => {
    if (!engine) return;
    let lastLoop = 0;
    return engine.subscribe(() => {
      const pos = engine.getPosition();
      if (!pos.playing) {
        lastLoop = 0;
        return;
      }
      if (pos.loop === lastLoop) return;
      lastLoop = pos.loop;
      const { trainer, tempo } = jamRef.current;
      if (!trainer.enabled || pos.loop % trainer.every !== 0 || tempo >= trainer.target) return;
      const next = Math.min(trainer.target, tempo + trainer.step);
      setJam((current) => ({ ...current, tempo: next }));
      notify.message(`Speed trainer → ${next} BPM`, { duration: 1500 });
    });
  }, [engine]);

  // Lock screen / headphone controls and keep the screen awake while jamming.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.playbackState = playing ? "playing" : "paused";
    if (playing && typeof MediaMetadata !== "undefined") {
      session.metadata = new MediaMetadata({
        title: jam.chords.map((ch) => chordName(ch, jam.tonic, jam.mode)).join(" · "),
        artist: `${keyName(jam.tonic, jam.mode)} · ${groove.name} · ${jam.tempo} BPM`,
        album: "Jam Room",
      });
    }
    const handlers: Array<[MediaSessionAction, () => void]> = [
      ["play", () => void engine?.play({ countIn: false })],
      ["pause", () => engine?.stop()],
      ["stop", () => engine?.stop()],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action.
      }
    }
  }, [engine, groove.name, jam.chords, jam.mode, jam.tempo, jam.tonic, playing]);

  useEffect(() => {
    if (!playing) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
        };
        if (nav.wakeLock && document.visibilityState === "visible") {
          const next = await nav.wakeLock.request("screen");
          if (cancelled) void next.release();
          else lock = next;
        }
      } catch {
        // Battery saver or unsupported.
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [playing]);

  // Keyboard: space play/stop, T tap, arrows nudge tempo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "t" || event.key === "T") {
        tap();
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        update((current) => ({ ...current, tempo: clampTempo(current.tempo + (event.shiftKey ? 5 : 1)) }));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        update((current) => ({ ...current, tempo: clampTempo(current.tempo - (event.shiftKey ? 5 : 1)) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap, togglePlay, update]);

  useEffect(() => {
    void engine?.setDrone(droneOn && tunerOpen ? jam.tonic : null);
  }, [droneOn, engine, jam.tonic, tunerOpen]);

  function changeKey(tonic: number, mode: Mode) {
    update((current) => {
      const preset = current.progressionId ? findProgression(current.progressionId) : null;
      // Presets follow the mode so "A minor" actually sounds minor.
      if (preset && preset.mode !== mode) {
        return applyProgression({ ...current, tonic }, progressionsForMode(mode)[0]!.id);
      }
      return { ...current, tonic, mode };
    });
  }

  function changeChords(chords: Chord[], focus?: number | null) {
    update((current) => setChords(current, chords));
    if (focus !== undefined) setEditing(focus);
  }

  function addBar() {
    const last = jam.chords[jam.chords.length - 1]!;
    update((current) => setChords(current, [...current.chords, { ...last }]));
    setEditing(jam.chords.length);
  }

  async function share() {
    const url = `${window.location.origin}/music?jam=${encodeJam(jam)}`;
    const title = `${keyName(jam.tonic, jam.mode)} ${groove.name} jam`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, text: "Jam along with me 🎸", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify.success("Jam link copied", { description: "Anyone who opens it gets this exact setup." });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify.error("Couldn't share the link.");
    }
  }

  async function exportWav(choice: ExportChoice) {
    try {
      setExporting(choice.id);
      const result = await renderLoopWav(plan, jam.mix, choice.loops);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug(`${keyName(jam.tonic, jam.mode)} ${groove.name} ${jam.tempo}bpm`)}.wav`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      notify.success(`Exported ${result.loops} loop${result.loops > 1 ? "s" : ""}`, {
        description: `${Math.round(result.seconds)} seconds, loops seamlessly.`,
      });
    } catch {
      notify.error("Export failed on this browser.");
    } finally {
      setExporting(null);
    }
  }

  function surprise() {
    update((current) => surpriseJam(current));
  }

  if (!isMusicEnabled) {
    return (
      <div className="music-studio grid min-h-dvh place-items-center px-6">
        <div className={cn(panelClass, "max-w-md")}>
          <Label>Jam Room</Label>
          <h1 className="mt-2 text-2xl tracking-tight">The jam room is closed</h1>
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

  const progression = jam.progressionId ? findProgression(jam.progressionId) : null;

  return (
    <div
      className="music-studio relative overflow-x-clip text-foreground"
      style={{ "--jam-hue": groove.hue } as CSSProperties}
    >
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

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-2 pt-[max(0.9rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground/[0.07] px-3 text-sm transition-colors hover:bg-foreground/[0.12]"
          aria-label="Back to ashvinpraveen.com"
        >
          <span aria-hidden="true">↩</span>
          <span className="hidden sm:inline">Ashvin</span>
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">Jam Room</h1>
          <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
            a pocket band to practise with
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void share()}
            className="grid h-10 w-10 place-items-center rounded-full bg-foreground/[0.07] text-muted-foreground transition-colors hover:bg-foreground/[0.12] hover:text-foreground"
            aria-label="Share this jam"
          >
            <Share2 size={17} />
          </button>
          <button
            type="button"
            onClick={() => setTunerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-foreground/[0.07] text-muted-foreground transition-colors hover:bg-foreground/[0.12] hover:text-foreground"
            aria-label="Open tuner"
          >
            <AudioLines size={17} />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-4 px-4 pb-36 pt-2 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Stage
              jam={jam}
              engine={engine}
              onOpenKey={() => setKeyOpen(true)}
              onOpenGroove={() => {
                setTab("groove");
                controlsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={panelClass}
            aria-label="Chord chart"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setKeyOpen(true)}
                className="min-w-0 rounded-xl text-left transition-opacity hover:opacity-75"
              >
                <Label>Progression</Label>
                <p className="truncate text-base font-semibold">
                  {progression ? progression.name : "Your own changes"}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    · {jam.chords.length} bar{jam.chords.length > 1 ? "s" : ""}
                  </span>
                </p>
              </button>
              <button
                type="button"
                onClick={surprise}
                className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.07] px-3.5 text-sm font-medium transition-colors hover:bg-foreground/[0.12]"
              >
                <Dices size={16} className="transition-transform duration-300 group-hover:rotate-180 group-active:rotate-[360deg]" />
                Surprise me
              </button>
            </div>
            <ChordChart jam={jam} engine={engine} onEdit={setEditing} onAdd={addBar} />
          </motion.section>
        </div>

        <motion.section
          ref={controlsRef}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className={cn(panelClass, "min-w-0 scroll-mt-4")}
        >
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-background/70 p-1" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative h-10 rounded-full text-sm font-medium transition-colors",
                  tab === item.id ? "text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === item.id ? (
                  <motion.span
                    layoutId="jam-tab"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                ) : null}
                <span className="relative">{item.label}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === "groove" ? (
              <GroovePanel
                jam={jam}
                engine={engine}
                onStyle={(id) => update((current) => applyStyle(current, id))}
                onVoice={(voice) => update({ voice })}
                onDrums={(drums) => update({ drums, drumsEdited: true })}
                onResetDrums={() =>
                  update((current) => ({
                    ...current,
                    drums: { ...grooveFor(current.styleId).drums },
                    drumsEdited: false,
                  }))
                }
              />
            ) : tab === "tempo" ? (
              <TempoPanel
                jam={jam}
                tapCount={tapCount}
                onTap={tap}
                onTempo={setTempo}
                onCountIn={(countIn) => update({ countIn })}
                onClick={(click) => update({ click })}
                onTrainer={(trainer) => update({ trainer })}
              />
            ) : (
              <MixPanel
                mix={jam.mix}
                onMix={(mix) => update({ mix })}
                exportChoices={exportChoices(plan)}
                exporting={exporting}
                onExport={(choice) => void exportWav(choice)}
                studio={
                  isConvexConfigured ? (
                    <StudioTakes
                      clientId={clientId}
                      jam={jam}
                      onNotes={(notes) => update({ notes })}
                      onListen={() => engine?.stop()}
                    />
                  ) : null
                }
              />
            )}
          </div>
        </motion.section>
      </main>

      <TransportBar
        playing={playing}
        tempo={jam.tempo}
        tapCount={tapCount}
        onToggle={togglePlay}
        onTap={tap}
        onTempo={setTempo}
      />

      <ChordEditor
        jam={jam}
        index={editing}
        onClose={() => setEditing(null)}
        onChange={changeChords}
        onAudition={(chord) => {
          if (!engine || playing) return;
          void engine.audition(chord, jam.tonic, jam.voice, buildPlan({ ...jam, chords: [chord] }).voicings[0]!);
        }}
      />
      <KeySheet
        open={keyOpen}
        onOpenChange={setKeyOpen}
        jam={jam}
        onKey={changeKey}
        onProgression={(id) => update((current) => applyProgression(current, id))}
      />
      <TunerSheet
        open={tunerOpen}
        onOpenChange={(open) => {
          setTunerOpen(open);
          if (!open) setDroneOn(false);
        }}
        tonic={jam.tonic}
        mode={jam.mode}
        droneOn={droneOn}
        onDrone={setDroneOn}
      />
    </div>
  );
}

function TransportBar({
  playing,
  tempo,
  tapCount,
  onToggle,
  onTap,
  onTempo,
}: {
  playing: boolean;
  tempo: number;
  tapCount: number;
  onToggle: () => void;
  onTap: () => void;
  onTempo: (bpm: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full border border-foreground/10 bg-background/80 p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onTap}
          className="h-12 shrink-0 rounded-full bg-foreground/[0.07] px-4 text-sm font-semibold transition-[background-color,transform] hover:bg-foreground/[0.12] active:scale-90"
          aria-label="Tap tempo"
        >
          Tap
          {tapCount > 1 ? <span className="ml-1 font-mono text-[10px] text-muted-foreground">×{tapCount}</span> : null}
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => onTempo(tempo - 1)}
            className="grid h-10 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Slower"
          >
            <Minus size={16} />
          </button>
          <p className="w-14 text-center leading-none">
            <span className="block font-display text-2xl tabular-nums tracking-tight">{tempo}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">bpm</span>
          </p>
          <button
            type="button"
            onClick={() => onTempo(tempo + 1)}
            className="grid h-10 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Faster"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={onToggle}
          data-playing={playing}
          className="jam-play grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[hsl(var(--jam-hue)_75%_45%)] text-white transition-[transform,background-color] duration-300 active:scale-90"
          aria-label={playing ? "Stop (space)" : "Play (space)"}
        >
          {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>
    </div>
  );
}

export default function MusicStudio() {
  return <MusicStudioApp />;
}
