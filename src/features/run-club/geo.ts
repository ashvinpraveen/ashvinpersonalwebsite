import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistanceMeters(points: LatLng[]) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distanceMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Keep first/last points and evenly sample the middle to a max count. */
export function samplePath(points: LatLng[], maxPoints: number): LatLng[] {
  const toPoint = (point: LatLng): LatLng => ({ lat: point.lat, lng: point.lng });
  if (points.length <= maxPoints) return points.map(toPoint);
  if (maxPoints < 2) return [toPoint(points[0])];

  const sampled: LatLng[] = [toPoint(points[0])];
  const middleSlots = maxPoints - 2;
  for (let i = 1; i <= middleSlots; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (middleSlots + 1));
    sampled.push(toPoint(points[index]));
  }
  sampled.push(toPoint(points[points.length - 1]));
  return sampled;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPace(meters: number, durationMs: number) {
  if (meters < 50 || durationMs <= 0) return "—";
  const minutesPerKm = durationMs / 60_000 / (meters / 1000);
  if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0 || minutesPerKm > 60) {
    return "—";
  }
  const whole = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - whole) * 60);
  return `${whole}:${String(seconds).padStart(2, "0")} /km`;
}

/** Cumulative km-split durations in ms along a timed path. */
export function computeSplitDurations(
  points: Array<LatLng & { recordedAt?: number }>,
  totalDurationMs: number,
): number[] {
  if (points.length < 2 || totalDurationMs <= 0) return [];

  const hasTimestamps = points.every(
    (point) => typeof point.recordedAt === "number" && Number.isFinite(point.recordedAt),
  );

  const splits: number[] = [];
  let segmentStartMs = hasTimestamps ? (points[0].recordedAt as number) : 0;
  let carried = 0;

  for (let i = 1; i < points.length; i += 1) {
    const step = distanceMeters(points[i - 1], points[i]);
    carried += step;
    while (carried >= 1000) {
      const atMs = hasTimestamps
        ? (points[i].recordedAt as number)
        : (pathDistanceMeters(points.slice(0, i + 1)) / pathDistanceMeters(points)) *
          totalDurationMs;
      splits.push(Math.max(0, Math.round(atMs - segmentStartMs)));
      segmentStartMs = atMs;
      carried -= 1000;
    }
  }

  return splits.slice(0, 42);
}

export function bearingDegrees(from: LatLng, to: LatLng) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
