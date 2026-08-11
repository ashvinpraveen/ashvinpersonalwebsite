"use client";

import { useAction, useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BackingTrackParams } from "./types";
import {
  buildStylePrompt,
  buildTrackTitle,
  formatChordProgression,
} from "./prompt";

type MusicPolishControlsProps = {
  clientId: string;
  params: BackingTrackParams;
  polishTrackId: Id<"musicTracks"> | null;
  isPolishing: boolean;
  onPolishTrackId: (trackId: Id<"musicTracks"> | null) => void;
  onPolishingChange: (value: boolean) => void;
  onAiAudioUrl: (url: string | null) => void;
  onLocalStop: () => void;
};

export default function MusicPolishControls({
  clientId,
  params,
  polishTrackId,
  isPolishing,
  onPolishTrackId,
  onPolishingChange,
  onAiAudioUrl,
  onLocalStop,
}: MusicPolishControlsProps) {
  const polish = useAction(api.music.polish);
  const refreshFromSuno = useAction(api.music.refreshFromSuno);
  const polishConfigured = useQuery(api.music.isPolishConfigured, {});
  const polishedTrack = useQuery(
    api.music.getTrack,
    polishTrackId && clientId
      ? { trackId: polishTrackId, clientId }
      : "skip",
  );
  const recentTracks = useQuery(
    api.music.listRecent,
    clientId ? { clientId } : "skip",
  );

  useEffect(() => {
    if (!polishedTrack) return;
    const url = polishedTrack.audioUrl || polishedTrack.streamAudioUrl;
    if (url) onAiAudioUrl(url);
    if (polishedTrack.status === "ready") {
      onPolishingChange(false);
      onLocalStop();
    }
    if (polishedTrack.status === "failed") {
      onPolishingChange(false);
      toast.error(polishedTrack.errorMessage || "Polish failed.");
    }
  }, [onAiAudioUrl, onLocalStop, onPolishingChange, polishedTrack]);

  useEffect(() => {
    if (!polishTrackId || !clientId || !isPolishing) return;
    if (polishedTrack?.status === "ready" || polishedTrack?.status === "failed") {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshFromSuno({ trackId: polishTrackId, clientId }).catch(() => {
        // Keep waiting on callbacks if polling fails.
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [
    clientId,
    isPolishing,
    polishTrackId,
    polishedTrack?.status,
    refreshFromSuno,
  ]);

  async function handlePolish() {
    if (polishConfigured === false) {
      toast.message("Suno not configured", {
        description: "Set SUNO_API_KEY in Convex env to enable Polish.",
      });
      return;
    }

    try {
      onPolishingChange(true);
      onAiAudioUrl(null);
      const stylePrompt = buildStylePrompt(params);
      const result = await polish({
        clientId,
        title: buildTrackTitle(params),
        stylePrompt,
        tempoBpm: params.tempoBpm,
        key: params.key,
        progression: formatChordProgression(params),
        drumPatternId: params.drumPatternId,
        bars: params.bars,
        hasMicTake: params.hasMicTake,
        notes: params.notes,
      });
      onPolishTrackId(result.trackId);
      toast.message("Polishing with Suno", {
        description: "Instrumental loop incoming — usually 1–2 minutes.",
      });
    } catch (error) {
      onPolishingChange(false);
      toast.error(error instanceof Error ? error.message : "Polish failed.");
    }
  }

  const polishBusy =
    isPolishing ||
    polishedTrack?.status === "queued" ||
    polishedTrack?.status === "generating";

  return (
    <>
      <button
        type="button"
        onClick={() => void handlePolish()}
        disabled={polishBusy}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--music-accent)] bg-[var(--music-accent)] px-5 text-sm font-semibold text-[var(--music-accent-ink)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
      >
        <Sparkles size={16} />
        {polishBusy ? "Polishing…" : "Polish with Suno"}
      </button>

      {recentTracks && recentTracks.length > 0 ? (
        <div className="mt-4 w-full rounded-2xl border border-[var(--music-line)] bg-[var(--music-inset)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--music-muted)]">
            Recent polishes
          </p>
          <ul className="mt-2 space-y-1">
            {recentTracks.map((track) => (
              <li key={track._id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-[var(--music-panel)]"
                  onClick={() => {
                    onPolishTrackId(track._id);
                    const url = track.audioUrl || track.streamAudioUrl;
                    if (url) onAiAudioUrl(url);
                  }}
                >
                  <span className="truncate">{track.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--music-muted)]">
                    {track.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
