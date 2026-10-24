import { describe, expect, it } from "vitest";
import { detectPitch, frequencyToNote } from "./useTuner";

function tone(freq: number, sampleRate = 48000, size = 4096) {
  const buffer = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const t = i / sampleRate;
    // Guitar-ish: strong harmonics that fool naive autocorrelation.
    buffer[i] =
      0.4 * Math.sin(2 * Math.PI * freq * t) +
      0.3 * Math.sin(2 * Math.PI * freq * 2 * t) +
      0.2 * Math.sin(2 * Math.PI * freq * 3 * t);
  }
  return buffer;
}

describe("tuner pitch detection", () => {
  it.each([
    [82.41, "E", 2],
    [110, "A", 2],
    [196, "G", 3],
    [329.63, "E", 4],
    [440, "A", 4],
  ])("hears %f Hz as %s%i", (freq, name, octave) => {
    const hz = detectPitch(tone(freq), 48000);
    expect(hz).not.toBeNull();
    expect(Math.abs(hz! - freq) / freq).toBeLessThan(0.005);
    const note = frequencyToNote(hz!);
    expect(note.name).toBe(name);
    expect(note.octave).toBe(octave);
  });

  it("reports cents when slightly sharp", () => {
    const hz = detectPitch(tone(440 * 2 ** (20 / 1200)), 48000)!;
    expect(frequencyToNote(hz).cents).toBeGreaterThanOrEqual(17);
    expect(frequencyToNote(hz).cents).toBeLessThanOrEqual(23);
  });

  it("ignores silence", () => {
    expect(detectPitch(new Float32Array(4096), 48000)).toBeNull();
  });
});
