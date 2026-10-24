import { mod12, type Chord } from "../../../convex/lib/musicTheory";
import {
  DRUM_LANES,
  grooveFor,
  type BassEvent,
  type CompEvent,
  type DrumGrid,
  type Groove,
  type VoiceId,
} from "./grooves";
import { CHANNELS, type Channel, type JamState, type Mix } from "./jam";
import {
  applyMix,
  buildGraph,
  midiToFreq,
  playBass,
  playClick,
  playDrum,
  playKeys,
  type Ctx,
  type Graph,
} from "./synth";
import { bassMidi, voiceProgression } from "./voicing";
import { audioBufferToWavBlob, silentWavBlob } from "./wav";

export type SongPlan = {
  tempo: number;
  tonic: number;
  chords: Chord[];
  voicings: number[][];
  swing: Groove["swing"];
  bass: BassEvent[];
  comp: CompEvent[];
  drums: DrumGrid;
  voice: VoiceId;
  click: boolean;
};

export type Position = {
  playing: boolean;
  /** Beat of the count-in bar (1–4), or 0 when not counting in. */
  countIn: number;
  bar: number;
  /** 16th-note step inside the bar, -1 before the first step lands. */
  step: number;
  loop: number;
};

const STOPPED: Position = { playing: false, countIn: 0, bar: 0, step: -1, loop: 0 };

export function buildPlan(jam: JamState): SongPlan {
  const groove = grooveFor(jam.styleId);
  return {
    tempo: jam.tempo,
    tonic: jam.tonic,
    chords: jam.chords,
    voicings: voiceProgression(jam.chords, jam.tonic),
    swing: groove.swing,
    bass: groove.bass,
    comp: groove.comp,
    drums: jam.drums,
    voice: jam.voice,
    click: jam.click,
  };
}

/** Delay (seconds) that swing adds to a 16th step. */
export function swingOffset(step: number, swing: Groove["swing"], stepDur: number) {
  const amount = swing.amount;
  if (Math.abs(amount - 0.5) < 0.001) return 0;
  if (swing.grid === 16) {
    return step % 2 === 1 ? (amount - 0.5) * 2 * stepDur : 0;
  }
  const p = (step % 4) / 4;
  const mapped = p <= 0.5 ? p * 2 * amount : amount + (p - 0.5) * 2 * (1 - amount);
  return (mapped - p) * 4 * stepDur;
}

function scheduleStep(
  ctx: Ctx,
  out: Record<Channel, AudioNode>,
  plan: SongPlan,
  bar: number,
  step: number,
  time: number,
  stepDur: number,
) {
  const count = plan.chords.length;
  if (count === 0) return;
  const index = bar % count;
  const chord = plan.chords[index]!;
  const next = plan.chords[(index + 1) % count]!;

  for (const lane of DRUM_LANES) {
    const hit = plan.drums[lane][step];
    if (hit === "x" || hit === "o") {
      // Tiny humanised velocity wobble keeps loops from sounding robotic.
      const velocity = (hit === "x" ? 1 : 0.38) * (0.92 + Math.random() * 0.08);
      playDrum(ctx, out.drums, lane, time, velocity);
    }
  }

  for (const event of plan.bass) {
    if (event.s !== step) continue;
    playBass(
      ctx,
      out.bass,
      bassMidi(event.n, chord, next, plan.tonic),
      time,
      event.l * stepDur,
      event.v ?? 0.9,
    );
  }

  const voicing = plan.voicings[index];
  if (voicing) {
    for (const event of plan.comp) {
      if (event.s !== step) continue;
      playKeys(ctx, out.keys, plan.voice, voicing, time, event.l * stepDur, event.v ?? 0.85);
    }
  }

  if (plan.click && step % 4 === 0) {
    playClick(ctx, out.click, time, step === 0);
  }
}

type Listener = () => void;

function createClock(onTick: () => void) {
  // A worker timer keeps ticking when the tab is in the background, where
  // main-thread timers get throttled to once a second.
  try {
    const source = "let id=null;onmessage=(e)=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}";
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = onTick;
    return {
      start: () => worker.postMessage(25),
      stop: () => worker.postMessage(0),
      dispose: () => worker.terminate(),
    };
  } catch {
    let id: number | null = null;
    return {
      start: () => {
        if (id == null) id = window.setInterval(onTick, 25);
      },
      stop: () => {
        if (id != null) window.clearInterval(id);
        id = null;
      },
      dispose: () => {
        if (id != null) window.clearInterval(id);
        id = null;
      },
    };
  }
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export class JamEngine {
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private cue: GainNode | null = null;
  private session: Record<Channel, GainNode> | null = null;
  private plan: SongPlan | null = null;
  private mix: Mix | null = null;
  private clock: ReturnType<typeof createClock> | null = null;
  private raf: number | null = null;
  private nextGridTime = 0;
  private bar = 0;
  private step = 0;
  private loop = 0;
  private countInSteps = 0;
  private queue: Array<{ time: number; position: Position }> = [];
  private position: Position = STOPPED;
  private listeners = new Set<Listener>();
  private drone: { stop: () => void } | null = null;
  private silentAudio: HTMLAudioElement | null = null;
  private silentUrl: string | null = null;
  private starting = false;

  get isPlaying() {
    return this.position.playing;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getPosition = () => this.position;

  private emit(position: Position) {
    this.position = position;
    for (const listener of this.listeners) listener();
  }

  setPlan(plan: SongPlan) {
    this.plan = plan;
    if (this.bar >= plan.chords.length) this.bar = 0;
  }

  setMix(mix: Mix) {
    this.mix = mix;
    if (this.ctx && this.graph) applyMix(this.ctx, this.graph, mix);
  }

  private async ensureContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: "interactive" });
      this.graph = buildGraph(this.ctx, this.ctx.destination);
      this.cue = this.ctx.createGain();
      this.cue.gain.value = 0.8;
      this.cue.connect(this.graph.master);
      if (this.mix) applyMix(this.ctx, this.graph, this.mix, false);
    }
    if (this.ctx.state !== "running") {
      await this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  /** iOS: play through the silent switch and keep the audio session alive. */
  private unlockMediaPlayback() {
    const nav = navigator as AudioSessionNavigator;
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      // Not supported.
    }
    if (!this.silentAudio) {
      this.silentUrl = URL.createObjectURL(silentWavBlob(1));
      this.silentAudio = new Audio(this.silentUrl);
      this.silentAudio.loop = true;
      this.silentAudio.setAttribute("playsinline", "");
    }
    void this.silentAudio.play().catch(() => undefined);
  }

  async play(options: { countIn: boolean }) {
    if (this.position.playing || this.starting || !this.plan) return;
    this.starting = true;
    // Kick off the silent element synchronously inside the user gesture.
    this.unlockMediaPlayback();
    const ctx = await this.ensureContext().finally(() => {
      this.starting = false;
    });
    if (!this.graph || this.position.playing) return;

    const session = {} as Record<Channel, GainNode>;
    for (const name of CHANNELS) {
      session[name] = ctx.createGain();
      session[name].connect(this.graph.input[name]);
    }
    this.session = session;
    this.bar = 0;
    this.step = 0;
    this.loop = 0;
    this.countInSteps = options.countIn ? 16 : 0;
    this.queue = [];
    this.nextGridTime = ctx.currentTime + 0.08;
    this.emit({ playing: true, countIn: 0, bar: 0, step: -1, loop: 0 });

    if (!this.clock) this.clock = createClock(() => this.tick());
    this.clock.start();
    this.tick();
    this.startFrames();
  }

  stop() {
    if (!this.position.playing) return;
    this.clock?.stop();
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.queue = [];
    const session = this.session;
    this.session = null;
    if (session && this.ctx) {
      const now = this.ctx.currentTime;
      for (const name of CHANNELS) {
        session[name].gain.setTargetAtTime(0, now, 0.015);
      }
      window.setTimeout(() => {
        for (const name of CHANNELS) session[name].disconnect();
      }, 400);
    }
    this.silentAudio?.pause();
    this.emit(STOPPED);
  }

  async toggle(options: { countIn: boolean }) {
    if (this.position.playing) {
      this.stop();
      return false;
    }
    await this.play(options);
    return true;
  }

  private tick() {
    const ctx = this.ctx;
    const plan = this.plan;
    if (!ctx || !plan || !this.session || !this.position.playing) return;
    const ahead = typeof document !== "undefined" && document.hidden ? 1.2 : 0.12;
    if (this.nextGridTime < ctx.currentTime - 0.25) {
      // We stalled (tab suspended, device asleep). Pick up from now.
      this.nextGridTime = ctx.currentTime + 0.05;
    }
    while (this.nextGridTime < ctx.currentTime + ahead) {
      this.scheduleNext(ctx, plan, this.session);
    }
    this.flush();
  }

  private scheduleNext(ctx: AudioContext, plan: SongPlan, session: Record<Channel, GainNode>) {
    const stepDur = 60 / plan.tempo / 4;
    const time = this.nextGridTime + swingOffset(this.step, plan.swing, stepDur);

    if (this.countInSteps > 0) {
      if (this.step % 4 === 0 && this.cue) {
        playClick(ctx, this.cue, time, this.step === 0);
        this.queue.push({
          time,
          position: { playing: true, countIn: this.step / 4 + 1, bar: 0, step: -1, loop: 0 },
        });
      }
      this.countInSteps -= 1;
      this.step = (this.step + 1) % 16;
      this.nextGridTime += stepDur;
      return;
    }

    if (this.bar >= plan.chords.length) this.bar = 0;
    scheduleStep(ctx, session, plan, this.bar, this.step, time, stepDur);
    this.queue.push({
      time,
      position: { playing: true, countIn: 0, bar: this.bar, step: this.step, loop: this.loop },
    });

    this.step += 1;
    if (this.step >= 16) {
      this.step = 0;
      this.bar += 1;
      if (this.bar >= plan.chords.length) {
        this.bar = 0;
        this.loop += 1;
      }
    }
    this.nextGridTime += stepDur;
  }

  private flush() {
    const ctx = this.ctx;
    if (!ctx) return;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    const now = ctx.currentTime - latency;
    let latest: Position | null = null;
    while (this.queue.length > 0 && this.queue[0]!.time <= now) {
      latest = this.queue.shift()!.position;
    }
    if (latest && this.position.playing) this.emit(latest);
  }

  private startFrames() {
    const frame = () => {
      if (!this.position.playing) return;
      this.flush();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Strum a chord so people hear what they picked. */
  async audition(chord: Chord, tonic: number, voice: VoiceId, voicing: number[]) {
    const ctx = await this.ensureContext();
    if (!this.graph) return;
    const when = ctx.currentTime + 0.02;
    voicing.forEach((midi, i) => {
      playKeys(ctx, this.graph!.input.keys, voice, [midi], when + i * 0.025, 0.9, 0.9);
    });
    playBass(ctx, this.graph.input.bass, bassMidi(0, chord, chord, tonic), when, 0.9, 0.8);
  }

  /** Sustained reference tone for tuning / singing. Pass null to stop. */
  async setDrone(pitchClass: number | null) {
    this.drone?.stop();
    this.drone = null;
    if (pitchClass == null) return;
    const ctx = await this.ensureContext();
    if (!this.cue) return;
    const amp = ctx.createGain();
    const now = ctx.currentTime;
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.22, now + 0.3);
    amp.connect(this.cue);
    const base = 48 + mod12(pitchClass);
    const oscs = [base, base + 12, base + 7 + 12].map((midi, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = midiToFreq(midi);
      g.gain.value = [0.6, 0.35, 0.12][i]!;
      osc.connect(g);
      g.connect(amp);
      osc.start(now);
      return osc;
    });
    this.drone = {
      stop: () => {
        const t = ctx.currentTime;
        amp.gain.cancelScheduledValues(t);
        amp.gain.setTargetAtTime(0.0001, t, 0.08);
        for (const osc of oscs) osc.stop(t + 0.5);
      },
    };
  }

  dispose() {
    this.stop();
    this.drone?.stop();
    this.clock?.dispose();
    this.clock = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.graph = null;
    if (this.silentUrl) URL.revokeObjectURL(this.silentUrl);
    this.silentAudio = null;
    this.listeners.clear();
  }
}

export const MAX_EXPORT_SECONDS = 150;

export function loopSeconds(plan: Pick<SongPlan, "tempo" | "chords">) {
  return (60 / plan.tempo) * 4 * plan.chords.length;
}

/**
 * Render whole loops offline and fold the reverb tail back onto the start,
 * so the WAV loops seamlessly in any DAW or looper.
 */
export async function renderLoopWav(plan: SongPlan, mix: Mix, loops: number) {
  const sampleRate = 44100;
  const oneLoop = loopSeconds(plan);
  const count = Math.max(1, Math.min(loops, Math.floor(MAX_EXPORT_SECONDS / oneLoop) || 1));
  const body = oneLoop * count;
  const tail = 2.8;
  const offline = new OfflineAudioContext(2, Math.ceil((body + tail) * sampleRate), sampleRate);
  const graph = buildGraph(offline, offline.destination);
  applyMix(offline, graph, mix, false);
  const exportPlan: SongPlan = { ...plan, click: false };
  const stepDur = 60 / plan.tempo / 4;
  const totalSteps = count * plan.chords.length * 16;
  for (let i = 0; i < totalSteps; i += 1) {
    const step = i % 16;
    const bar = Math.floor(i / 16) % plan.chords.length;
    const time = i * stepDur + swingOffset(step, plan.swing, stepDur) + 0.001;
    scheduleStep(offline, graph.input, exportPlan, bar, step, time, stepDur);
  }
  const rendered = await offline.startRendering();

  const bodyLength = Math.round(body * sampleRate);
  const output = new AudioBuffer({ length: bodyLength, numberOfChannels: 2, sampleRate });
  let peak = 0;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < 2; ch += 1) {
    const source = rendered.getChannelData(ch);
    const data = new Float32Array(bodyLength);
    data.set(source.subarray(0, bodyLength));
    for (let i = bodyLength; i < source.length; i += 1) {
      data[(i - bodyLength) % bodyLength] += source[i]!;
    }
    for (let i = 0; i < bodyLength; i += 1) peak = Math.max(peak, Math.abs(data[i]!));
    channels.push(data);
  }
  const scale = peak > 0.97 ? 0.97 / peak : 1;
  channels.forEach((data, ch) => {
    if (scale !== 1) for (let i = 0; i < data.length; i += 1) data[i]! *= scale;
    output.copyToChannel(data, ch);
  });
  return { blob: audioBufferToWavBlob(output), loops: count, seconds: body };
}
