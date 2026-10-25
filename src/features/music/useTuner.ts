"use client";

import { useEffect, useRef, useState } from "react";

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

export function frequencyToNote(freq: number) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  return {
    name: NOTE_NAMES[((rounded % 12) + 12) % 12]!,
    octave: Math.floor(rounded / 12) - 1,
    cents: Math.round((midi - rounded) * 100),
    midi: rounded,
  };
}

/**
 * YIN pitch detection (de Cheveigné & Kawahara) with parabolic interpolation.
 * Far more stable than plain autocorrelation on guitar and voice.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number, threshold = 0.12) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) rms += buffer[i]! * buffer[i]!;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return null;

  const half = Math.floor(buffer.length / 2);
  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(half - 1, Math.floor(sampleRate / 55));
  const diff = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const delta = buffer[i]! - buffer[i + lag]!;
      sum += delta * delta;
    }
    diff[lag] = sum;
  }

  // Cumulative mean normalised difference.
  let running = 0;
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    running += diff[lag]!;
    cmnd[lag] = running === 0 ? 1 : (diff[lag]! * lag) / running;
  }

  let tau = -1;
  for (let lag = Math.max(2, minLag); lag <= maxLag; lag += 1) {
    if (cmnd[lag]! < threshold) {
      while (lag + 1 <= maxLag && cmnd[lag + 1]! < cmnd[lag]!) lag += 1;
      tau = lag;
      break;
    }
  }
  if (tau < 0) return null;

  const prev = cmnd[tau - 1] ?? cmnd[tau]!;
  const next = cmnd[tau + 1] ?? cmnd[tau]!;
  const denom = 2 * (2 * cmnd[tau]! - prev - next);
  const shift = denom === 0 ? 0 : (next - prev) / denom;
  return sampleRate / (tau + shift);
}

export type TunerReading = {
  hz: number | null;
  note: string;
  octave: number | null;
  cents: number;
  error: string | null;
  listening: boolean;
};

export function useTuner(active: boolean): TunerReading {
  const [reading, setReading] = useState<TunerReading>({
    hz: null,
    note: "—",
    octave: null,
    cents: 0,
    error: null,
    listening: false,
  });
  const recent = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf: number | null = null;
    let lastHeard = 0;
    let smoothedCents = 0;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setReading((r) => ({ ...r, error: "Mic isn't available in this browser." }));
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        setReading((r) => ({ ...r, error: null, listening: true }));

        let frame = 0;
        const tick = () => {
          frame += 1;
          // ~30 analyses per second is plenty and spares phone batteries.
          if (frame % 2 === 0 && ctx) {
            analyser.getFloatTimeDomainData(buffer);
            const hz = detectPitch(buffer, ctx.sampleRate);
            const now = performance.now();
            if (hz && hz > 50 && hz < 1500) {
              lastHeard = now;
              recent.current = [...recent.current.slice(-4), hz];
              const sorted = [...recent.current].sort((a, b) => a - b);
              const median = sorted[Math.floor(sorted.length / 2)]!;
              const note = frequencyToNote(median);
              smoothedCents = smoothedCents * 0.6 + note.cents * 0.4;
              setReading({
                hz: median,
                note: note.name,
                octave: note.octave,
                cents: Math.round(smoothedCents),
                error: null,
                listening: true,
              });
            } else if (now - lastHeard > 1200 && lastHeard !== 0) {
              lastHeard = 0;
              recent.current = [];
              setReading((r) => ({ ...r, hz: null }));
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setReading((r) => ({ ...r, error: "Allow microphone access to use the tuner." }));
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close().catch(() => undefined);
      recent.current = [];
      setReading({ hz: null, note: "—", octave: null, cents: 0, error: null, listening: false });
    };
  }, [active]);

  return reading;
}
