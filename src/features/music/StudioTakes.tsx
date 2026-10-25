"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { notify } from "@/features/music/notify";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { chordToken } from "../../../convex/lib/musicTheory";
import type { JamState } from "./jam";
import { Label } from "./ui";
import { cn } from "@/lib/utils";

type StudioTakesProps = {
  clientId: string;
  jam: JamState;
  onNotes: (notes: string) => void;
  onListen: () => void;
};

function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  if (since == null) return "";
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Recording({ since }: { since: number }) {
  const elapsed = useElapsed(since);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--selection)/0.25)] px-4 py-3">
      <span className="jam-eq flex h-5 items-end gap-[3px]" aria-hidden="true">
        {[0, 0.15, 0.3, 0.45].map((delay) => (
          <span key={delay} className="h-full w-1 rounded-full bg-link" style={{ animationDelay: `${delay}s` }} />
        ))}
      </span>
      <span className="text-sm">
        The band is recording… <span className="tabular-nums text-muted-foreground">{elapsed}</span>
        <span className="block text-xs text-muted-foreground">
          Usually 1–2 minutes. Keep jamming, it&apos;ll show up here.
        </span>
      </span>
    </div>
  );
}

export default function StudioTakes({ clientId, jam, onNotes, onListen }: StudioTakesProps) {
  const configured = useQuery(api.music.isPolishConfigured, {});
  const takes = useQuery(api.music.listRecent, clientId ? { clientId } : "skip");
  const requestPolish = useMutation(api.music.requestPolish);
  const deleteTrack = useMutation(api.music.deleteTrack);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Id<"musicTracks"> | null>(null);

  if (configured === undefined) return null;
  if (configured === false) {
    return process.env.NODE_ENV === "development" ? (
      <p className="text-xs text-muted-foreground">
        Studio takes are off. Set ELEVENLABS_API_KEY in Convex to turn them on.
      </p>
    ) : null;
  }

  const pending = takes?.find((take) => take.status === "queued" || take.status === "generating");

  async function record() {
    try {
      setSubmitting(true);
      await requestPolish({
        clientId,
        tonic: jam.tonic,
        mode: jam.mode,
        tempoBpm: jam.tempo,
        styleId: jam.styleId,
        chords: jam.chords.map(chordToken),
        notes: jam.notes,
      });
      notify.message("Sent to the studio", {
        description: "Session players are on it. It'll appear below.",
      });
    } catch (error) {
      notify.error(error instanceof Error ? error.message.replace(/^.*Uncaught Error: /, "") : "Couldn't start a take.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(trackId: Id<"musicTracks">) {
    try {
      setDeleting(trackId);
      await deleteTrack({ trackId, clientId });
    } catch {
      notify.error("Couldn't delete that take.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="rounded-[1.4rem] bg-background/60 p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-link" />
        <Label className="text-foreground">Studio take</Label>
        <span className="rounded-full bg-link/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-link">
          AI
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        ElevenLabs re-records this jam with real-sounding players: same key, chords, groove, and tempo. A ~2 minute take to practise over.
      </p>
      <textarea
        value={jam.notes}
        onChange={(event) => onNotes(event.target.value.slice(0, 240))}
        placeholder="Direction for the band (optional): brushes, upright bass, rainy café…"
        rows={2}
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      {pending ? (
        <div className="mt-3">
          <Recording since={pending.createdAt} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void record()}
          disabled={submitting || !clientId}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Sparkles size={16} />
          {submitting ? "Booking the studio…" : "Record a studio take"}
        </button>
      )}

      {takes && takes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {takes.map((take) => (
            <li key={take._id} className="rounded-2xl bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{take.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{take.progression}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {take.audioUrl ? (
                    <a
                      href={take.audioUrl}
                      download={`${take.title}.mp3`}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
                      aria-label={`Download ${take.title}`}
                    >
                      <Download size={15} />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(take._id)}
                    disabled={deleting === take._id}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label={`Delete ${take.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {take.status === "ready" && take.audioUrl ? (
                <audio
                  controls
                  preload="none"
                  src={take.audioUrl}
                  onPlay={onListen}
                  className="mt-2 h-10 w-full"
                />
              ) : (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    take.status === "failed" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {take.status === "failed"
                    ? take.errorMessage || "That take didn't work out."
                    : "Recording…"}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
