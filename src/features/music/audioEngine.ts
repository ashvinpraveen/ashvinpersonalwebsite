import {
  KEY_SEMITONE,
  MAX_TEMPO_BPM,
  MIN_TEMPO_BPM,
  ROMAN_INTERVALS,
} from "./config";
import { resolveChords } from "./prompt";
import type { BackingTrackParams, DrumPatternId, MusicKey, RomanNumeral } from "./types";

function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function clampTempo(tempoBpm: number) {
  return Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, Math.round(tempoBpm)));
}

function chordMidiNotes(key: MusicKey, roman: RomanNumeral) {
  const tonic = 48 + KEY_SEMITONE[key]; // C3-ish base
  const intervals = ROMAN_INTERVALS[roman];
  return [
    tonic + intervals.root,
    tonic + intervals.third,
    tonic + intervals.fifth,
    tonic + intervals.root + 12,
  ];
}

type ScheduledStop = {
  stop: (when?: number) => void;
};

function createNoiseBuffer(ctx: AudioContext) {
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
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextBarTime = 0;
  private chordIndex = 0;
  private playing = false;
  private params: BackingTrackParams | null = null;
  private activeNodes: ScheduledStop[] = [];

  get isPlaying() {
    return this.playing;
  }

  async ensureStarted() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
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

  async play(params: BackingTrackParams) {
    await this.ensureStarted();
    this.params = params;
    if (this.playing) return;
    this.playing = true;
    this.chordIndex = 0;
    this.nextBarTime = (this.ctx?.currentTime ?? 0) + 0.05;
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
  }

  async toggle(params: BackingTrackParams) {
    if (this.playing) {
      this.stop();
      return false;
    }
    await this.play(params);
    return true;
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  private scheduler() {
    if (!this.playing || !this.ctx || !this.params || !this.master) return;

    const lookAhead = 0.2;
    while (this.nextBarTime < this.ctx.currentTime + lookAhead) {
      this.scheduleBar(this.nextBarTime, this.params);
      const secondsPerBar = (60 / clampTempo(this.params.tempoBpm)) * 4;
      this.nextBarTime += secondsPerBar;
      const chords = resolveChords(this.params);
      this.chordIndex = (this.chordIndex + 1) % chords.length;
    }

    this.timer = window.setTimeout(() => this.scheduler(), 40);
  }

  private scheduleBar(start: number, params: BackingTrackParams) {
    if (!this.ctx || !this.master) return;
    const chords = resolveChords(params);
    const roman = chords[this.chordIndex] ?? "I";
    const beat = 60 / clampTempo(params.tempoBpm);
    const notes = chordMidiNotes(params.key, roman);

    for (const midi of notes) {
      this.schedulePad(start, beat * 4 * 0.92, midiToFreq(midi));
    }

    this.scheduleDrums(start, beat, params.drumPatternId);
  }

  private schedulePad(when: number, duration: number, freq: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.08, when + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
    this.activeNodes.push(osc);
  }

  private scheduleDrums(start: number, beat: number, pattern: DrumPatternId) {
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
      if (hit.kind === "kick") this.scheduleKick(start + hit.t);
      if (hit.kind === "snare") this.scheduleSnare(start + hit.t);
      if (hit.kind === "hat") this.scheduleHat(start + hit.t, hit.open ?? false);
    }
  }

  private scheduleKick(when: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.12);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.55, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(when);
    osc.stop(when + 0.3);
    this.activeNodes.push(osc);
  }

  private scheduleSnare(when: number) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.28, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(when);
    noise.stop(when + 0.18);
    this.activeNodes.push(noise);
  }

  private scheduleHat(when: number, open: boolean) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    const dur = open ? 0.18 : 0.05;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(open ? 0.12 : 0.07, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(when);
    noise.stop(when + dur + 0.02);
    this.activeNodes.push(noise);
  }
}
