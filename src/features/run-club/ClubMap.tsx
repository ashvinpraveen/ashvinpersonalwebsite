"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { avatarColor } from "./browser";
import type { LatLng, LivePresence, RouteWaypoint } from "./types";

type ClubMapProps = {
  start: LatLng & { label: string };
  route: RouteWaypoint[];
  presence: LivePresence[];
  selfClientId?: string;
  selfPath: LatLng[];
  selfPosition?: LatLng | null;
  followSelf?: boolean;
};

function FitRoute({
  start,
  route,
  selfPosition,
  followSelf,
}: {
  start: LatLng;
  route: RouteWaypoint[];
  selfPosition?: LatLng | null;
  followSelf?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (followSelf && selfPosition) {
      map.panTo([selfPosition.lat, selfPosition.lng], { animate: true });
      return;
    }

    const points: L.LatLngExpression[] = [
      [start.lat, start.lng],
      ...route.map((point) => [point.lat, point.lng] as L.LatLngExpression),
    ];
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [followSelf, map, route, selfPosition, start.lat, start.lng]);

  return null;
}

function runnerIcon(name: string, hue: number, isSelf: boolean, isTracking: boolean) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const color = avatarColor(hue);
  const size = isSelf ? 34 : 28;
  return L.divIcon({
    className: "run-club-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:999px;
      background:${color};color:white;display:grid;place-items:center;
      font:700 12px Outfit, DM Sans, sans-serif;
      box-shadow:0 0 0 ${isTracking ? "3px rgba(184,224,92,0.85)" : "2px rgba(8,28,18,0.35)"};
      border:2px solid rgba(255,255,255,0.9);
    ">${initial}</div>`,
  });
}

function startIcon() {
  return L.divIcon({
    className: "run-club-start-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div style="
      width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;
      border-bottom:22px solid #b8e05c;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));
      position:relative;
    "><span style="
      position:absolute;left:-7px;top:8px;width:14px;height:14px;border-radius:999px;
      background:#123526;border:2px solid #f4ffe4;display:block;
    "></span></div>`,
  });
}

export default function ClubMap({
  start,
  route,
  presence,
  selfClientId,
  selfPath,
  selfPosition,
  followSelf = false,
}: ClubMapProps) {
  const routePositions = useMemo(
    () => route.map((point) => [point.lat, point.lng] as [number, number]),
    [route],
  );
  const selfPositions = useMemo(
    () => selfPath.map((point) => [point.lat, point.lng] as [number, number]),
    [selfPath],
  );

  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={15}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <FitRoute
        start={start}
        route={route}
        selfPosition={selfPosition}
        followSelf={followSelf}
      />
      {routePositions.length > 1 ? (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: "#2f7a4b",
            weight: 5,
            opacity: 0.75,
            dashArray: "10 10",
          }}
        />
      ) : null}
      {selfPositions.length > 1 ? (
        <Polyline
          positions={selfPositions}
          pathOptions={{ color: "#8fd13a", weight: 6, opacity: 0.95 }}
        />
      ) : null}
      <Marker position={[start.lat, start.lng]} icon={startIcon()}>
        <Popup>
          <strong>{start.label}</strong>
          <div>Club start point</div>
        </Popup>
      </Marker>
      <CircleMarker
        center={[start.lat, start.lng]}
        radius={18}
        pathOptions={{
          color: "#b8e05c",
          fillColor: "#b8e05c",
          fillOpacity: 0.15,
          weight: 1,
        }}
      />
      {presence.map((runner) => (
        <Marker
          key={runner.clientId}
          position={[runner.lat, runner.lng]}
          icon={runnerIcon(
            runner.displayName,
            runner.avatarHue,
            runner.clientId === selfClientId,
            runner.isTracking,
          )}
        >
          <Popup>
            <strong>{runner.displayName}</strong>
            <div>{runner.isTracking ? "On the move" : "Nearby"}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
