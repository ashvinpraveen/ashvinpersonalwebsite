"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { copyText } from "./browser";
import { formatDistance, formatDuration, formatPace } from "./geo";
import type { LatLng } from "./types";

type ShareCardProps = {
  displayName: string;
  avatarHue: number;
  distanceMeters: number;
  durationMs: number;
  path: LatLng[];
  shareSlug: string;
  createdAt: number;
};

function pathBounds(path: LatLng[]) {
  if (path.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }
  let minLat = path[0].lat;
  let maxLat = path[0].lat;
  let minLng = path[0].lng;
  let maxLng = path[0].lng;
  for (const point of path) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

function RouteSketch({ path }: { path: LatLng[] }) {
  const width = 320;
  const height = 160;
  const pad = 16;
  if (path.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <rect width={width} height={height} fill="#163d2b" />
        <text x="50%" y="50%" textAnchor="middle" fill="#b8e05c" fontSize="14">
          AI Run Club
        </text>
      </svg>
    );
  }

  const bounds = pathBounds(path);
  const latSpan = Math.max(0.0008, bounds.maxLat - bounds.minLat);
  const lngSpan = Math.max(0.0008, bounds.maxLng - bounds.minLng);
  const points = path
    .map((point) => {
      const x = pad + ((point.lng - bounds.minLng) / lngSpan) * (width - pad * 2);
      const y = pad + (1 - (point.lat - bounds.minLat) / latSpan) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <defs>
        <linearGradient id="runShareSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a4a34" />
          <stop offset="100%" stopColor="#0d281c" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#runShareSky)" />
      <g opacity="0.2">
        {Array.from({ length: 8 }).map((_, index) => (
          <line
            key={index}
            x1={0}
            x2={width}
            y1={(index + 1) * (height / 9)}
            y2={(index + 1) * (height / 9)}
            stroke="#b8e05c"
            strokeWidth="1"
          />
        ))}
      </g>
      <polyline
        points={points}
        fill="none"
        stroke="#b8e05c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.split(" ")[0]?.split(",")[0]}
        cy={points.split(" ")[0]?.split(",")[1]}
        r="5"
        fill="#f4ffe4"
      />
    </svg>
  );
}

export default function ShareCard({
  displayName,
  distanceMeters,
  durationMs,
  path,
  shareSlug,
  createdAt,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window === "undefined"
      ? `https://ashvinpraveen.com/run/s/${shareSlug}`
      : `${window.location.origin}/run/s/${shareSlug}`;

  async function handleCopy() {
    await copyText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: "AI Run Club finish",
        text: `${displayName} covered ${formatDistance(distanceMeters)} with AI Run Club`,
        url: shareUrl,
      });
      return;
    }
    await handleCopy();
  }

  async function handleDownload() {
    const node = cardRef.current;
    if (!node) return;

    const width = 720;
    const height = 900;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#163d2b");
    gradient.addColorStop(1, "#0a1f16");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#b8e05c";
    ctx.font = "700 28px Outfit, sans-serif";
    ctx.fillText("AI RUN CLUB", 48, 72);
    ctx.fillStyle = "#f4ffe4";
    ctx.font = "600 54px Fraunces, Georgia, serif";
    ctx.fillText(formatDistance(distanceMeters), 48, 160);
    ctx.font = "400 24px Outfit, sans-serif";
    ctx.fillStyle = "#cfe8d4";
    ctx.fillText(`${displayName} · ${formatDuration(durationMs)} · ${formatPace(distanceMeters, durationMs)}`, 48, 210);

    if (path.length > 1) {
      const bounds = pathBounds(path);
      const latSpan = Math.max(0.0008, bounds.maxLat - bounds.minLat);
      const lngSpan = Math.max(0.0008, bounds.maxLng - bounds.minLng);
      const left = 48;
      const top = 280;
      const boxW = width - 96;
      const boxH = 360;
      ctx.fillStyle = "#123526";
      ctx.fillRect(left, top, boxW, boxH);
      ctx.strokeStyle = "#b8e05c";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      path.forEach((point, index) => {
        const x = left + 24 + ((point.lng - bounds.minLng) / lngSpan) * (boxW - 48);
        const y = top + 24 + (1 - (point.lat - bounds.minLat) / latSpan) * (boxH - 48);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = "#8fb89a";
    ctx.font = "400 20px Outfit, sans-serif";
    ctx.fillText(
      new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(createdAt)),
      48,
      height - 80,
    );
    ctx.fillText("malaysian.ai · ashvinpraveen.com/run", 48, height - 48);

    const link = document.createElement("a");
    link.download = `ai-run-club-${shareSlug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="overflow-hidden rounded-[28px] border border-[color:var(--run-line)] bg-[linear-gradient(145deg,#163d2b,#0a1f16)] text-[#f4ffe4] shadow-[0_24px_60px_rgba(8,30,20,0.35)]"
      >
        <div className="h-40">
          <RouteSketch path={path} />
        </div>
        <div className="space-y-3 px-6 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#b8e05c]">
            AI Run Club
          </p>
          <p className="font-[family-name:var(--run-display)] text-4xl tracking-tight">
            {formatDistance(distanceMeters)}
          </p>
          <p className="text-sm text-[#cfe8d4]">
            {displayName} · {formatDuration(durationMs)} · {formatPace(distanceMeters, durationMs)}
          </p>
          <p className="text-xs text-[#8fb89a]">
            {new Intl.DateTimeFormat("en-MY", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(createdAt))}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
        >
          <Share2 size={16} />
          Share
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[color:var(--run-ink)]"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[color:var(--run-ink)]"
        >
          <Download size={16} />
          Save image
        </button>
      </div>
    </div>
  );
}
