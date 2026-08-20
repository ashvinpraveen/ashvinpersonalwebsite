"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildStylePrompt,
  buildTrackTitle,
  formatChordProgression,
} from "./prompt";
import type { BackingTrackParams } from "./types";

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
  const deleteTrack = useMutation(api.music.deleteTrack);
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
  const [deletingId, setDeletingId] = useState<Id<"musicTracks"> | null>(null);

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

  async function handlePolish() {
    if (polishConfigured === false) {
      toast.message("ElevenLabs not configured", {
        description: "Set ELEVENLABS_API_KEY in Convex env to enable Polish.",
      });
      return;
    }

    try {
      onPolishingChange(true);
      onAiAudioUrl(null);
      onLocalStop();
      toast.message("Polishing with ElevenLabs", {
        description: "Composing a professional ~2 min instrumental take.",
      });

      const result = await polish({
        clientId,
        title: buildTrackTitle(params),
        stylePrompt: buildStylePrompt(params),
        tempoBpm: params.tempoBpm,
        key: params.key,
        progression: formatChordProgression(params),
        drumPatternId: params.drumPatternId,
        bars: params.bars,
        notes: params.notes,
      });
      onPolishTrackId(result.trackId);
      if (result.audioUrl) {
        onAiAudioUrl(result.audioUrl);
        onLocalStop();
      }
      onPolishingChange(false);
    } catch (error) {
      onPolishingChange(false);
      toast.error(error instanceof Error ? error.message : "Polish failed.");
    }
  }

  async function handleDelete(trackId: Id<"musicTracks">) {
    try {
      setDeletingId(trackId);
      await deleteTrack({ trackId, clientId });
      if (polishTrackId === trackId) {
        onPolishTrackId(null);
        onAiAudioUrl(null);
      }
      toast.message("Track deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete track.");
    } finally {
      setDeletingId(null);
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
        className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground/[0.08] px-5 text-sm font-medium transition-colors hover:bg-foreground/[0.12] disabled:cursor-wait disabled:opacity-70"
      >
        <Sparkles size={16} />
        {polishBusy ? "Polishing…" : "Polish with ElevenLabs"}
      </button>

      {recentTracks && recentTracks.length > 0 ? (
        <div className="mt-4 w-full rounded-2xl bg-background/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Recent polishes
          </p>
          <ul className="mt-2 space-y-1">
            {recentTracks.map((track) => (
              <li key={track._id} className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-accent/70"
                  onClick={() => {
                    onPolishTrackId(track._id);
                    const url = track.audioUrl || track.streamAudioUrl;
                    if (url) onAiAudioUrl(url);
                  }}
                >
                  <span className="truncate">{track.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {track.status}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${track.title}`}
                  disabled={deletingId === track._id}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  onClick={() => void handleDelete(track._id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
