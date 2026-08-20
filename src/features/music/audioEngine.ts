import {
  KEY_SEMITONE,
  MAX_TEMPO_BPM,
  MIN_TEMPO_BPM,
  ROMAN_INTERVALS,
} from "./config";
import { resolveChords } from "./prompt";
import type {
  BackingTrackParams,
  DrumPatternId,
  MusicKey,
  PadVoiceId,
  RomanNumeral,
  TransportState,
} from "./types";
import { audioBufferToWavBlob } from "./wav";

export const REFERENCE_RENDER_SECONDS = 30;

function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function clampTempo(tempoBpm: number) {
  return Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, Math.round(tempoBpm)));
}

function chordMidiNotes(key: MusicKey, roman: RomanNumeral) {
  const tonic = 48 + KEY_SEMITONE[key];
  const intervals = ROMAN_INTERVALS[roman];
  const notes = [
    tonic + intervals.root,
    tonic + intervals.third,
    tonic + intervals.fifth,
    tonic + intervals.root + 12,
  ];
  if (intervals.seventh != null) {
    notes.push(tonic + intervals.seventh);
  }
  return notes;
}

type ScheduledStop = {
  stop: (when?: number) => void;
};

type TransportListener = (state: TransportState) => void;

type AudioGraphContext = AudioContext | OfflineAudioContext;

function createNoiseBuffer(ctx: AudioGraphContext) {
  const length = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class BackingLoopEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padBus: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextBarTime = 0;
  private chordIndex = 0;
  private playing = false;
  private params: BackingTrackParams | null = null;
  private activeNodes: ScheduledStop[] = [];
  private transportListeners = new Set<TransportListener>();
  private transport: TransportState = {
    beat: 1,
    barIndex: 0,
    chord: "I",
    playing: false,
  };
  private pendingBeats: Array<{
    when: number;
    beat: 1 | 2 | 3 | 4;
    barIndex: number;
    chord: RomanNumeral;
  }> = [];

  get isPlaying() {
    return this.playing;
  }

  getTransport() {
    return this.transport;
  }

  subscribeTransport(listener: TransportListener) {
    this.transportListeners.add(listener);
    listener(this.transport);
    return () => {
      this.transportListeners.delete(listener);
    };
  }

  private emitTransport(next: TransportState) {
    this.transport = next;
    for (const listener of this.transportListeners) {
      listener(next);
    }
  }

  async ensureStarted() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.padBus = this.ctx.createGain();
      this.padBus.gain.value = 0.72;
      this.drumBus = this.ctx.createGain();
      this.drumBus.gain.value = 0.95;
      this.padBus.connect(this.master);
      this.drumBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  setParams(params: BackingTrackParams) {
    this.params = params;
  }

  /** Offline-render a short WAV preview for ElevenLabs conditioning. */
  async renderReferenceWav(
    params: BackingTrackParams,
    durationSec = REFERENCE_RENDER_SECONDS,
  ): Promise<Blob> {
    const sampleRate = 44100;
    const duration = Math.max(3, Math.min(30, durationSec));
    const offline = new OfflineAudioContext(
      2,
      Math.ceil(duration * sampleRate),
      sampleRate,
    );
    const master = offline.createGain();
    master.gain.value = 0.9;
    const padBus = offline.createGain();
    padBus.gain.value = 0.72;
    const drumBus = offline.createGain();
    drumBus.gain.value = 0.95;
    padBus.connect(master);
    drumBus.connect(master);
    master.connect(offline.destination);

    const noiseBuffer = createNoiseBuffer(offline);
    const secondsPerBar = (60 / clampTempo(params.tempoBpm)) * 4;
    let t = 0;
    let chordIndex = 0;
    while (t < duration - 0.05) {
      this.scheduleBarOnContext({
        ctx: offline,
        padBus,
        drumBus,
        noiseBuffer,
        start: t,
        params,
        barIndex: chordIndex,
        trackNodes: false,
      });
      t += secondsPerBar;
      chordIndex += 1;
    }

    const rendered = await offline.startRendering();
    return audioBufferToWavBlob(rendered);
  }

  async play(params: BackingTrackParams) {
    await this.ensureStarted();
    this.params = params;
    if (this.playing) return;
    this.playing = true;
    this.chordIndex = 0;
    this.pendingBeats = [];
    this.nextBarTime = (this.ctx?.currentTime ?? 0) + 0.05;
    this.emitTransport({
      beat: 1,
      barIndex: 0,
      chord: resolveChords(params)[0] ?? "I",
      playing: true,
    });
    this.scheduler();
  }

  stop() {
    this.playing = false;
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    const now = this.ctx?.currentTime ?? 0;
    for (const node of this.activeNodes) {
      try {
        node.stop(now);
      } catch {
        // already stopped
      }
    }
    this.activeNodes = [];
    this.pendingBeats = [];
    this.emitTransport({
      beat: 1,
      barIndex: 0,
      chord: this.params ? (resolveChords(this.params)[0] ?? "I") : "I",
      playing: false,
    });
  }

  async toggle(params: BackingTrackParams) {
    if (this.playing) {
      this.stop();
      return false;
    }
    await this.play(params);
    return true;
  }

  /** Jump transport back to bar 1; keep playing if it was already going. */
  async reset(params?: BackingTrackParams) {
    const next = params ?? this.params;
    const wasPlaying = this.playing;
    this.stop();
    if (wasPlaying && next) {
      await this.play(next);
    }
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.padBus = null;
    this.drumBus = null;
    this.noiseBuffer = null;
    this.transportListeners.clear();
  }

  private flushBeats() {
    if (!this.ctx || !this.playing) return;
    const now = this.ctx.currentTime;
    while (this.pendingBeats.length > 0 && this.pendingBeats[0]!.when <= now + 0.01) {
      const next = this.pendingBeats.shift()!;
      this.emitTransport({
        beat: next.beat,
        barIndex: next.barIndex,
        chord: next.chord,
        playing: true,
      });
    }
  }

  private scheduler() {
    if (!this.playing || !this.ctx || !this.params || !this.master) return;

    this.flushBeats();

    const lookAhead = 0.25;
    while (this.nextBarTime < this.ctx.currentTime + lookAhead) {
      this.scheduleBar(this.nextBarTime, this.params, this.chordIndex);
      const secondsPerBar = (60 / clampTempo(this.params.tempoBpm)) * 4;
      this.nextBarTime += secondsPerBar;
      const chords = resolveChords(this.params);
      this.chordIndex = (this.chordIndex + 1) % chords.length;
    }

    this.timer = window.setTimeout(() => this.scheduler(), 25);
  }

  private scheduleBar(start: number, params: BackingTrackParams, barIndex: number) {
    if (!this.ctx || !this.padBus || !this.drumBus || !this.noiseBuffer) return;
    const chords = resolveChords(params);
    const roman = chords[barIndex % chords.length] ?? "I";
    const beat = 60 / clampTempo(params.tempoBpm);

    for (let i = 0; i < 4; i += 1) {
      this.pendingBeats.push({
        when: start + i * beat,
        beat: (i + 1) as 1 | 2 | 3 | 4,
        barIndex,
        chord: roman,
      });
    }

    this.scheduleBarOnContext({
      ctx: this.ctx,
      padBus: this.padBus,
      drumBus: this.drumBus,
      noiseBuffer: this.noiseBuffer,
      start,
      params,
      barIndex,
      trackNodes: true,
    });
  }

  private scheduleBarOnContext(opts: {
    ctx: AudioGraphContext;
    padBus: GainNode;
    drumBus: GainNode;
    noiseBuffer: AudioBuffer;
    start: number;
    params: BackingTrackParams;
    barIndex: number;
    trackNodes: boolean;
  }) {
    const { ctx, padBus, drumBus, noiseBuffer, start, params, barIndex, trackNodes } =
      opts;
    const chords = resolveChords(params);
    const roman = chords[barIndex % chords.length] ?? "I";
    const beat = 60 / clampTempo(params.tempoBpm);
    const notes = chordMidiNotes(params.key, roman);

    for (const midi of notes) {
      this.schedulePadOn(
        ctx,
        padBus,
        start,
        beat * 4 * 0.95,
        midiToFreq(midi),
        params.padVoiceId,
        trackNodes,
      );
    }

    this.scheduleDrumsOn(
      ctx,
      drumBus,
      noiseBuffer,
      start,
      beat,
      params.drumPatternId,
      trackNodes,
    );
  }

  private pushNode(node: ScheduledStop, trackNodes: boolean) {
    if (trackNodes) this.activeNodes.push(node);
  }

  private schedulePadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    voice: PadVoiceId,
    trackNodes: boolean,
  ) {
    switch (voice) {
      case "warm":
        this.scheduleWarmPadOn(ctx, padBus, when, duration, freq, trackNodes);
        break;
      case "rhodes":
        this.scheduleRhodesPadOn(ctx, padBus, when, duration, freq, trackNodes);
        break;
      case "organ":
        this.scheduleOrganPadOn(ctx, padBus, when, duration, freq, trackNodes);
        break;
      case "softSaw":
        this.scheduleSoftSawPadOn(ctx, padBus, when, duration, freq, trackNodes);
        break;
      case "glass":
        this.scheduleGlassPadOn(ctx, padBus, when, duration, freq, trackNodes);
        break;
      default: {
        const _exhaustive: never = voice;
        return _exhaustive;
      }
    }
  }

  private scheduleWarmPadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    trackNodes: boolean,
  ) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.07, when + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.05, when + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.connect(padBus);

    for (const [type, ratio, level] of [
      ["sine", 1, 0.7],
      ["triangle", 1.002, 0.35],
      ["sine", 0.5, 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      const partial = ctx.createGain();
      partial.gain.value = level;
      osc.connect(partial);
      partial.connect(gain);
      osc.start(when);
      osc.stop(when + duration + 0.03);
      this.pushNode(osc, trackNodes);
    }
  }

  private scheduleRhodesPadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    trackNodes: boolean,
  ) {
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const carrier = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    modulator.type = "sine";
    carrier.type = "sine";
    modulator.frequency.value = freq * 2;
    carrier.frequency.value = freq;
    modGain.gain.setValueAtTime(freq * 1.8, when);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.2, when + 0.35);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, when);
    filter.frequency.exponentialRampToValueAtTime(900, when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.09, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.min(duration, 1.4));

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(padBus);

    modulator.start(when);
    carrier.start(when);
    modulator.stop(when + duration + 0.05);
    carrier.stop(when + duration + 0.05);
    this.pushNode(modulator, trackNodes);
    this.pushNode(carrier, trackNodes);
  }

  private scheduleOrganPadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    trackNodes: boolean,
  ) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.055, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.connect(padBus);

    for (const [ratio, level] of [
      [1, 0.55],
      [2, 0.35],
      [3, 0.18],
      [4, 0.1],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      const partial = ctx.createGain();
      partial.gain.value = level;
      osc.connect(partial);
      partial.connect(gain);
      osc.start(when);
      osc.stop(when + duration + 0.03);
      this.pushNode(osc, trackNodes);
    }
  }

  private scheduleSoftSawPadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    trackNodes: boolean,
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(900, when);
    filter.frequency.linearRampToValueAtTime(1400, when + 0.2);
    filter.frequency.linearRampToValueAtTime(700, when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.045, when + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(padBus);
    osc.start(when);
    osc.stop(when + duration + 0.03);
    this.pushNode(osc, trackNodes);
  }

  private scheduleGlassPadOn(
    ctx: AudioGraphContext,
    padBus: GainNode,
    when: number,
    duration: number,
    freq: number,
    trackNodes: boolean,
  ) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.06, when + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.connect(padBus);

    for (const [ratio, level, type] of [
      [1, 0.5, "sine"],
      [2.01, 0.22, "sine"],
      [3.01, 0.12, "triangle"],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      const partial = ctx.createGain();
      partial.gain.value = level;
      osc.connect(partial);
      partial.connect(gain);
      osc.start(when);
      osc.stop(when + duration + 0.03);
      this.pushNode(osc, trackNodes);
    }
  }

  private scheduleDrumsOn(
    ctx: AudioGraphContext,
    drumBus: GainNode,
    noiseBuffer: AudioBuffer,
    start: number,
    beat: number,
    pattern: DrumPatternId,
    trackNodes: boolean,
  ) {
    if (pattern === "none") return;

    const hits: Array<{ t: number; kind: "kick" | "snare" | "hat"; open?: boolean }> =
      [];

    switch (pattern) {
      case "fourFloor":
        for (let i = 0; i < 4; i += 1) hits.push({ t: i * beat, kind: "kick" });
        for (let i = 0; i < 8; i += 1) hits.push({ t: i * (beat / 2), kind: "hat" });
        hits.push({ t: 2 * beat, kind: "snare" });
        break;
      case "softPop":
        hits.push({ t: 0, kind: "kick" }, { t: 2 * beat, kind: "kick" });
        hits.push({ t: beat, kind: "snare" }, { t: 3 * beat, kind: "snare" });
        for (let i = 0; i < 8; i += 1) hits.push({ t: i * (beat / 2), kind: "hat" });
        break;
      case "rockBasic":
        hits.push({ t: 0, kind: "kick" }, { t: 2.5 * beat, kind: "kick" });
        hits.push({ t: beat, kind: "snare" }, { t: 3 * beat, kind: "snare" });
        for (let i = 0; i < 8; i += 1) {
          hits.push({ t: i * (beat / 2), kind: "hat", open: i % 4 === 3 });
        }
        break;
      case "boomBap":
        hits.push({ t: 0, kind: "kick" }, { t: 2.25 * beat, kind: "kick" });
        hits.push({ t: beat, kind: "snare" }, { t: 3 * beat, kind: "snare" });
        for (let i = 0; i < 8; i += 1) {
          const swing = i % 2 === 1 ? beat * 0.04 : 0;
          hits.push({ t: i * (beat / 2) + swing, kind: "hat" });
        }
        break;
      default: {
        const _exhaustive: never = pattern;
        return _exhaustive;
      }
    }

    for (const hit of hits) {
      if (hit.kind === "kick") {
        this.scheduleKickOn(ctx, drumBus, start + hit.t, trackNodes);
      }
      if (hit.kind === "snare") {
        this.scheduleSnareOn(ctx, drumBus, noiseBuffer, start + hit.t, trackNodes);
      }
      if (hit.kind === "hat") {
        this.scheduleHatOn(
          ctx,
          drumBus,
          noiseBuffer,
          start + hit.t,
          hit.open ?? false,
          trackNodes,
        );
      }
    }
  }

  private scheduleKickOn(
    ctx: AudioGraphContext,
    drumBus: GainNode,
    when: number,
    trackNodes: boolean,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.12);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.55, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    osc.connect(gain);
    gain.connect(drumBus);
    osc.start(when);
    osc.stop(when + 0.3);
    this.pushNode(osc, trackNodes);
  }

  private scheduleSnareOn(
    ctx: AudioGraphContext,
    drumBus: GainNode,
    noiseBuffer: AudioBuffer,
    when: number,
    trackNodes: boolean,
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.28, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(drumBus);
    noise.start(when);
    noise.stop(when + 0.18);
    this.pushNode(noise, trackNodes);
  }

  private scheduleHatOn(
    ctx: AudioGraphContext,
    drumBus: GainNode,
    noiseBuffer: AudioBuffer,
    when: number,
    open: boolean,
    trackNodes: boolean,
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    const dur = open ? 0.18 : 0.05;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(open ? 0.12 : 0.07, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(drumBus);
    noise.start(when);
    noise.stop(when + dur + 0.02);
    this.pushNode(noise, trackNodes);
  }
}
