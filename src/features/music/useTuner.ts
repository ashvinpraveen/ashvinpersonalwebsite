"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

function frequencyToNote(freq: number) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12]!;
  const octave = Math.floor(rounded / 12) - 1;
  return { name: `${name}${octave}`, cents, midi: rounded };
}

/** Autocorrelation pitch estimate for monophonic mic input. */
function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const value = buffer[i]!;
    rms += value * value;
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return null;

  const maxLag = Math.floor(sampleRate / 70);
  const minLag = Math.floor(sampleRate / 1000);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let lastCorrelation = 1;

  for (let offset = minLag; offset <= maxLag; offset += 1) {
    let correlation = 0;
    for (let i = 0; i < buffer.length - offset; i += 1) {
      correlation += buffer[i]! * buffer[i + offset]!;
    }
    correlation /= buffer.length - offset;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      // keep rising
    } else if (bestOffset > 0 && correlation <= lastCorrelation) {
      break;
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation < 0.01 || bestOffset <= 0) return null;
  return sampleRate / bestOffset;
}

export function useTuner(active: boolean) {
  const [hz, setHz] = useState<number | null>(null);
  const [note, setNote] = useState<string>("—");
  const [cents, setCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setHz(null);
    setNote("—");
    setCents(0);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Mic unavailable in this browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        setError(null);

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);
          const detected = detectPitch(buffer, ctx.sampleRate);
          if (detected && detected > 60 && detected < 1500) {
            const mapped = frequencyToNote(detected);
            setHz(detected);
            setNote(mapped.name);
            setCents(mapped.cents);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("Allow mic access to use the tuner.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, stop]);

  return { hz, note, cents, error };
}
