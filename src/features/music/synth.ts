import type { DrumLane, VoiceId } from "./grooves";
import { CHANNELS, type Channel, type Mix } from "./jam";

export type Ctx = BaseAudioContext;

const noiseCache = new WeakMap<Ctx, AudioBuffer>();
const impulseCache = new WeakMap<Ctx, AudioBuffer>();

export function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function noiseBuffer(ctx: Ctx) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    const length = Math.floor(ctx.sampleRate * 1);
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

function reverbImpulse(ctx: Ctx) {
  let buffer = impulseCache.get(ctx);
  if (!buffer) {
    const seconds = 2.6;
    const length = Math.floor(ctx.sampleRate * seconds);
    buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      const preDelay = Math.floor(ctx.sampleRate * 0.012);
      for (let i = preDelay; i < length; i += 1) {
        const t = (i - preDelay) / length;
        data[i] = (Math.random() * 2 - 1) * (1 - t) ** 3.2 * 0.7;
      }
    }
    impulseCache.set(ctx, buffer);
  }
  return buffer;
}

/** Envelope helper: attack to `peak`, then exponential decay toward silence by `end`. */
function envelope(
  param: AudioParam,
  when: number,
  peak: number,
  attack: number,
  end: number,
  sustain?: { level: number; until: number },
) {
  param.setValueAtTime(0.0001, when);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  if (sustain) {
    param.exponentialRampToValueAtTime(Math.max(0.0002, sustain.level), sustain.until);
  }
  param.exponentialRampToValueAtTime(0.0001, end);
}

// ---------- Mixer graph ----------

export type Graph = {
  input: Record<Channel, GainNode>;
  channel: Record<Channel, GainNode>;
  send: Record<Channel, GainNode>;
  master: GainNode;
};

const SEND_WEIGHT: Record<Channel, number> = {
  drums: 0.18,
  bass: 0.03,
  keys: 0.55,
  click: 0,
};

export function buildGraph(ctx: Ctx, destination: AudioNode): Graph {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.006;
  comp.release.value = 0.18;

  const master = ctx.createGain();
  master.gain.value = 0.9;
  comp.connect(master);
  master.connect(destination);

  const convolver = ctx.createConvolver();
  convolver.buffer = reverbImpulse(ctx);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.9;
  convolver.connect(reverbReturn);
  reverbReturn.connect(comp);

  const input = {} as Record<Channel, GainNode>;
  const channel = {} as Record<Channel, GainNode>;
  const send = {} as Record<Channel, GainNode>;
  for (const name of CHANNELS) {
    input[name] = ctx.createGain();
    channel[name] = ctx.createGain();
    send[name] = ctx.createGain();
    input[name].connect(channel[name]);
    channel[name].connect(comp);
    channel[name].connect(send[name]);
    send[name].connect(convolver);
  }
  return { input, channel, send, master };
}

export function applyMix(ctx: Ctx, graph: Graph, mix: Mix, smooth = true) {
  const now = ctx.currentTime;
  for (const name of CHANNELS) {
    const { level, muted } = mix[name];
    // Perceptual-ish fader curve.
    const gain = muted ? 0 : level ** 1.6 * 1.15;
    const sendGain = SEND_WEIGHT[name] * mix.space;
    if (smooth) {
      graph.channel[name].gain.setTargetAtTime(gain, now, 0.03);
      graph.send[name].gain.setTargetAtTime(sendGain, now, 0.05);
    } else {
      graph.channel[name].gain.value = gain;
      graph.send[name].gain.value = sendGain;
    }
  }
}

// ---------- Keys ----------

export function playKeys(
  ctx: Ctx,
  out: AudioNode,
  voice: VoiceId,
  notes: number[],
  when: number,
  duration: number,
  velocity: number,
) {
  const level = (0.32 / Math.sqrt(Math.max(1, notes.length))) * velocity;
  for (const midi of notes) {
    const freq = midiToFreq(midi);
    switch (voice) {
      case "epiano":
        ePiano(ctx, out, freq, when, duration, level);
        break;
      case "piano":
        piano(ctx, out, freq, when, duration, level);
        break;
      case "organ":
        organ(ctx, out, freq, when, duration, level);
        break;
      case "pad":
        pad(ctx, out, freq, when, duration, level);
        break;
      case "pluck":
        pluck(ctx, out, freq, when, duration, level);
        break;
      default: {
        const exhaustive: never = voice;
        return exhaustive;
      }
    }
  }
}

function ePiano(ctx: Ctx, out: AudioNode, freq: number, when: number, dur: number, level: number) {
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  const amp = ctx.createGain();
  const tine = ctx.createOscillator();
  const tineGain = ctx.createGain();
  const end = when + Math.max(0.25, dur) + 0.35;

  carrier.frequency.value = freq;
  modulator.frequency.value = freq;
  modGain.gain.setValueAtTime(freq * 1.4, when);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.15, when + 0.6);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  tine.frequency.value = freq * 4;
  envelope(tineGain.gain, when, level * 0.18, 0.003, when + 0.25);
  tine.connect(tineGain);
  tineGain.connect(out);

  envelope(amp.gain, when, level, 0.006, end, {
    level: level * 0.45,
    until: when + Math.max(0.2, dur),
  });
  carrier.connect(amp);
  amp.connect(out);

  for (const osc of [carrier, modulator, tine]) {
    osc.start(when);
    osc.stop(end + 0.05);
  }
}

function piano(ctx: Ctx, out: AudioNode, freq: number, when: number, dur: number, level: number) {
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const end = when + Math.max(0.3, dur) + 0.25;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(9000, freq * 9), when);
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2), when + 1.2);
  envelope(amp.gain, when, level * 1.1, 0.004, end, {
    level: level * 0.35,
    until: when + Math.max(0.25, dur),
  });
  filter.connect(amp);
  amp.connect(out);
  for (const [ratio, gain, type] of [
    [1, 0.6, "triangle"],
    [2.001, 0.25, "sine"],
    [3.003, 0.12, "sine"],
    [1.0015, 0.3, "sawtooth"],
  ] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq * ratio;
    g.gain.value = type === "sawtooth" ? gain * 0.25 : gain;
    osc.connect(g);
    g.connect(filter);
    osc.start(when);
    osc.stop(end + 0.05);
  }
}

function organ(ctx: Ctx, out: AudioNode, freq: number, when: number, dur: number, level: number) {
  const amp = ctx.createGain();
  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  const end = when + Math.max(0.12, dur) + 0.06;
  vibrato.frequency.value = 6.2;
  vibratoDepth.gain.value = freq * 0.003;
  vibrato.connect(vibratoDepth);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(level * 0.8, when + 0.012);
  amp.gain.setValueAtTime(level * 0.8, Math.max(when + 0.013, end - 0.05));
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  amp.connect(out);
  const oscs: OscillatorNode[] = [vibrato];
  for (const [ratio, gain] of [
    [0.5, 0.45],
    [1, 0.6],
    [2, 0.4],
    [3, 0.2],
    [4, 0.12],
  ] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq * ratio;
    vibratoDepth.connect(osc.frequency);
    g.gain.value = gain;
    osc.connect(g);
    g.connect(amp);
    oscs.push(osc);
  }
  for (const osc of oscs) {
    osc.start(when);
    osc.stop(end + 0.05);
  }
}

function pad(ctx: Ctx, out: AudioNode, freq: number, when: number, dur: number, level: number) {
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const hold = Math.max(0.4, dur);
  const end = when + hold + 0.9;
  filter.type = "lowpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(500, when);
  filter.frequency.linearRampToValueAtTime(2200, when + hold * 0.5);
  filter.frequency.linearRampToValueAtTime(900, end);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(level * 0.75, when + Math.min(0.5, hold * 0.4));
  amp.gain.setValueAtTime(level * 0.75, when + hold);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  filter.connect(amp);
  amp.connect(out);
  for (const detune of [-9, 0, 8]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.value = 0.32;
    osc.connect(g);
    g.connect(filter);
    osc.start(when);
    osc.stop(end + 0.05);
  }
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.frequency.value = freq;
  subGain.gain.value = 0.4;
  sub.connect(subGain);
  subGain.connect(amp);
  sub.start(when);
  sub.stop(end + 0.05);
}

function pluck(ctx: Ctx, out: AudioNode, freq: number, when: number, dur: number, level: number) {
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const end = when + Math.min(1.2, Math.max(0.18, dur * 1.3));
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(Math.min(8000, freq * 10), when);
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), when + 0.25);
  envelope(amp.gain, when, level * 1.1, 0.002, end);
  filter.connect(amp);
  amp.connect(out);
  for (const [type, ratio, gain] of [
    ["sawtooth", 1, 0.45],
    ["square", 1.003, 0.2],
  ] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq * ratio;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(filter);
    osc.start(when);
    osc.stop(end + 0.05);
  }
}

// ---------- Bass ----------

export function playBass(
  ctx: Ctx,
  out: AudioNode,
  midi: number,
  when: number,
  duration: number,
  velocity: number,
) {
  const freq = midiToFreq(midi);
  const level = 0.42 * velocity;
  const hold = Math.max(0.08, duration * 0.92);
  const end = when + hold + 0.08;
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(freq * 9, when);
  filter.frequency.exponentialRampToValueAtTime(freq * 2.5, when + 0.18);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(level, when + 0.008);
  amp.gain.exponentialRampToValueAtTime(level * 0.6, when + hold);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  filter.connect(amp);
  amp.connect(out);

  const saw = ctx.createOscillator();
  const sawGain = ctx.createGain();
  saw.type = "sawtooth";
  saw.frequency.value = freq;
  sawGain.gain.value = 0.35;
  saw.connect(sawGain);
  sawGain.connect(filter);

  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.value = freq;
  subGain.gain.value = 0.9;
  sub.connect(subGain);
  subGain.connect(amp);

  for (const osc of [saw, sub]) {
    osc.start(when);
    osc.stop(end + 0.05);
  }
}

// ---------- Drums ----------

export function playDrum(ctx: Ctx, out: AudioNode, lane: DrumLane, when: number, velocity: number) {
  switch (lane) {
    case "kick":
      return kick(ctx, out, when, velocity);
    case "snare":
      return snare(ctx, out, when, velocity);
    case "rim":
      return rim(ctx, out, when, velocity);
    case "hat":
      return metal(ctx, out, when, velocity * 0.55, 0.05, 7500);
    case "open":
      return metal(ctx, out, when, velocity * 0.5, 0.32, 7000);
    case "ride":
      return metal(ctx, out, when, velocity * 0.4, 0.55, 5200, 1.35);
    default: {
      const exhaustive: never = lane;
      return exhaustive;
    }
  }
}

function kick(ctx: Ctx, out: AudioNode, when: number, velocity: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.frequency.setValueAtTime(160, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.09);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.35);
  envelope(amp.gain, when, 0.95 * velocity, 0.002, when + 0.42);
  osc.connect(amp);
  amp.connect(out);
  osc.start(when);
  osc.stop(when + 0.45);

  // Beater click.
  const click = ctx.createBufferSource();
  click.buffer = noiseBuffer(ctx);
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = "highpass";
  clickFilter.frequency.value = 2500;
  const clickAmp = ctx.createGain();
  envelope(clickAmp.gain, when, 0.18 * velocity, 0.001, when + 0.012);
  click.connect(clickFilter);
  clickFilter.connect(clickAmp);
  clickAmp.connect(out);
  click.start(when, Math.random() * 0.5);
  click.stop(when + 0.02);
}

function snare(ctx: Ctx, out: AudioNode, when: number, velocity: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "highpass";
  band.frequency.value = 1200;
  const noiseAmp = ctx.createGain();
  envelope(noiseAmp.gain, when, 0.45 * velocity, 0.002, when + 0.2);
  noise.connect(band);
  band.connect(noiseAmp);
  noiseAmp.connect(out);
  noise.start(when, Math.random() * 0.5);
  noise.stop(when + 0.22);

  const body = ctx.createOscillator();
  const bodyAmp = ctx.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(240, when);
  body.frequency.exponentialRampToValueAtTime(170, when + 0.08);
  envelope(bodyAmp.gain, when, 0.35 * velocity, 0.002, when + 0.11);
  body.connect(bodyAmp);
  bodyAmp.connect(out);
  body.start(when);
  body.stop(when + 0.13);
}

function rim(ctx: Ctx, out: AudioNode, when: number, velocity: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 1700;
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 4;
  envelope(amp.gain, when, 0.35 * velocity, 0.001, when + 0.035);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  osc.start(when);
  osc.stop(when + 0.05);
}

const METAL_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];

/** 808-style cymbal: six detuned squares through band/high-pass filters. */
function metal(
  ctx: Ctx,
  out: AudioNode,
  when: number,
  velocity: number,
  decay: number,
  cutoff: number,
  pitch = 1,
) {
  const base = 40 * pitch;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 10000;
  band.Q.value = 0.8;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = cutoff;
  const amp = ctx.createGain();
  envelope(amp.gain, when, 0.28 * velocity, 0.001, when + decay);
  band.connect(high);
  high.connect(amp);
  amp.connect(out);
  for (const ratio of METAL_RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = base * ratio;
    osc.connect(band);
    osc.start(when);
    osc.stop(when + decay + 0.02);
  }
}

// ---------- Click ----------

export function playClick(ctx: Ctx, out: AudioNode, when: number, accent: boolean) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = accent ? 1760 : 1320;
  envelope(amp.gain, when, accent ? 0.5 : 0.32, 0.001, when + 0.04);
  osc.connect(amp);
  amp.connect(out);
  osc.start(when);
  osc.stop(when + 0.05);
}
