import { describe, expect, it } from "vitest";
import {
  computeSplitDurations,
  distanceMeters,
  formatDistance,
  formatDuration,
  formatPace,
  pathDistanceMeters,
  samplePath,
} from "./geo";

describe("run-club geo", () => {
  it("measures short haversine distances", () => {
    const meters = distanceMeters(
      { lat: 3.1489, lng: 101.6854 },
      { lat: 3.1498, lng: 101.6832 },
    );
    expect(meters).toBeGreaterThan(200);
    expect(meters).toBeLessThan(400);
  });

  it("sums a path and samples it", () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      { lat: 0, lng: 0.02 },
      { lat: 0, lng: 0.03 },
      { lat: 0, lng: 0.04 },
    ];
    expect(pathDistanceMeters(path)).toBeGreaterThan(pathDistanceMeters(path.slice(0, 2)));
    const sampled = samplePath(path, 3);
    expect(sampled).toHaveLength(3);
    expect(sampled[0]).toEqual(path[0]);
    expect(sampled[2]).toEqual(path[4]);
  });

  it("formats distance, duration, and pace", () => {
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(2450)).toBe("2.45 km");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatPace(1000, 360_000)).toBe("6:00 /km");
  });

  it("computes km split durations from a straight path", () => {
    const points = [
      { lat: 0, lng: 0, recordedAt: 0 },
      { lat: 0, lng: 0.0045, recordedAt: 180_000 },
      { lat: 0, lng: 0.009, recordedAt: 360_000 },
      { lat: 0, lng: 0.0135, recordedAt: 540_000 },
    ];
    const splits = computeSplitDurations(points, 540_000);
    expect(splits.length).toBeGreaterThanOrEqual(1);
    expect(splits[0]).toBeGreaterThan(100_000);
  });
});
