export const CLIENT_ID_KEY = "run-club-client-id";
export const PROFILE_KEY = "run-club-profile";
export const MAX_DISPLAY_NAME_LENGTH = 24;
export const MAX_CHAT_LENGTH = 280;
export const MAX_ROUTE_NAME_LENGTH = 60;
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

export const CLUB_SCHEDULE = {
  days: ["Monday", "Thursday"] as const,
  localTime: "7:00 PM",
  venue: DEFAULT_START.label,
};

export const AVATAR_PALETTE = [
  28, 48, 72, 118, 158, 188, 212, 268, 312, 338,
] as const;
