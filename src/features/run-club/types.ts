export type LatLng = {
  lat: number;
  lng: number;
};

export type RouteWaypoint = LatLng & {
  label?: string;
};

export type RunClubProfile = {
  clientId: string;
  displayName: string;
  avatarHue: number;
  phone?: string;
};

export type TrackPoint = LatLng & {
  recordedAt: number;
};

export type LivePresence = {
  clientId: string;
  displayName: string;
  avatarHue: number;
  lat: number;
  lng: number;
  isTracking: boolean;
  updatedAt: number;
};

export type ClubSession = {
  _id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  startsAt: number;
  startLabel: string;
  startLat: number;
  startLng: number;
  routeWaypoints: RouteWaypoint[];
  routeId?: string;
  notes?: string;
};

export type MemberStats = {
  clientId: string;
  displayName: string;
  avatarHue: number;
  totalDistanceMeters: number;
  totalDurationMs: number;
  activityCount: number;
  streakDays: number;
  lastDayKey?: string;
};

export type SharedActivity = {
  _id: string;
  displayName: string;
  avatarHue: number;
  distanceMeters: number;
  durationMs: number;
  path: LatLng[];
  shareSlug: string;
  createdAt: number;
  dayKey: string;
};
