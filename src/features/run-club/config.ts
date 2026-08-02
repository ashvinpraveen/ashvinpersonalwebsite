export const CLIENT_ID_KEY = "run-club-client-id";
export const PROFILE_KEY = "run-club-profile";
export const MAX_DISPLAY_NAME_LENGTH = 24;
export const MAX_CHAT_LENGTH = 280;
export const MAX_ROUTE_WAYPOINTS = 40;
export const MAX_PATH_POINTS = 120;
export const PRESENCE_TTL_MS = 60_000;
export const PRESENCE_HEARTBEAT_MS = 5_000;
export const TRACK_SAMPLE_METERS = 12;
export const CLUB_TIME_ZONE = "Asia/Kuala_Lumpur";

/** Asian Institute of Chartered Bankers / Wisma AICB meetup pin */
export const DEFAULT_START = {
  label: "AICB (Wisma AICB)",
  lat: 3.1489,
  lng: 101.6854,
  address: "10 Jalan Dato' Onn, 50480 Kuala Lumpur",
} as const;

/** Default evening loop toward Lake Gardens / around the meetup */
export const DEFAULT_ROUTE = [
  { lat: 3.1489, lng: 101.6854, label: "Start · AICB" },
  { lat: 3.1498, lng: 101.6832, label: "Tun Ismail" },
  { lat: 3.1516, lng: 101.6811, label: "Lake Gardens edge" },
  { lat: 3.1534, lng: 101.6828 },
  { lat: 3.1521, lng: 101.6859 },
  { lat: 3.1502, lng: 101.6876, label: "Parliament loop" },
  { lat: 3.1489, lng: 101.6854, label: "Finish · AICB" },
] as const;

export const CLUB_SCHEDULE = {
  days: ["Monday", "Thursday"] as const,
  localTime: "7:00 PM",
  venue: DEFAULT_START.label,
};

export const AVATAR_PALETTE = [
  28, 48, 72, 118, 158, 188, 212, 268, 312, 338,
] as const;
