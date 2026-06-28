"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { formatPostcardDate, getOrCreatePostcardClientId, readPostcardDraft } from "@/features/postcards/browser";
import { DEFAULT_PEN_SIZE, DRAFT_KEY, MAX_MESSAGE_LENGTH, MESSAGE_COUNTER_THRESHOLD } from "@/features/postcards/config";
import DrawingField from "@/features/postcards/DrawingField";
import DrawingPad from "@/features/postcards/DrawingPad";
import type { DrawingStroke, EditablePostcard, PendingPostcard, PostcardDraft } from "@/features/postcards/types";
import { isPostcardsEnabled } from "@/lib/features";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { cn } from "@/lib/utils";

const PostcardApp = () => {
  const [clientId, setClientId] = useState("");
  const postcards = useQuery(
    api.postcards.list,
    clientId ? { clientId } : "skip",
  );
  const createPostcard = useMutation(api.postcards.create);
  const updatePostcard = useMutation(api.postcards.updateOwn);
  const deletePostcard = useMutation(api.postcards.deleteOwn);
  const togglePostcardLike = useMutation(api.postcards.toggleLike);
  const formRef = useRef<HTMLFormElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editingPostcardId, setEditingPostcardId] = useState<Id<"postcards"> | null>(null);
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const [penSize, setPenSize] = useState(DEFAULT_PEN_SIZE);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastSharedUrl, setLastSharedUrl] = useState("");
  const [highlightedPostcardId, setHighlightedPostcardId] = useState("");
  const [pendingPostcard, setPendingPostcard] = useState<PendingPostcard | null>(null);
  const [savingPostcardId, setSavingPostcardId] = useState<Id<"postcards"> | null>(null);
  const [deletingPostcardId, setDeletingPostcardId] = useState<Id<"postcards"> | null>(null);
  const [likingPostcardId, setLikingPostcardId] = useState<Id<"postcards"> | null>(null);

  useEffect(() => {
    setClientId(getOrCreatePostcardClientId());

    const draft = readPostcardDraft();
    if (draft) {
      setName(draft.name ?? "");
      setLocation(draft.location ?? "");
      setMessage(draft.message ?? "");
      setDrawingStrokes(draft.drawingStrokes ?? []);
      setPenSize(draft.penSize ?? DEFAULT_PEN_SIZE);
      if (
        draft.message ||
        draft.name ||
        draft.location ||
        (draft.drawingStrokes && draft.drawingStrokes.length > 0)
      ) {
        toast.info("Restored your unsent postcard.");
      }
    }

    setHighlightedPostcardId(window.location.hash.replace("#postcard-", ""));
    const handleHashChange = () => {
      setHighlightedPostcardId(window.location.hash.replace("#postcard-", ""));
    };
    window.addEventListener("hashchange", handleHashChange);
    setDraftLoaded(true);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    const hasDraft = Boolean(
      name.trim() ||
        location.trim() ||
        message.trim() ||
        drawingStrokes.length > 0 ||
        penSize !== DEFAULT_PEN_SIZE,
    );

    if (!hasDraft) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }

    const draft: PostcardDraft = {
      name,
      location,
      message,
      drawingStrokes,
      penSize,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftLoaded, drawingStrokes, location, message, name, penSize]);

  function getDrawingDataUrl() {
    const canvas = document.querySelector<HTMLCanvasElement>("#postcard-drawing");
    canvasRef.current = canvas;
    if (!canvas || !hasDrawing) return null;

    const maxBytes = 170_000;
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    for (const width of [800, 600, 400]) {
      if (canvas.width > width) {
        const scale = width / canvas.width;
        exportCanvas.width = width;
        exportCanvas.height = Math.floor(canvas.height * scale);
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
      } else {
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(canvas, 0, 0);
      }
      const dataUrl = exportCanvas.toDataURL("image/png");
      if (dataUrl.length <= maxBytes) return dataUrl;
    }

    return exportCanvas.toDataURL("image/png");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientId) {
      toast.error("Could not save postcard yet. Try again in a second.");
      return;
    }

    if (!message.trim()) {
      toast.error("Write a line first.");
      return;
    }

    const drawingDataUrl = getDrawingDataUrl();
    setIsSubmitting(true);
    setSubmitError("");
    setLastSharedUrl("");
    setPendingPostcard({ name, location, message, drawingDataUrl });
    try {
      const postcardId = await createPostcard({
        name,
        location,
        message,
        clientId,
        drawingDataUrl,
      });
      const shareUrl = `${window.location.origin}/postcards#postcard-${postcardId}`;
      setName("");
      setLocation("");
      setMessage("");
      setDrawingStrokes([]);
      setPenSize(DEFAULT_PEN_SIZE);
      window.localStorage.removeItem(DRAFT_KEY);
      window.history.replaceState(null, "", `#postcard-${postcardId}`);
      setHighlightedPostcardId(String(postcardId));
      setLastSharedUrl(shareUrl);
      setPendingPostcard(null);
      toast.success("Postcard added.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add postcard.";
      setSubmitError(message);
      setPendingPostcard(null);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(postcard: EditablePostcard) {
    setEditingPostcardId(postcard._id);
    setEditName(postcard.name);
    setEditLocation(postcard.location);
    setEditMessage(postcard.message);
  }

  function cancelEditing() {
    setEditingPostcardId(null);
    setEditName("");
    setEditLocation("");
    setEditMessage("");
  }


  async function copyShareLink() {
    if (!lastSharedUrl) return;

    try {
      await window.navigator.clipboard.writeText(lastSharedUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  async function savePostcard(postcardId: Id<"postcards">) {
    if (!clientId) return;

    setSavingPostcardId(postcardId);
    try {
      await updatePostcard({
        postcardId,
        clientId,
        name: editName,
        location: editLocation,
        message: editMessage,
      });
      cancelEditing();
      toast.success("Postcard updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update postcard.");
    } finally {
      setSavingPostcardId(null);
    }
  }

  async function removePostcard(postcardId: Id<"postcards">) {
    if (!clientId) return;
    if (!window.confirm("Delete this postcard?")) return;

    setDeletingPostcardId(postcardId);
    try {
      await deletePostcard({ postcardId, clientId });
      if (editingPostcardId === postcardId) {
        cancelEditing();
      }
      toast.success("Postcard deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete postcard.");
    } finally {
      setDeletingPostcardId(null);
    }
  }

  async function handleLike(postcardId: Id<"postcards">) {
    if (!clientId) return;

    setLikingPostcardId(postcardId);
    try {
      await togglePostcardLike({ postcardId, clientId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save like.");
    } finally {
      setLikingPostcardId(null);
    }
  }

  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pt-24`}>
        <div className={contentColumnClassName}>
          <section className="space-y-12">
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                drop a thought
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                what's something random you learned today? or have any questions? (or just wanna say hi while you're here haha) leave a note! i read and respond to everything
              </p>
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-[12px] border border-border bg-card"
            >
              <div className="grid md:grid-cols-[0.95fr_1.05fr]">
                <div className="border-b border-dashed border-border p-4 md:border-b-0 md:border-r md:p-6">
                  <DrawingPad
                    hasDrawing={hasDrawing}
                    onHasDrawingChange={setHasDrawing}
                    strokes={drawingStrokes}
                    onStrokesChange={setDrawingStrokes}
                    penSize={penSize}
                    onPenSizeChange={setPenSize}
                  />
                </div>

                <div className="relative flex min-h-[28rem] flex-col p-4 md:p-6">
                  <label htmlFor="postcard-message" className="sr-only">
                    Message
                  </label>
                  <Textarea
                    id="postcard-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder="Write something..."
                    className="min-h-56 flex-1 resize-none border-0 bg-transparent px-0 py-0 text-lg leading-8 shadow-none ring-offset-0 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />

                  <div className="mt-8 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="border-b border-border pb-2">
                        <label htmlFor="postcard-name" className="sr-only">
                          Name
                        </label>
                        <input
                          id="postcard-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          maxLength={40}
                          placeholder="Name (optional)"
                          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                        />
                      </div>
                      <div className="border-b border-border pb-2">
                        <label htmlFor="postcard-location" className="sr-only">
                          Location
                        </label>
                        <input
                          id="postcard-location"
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          maxLength={60}
                          placeholder="Location (optional)"
                          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border pt-4">
                      {message.length >= MESSAGE_COUNTER_THRESHOLD ? (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {message.length}/{MAX_MESSAGE_LENGTH}
                        </p>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <Button type="submit" disabled={isSubmitting} className="rounded-[8px] font-mono text-xs">
                        {isSubmitting ? "Sharing..." : "Share →"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {pendingPostcard && (
              <article className="animate-pulse rounded-[12px] border border-primary/30 bg-card p-4">
                <div className="space-y-4">
                  {pendingPostcard.drawingDataUrl && (
                    <div className="h-36 w-full rounded-[12px] border border-border bg-background p-2 dark:bg-muted">
                      <img
                        src={pendingPostcard.drawingDataUrl}
                        alt=""
                        className="h-full w-full object-contain dark:invert"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/95">
                    {pendingPostcard.message}
                  </p>
                </div>
                <footer className="mt-6 flex items-center justify-between border-t border-dashed border-border pt-4">
                  <div className="space-y-0.5">
                    {pendingPostcard.name.trim() && (
                      <p className="font-mono text-[10px] text-muted-foreground/70">
                        {pendingPostcard.name.trim()}
                      </p>
                    )}
                    {pendingPostcard.location.trim() && (
                      <p className="font-mono text-[10px] text-muted-foreground/60">
                        {pendingPostcard.location.trim()}
                      </p>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Posting...
                  </p>
                </footer>
              </article>
            )}

            {submitError && (
              <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
                <p>
                  Could not send that yet. Your draft is saved on this browser, so you can try again without redrawing.
                </p>
                <Button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                  className="mt-3 rounded-[8px] font-mono text-xs"
                >
                  Try again →
                </Button>
              </div>
            )}

            {lastSharedUrl && (
              <div className="rounded-[12px] border border-border bg-card p-4 text-sm text-muted-foreground">
                <p className="text-foreground">got it. i’ll reply soon :)</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={lastSharedUrl}
                    className="break-all font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {lastSharedUrl}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyShareLink}
                    className="rounded-[8px] font-mono text-xs"
                  >
                    Copy link
                  </Button>
                </div>
              </div>
            )}

            <DrawingField postcards={postcards} />

            <section className="space-y-6 border-t border-border pt-12">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Feed
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Share your thoughts too, and like the interesting ones.
                </p>
              </div>

              {postcards && postcards.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-border p-8 text-sm text-muted-foreground">
                  The feed is quiet. Be first.
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {postcards?.map((postcard) => {
                  const senderName = postcard.name.trim();
                  const senderLocation = postcard.location.trim();
                  const hasSender = senderName || senderLocation;
                  const isEditing = editingPostcardId === postcard._id;

                  return (
                    <article
                      key={postcard._id}
                      id={`postcard-${postcard._id}`}
                      className={cn(
                        "scroll-mt-24 flex min-h-64 flex-col justify-between rounded-[12px] border border-border bg-card p-4 transition-shadow",
                        highlightedPostcardId === postcard._id && "shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]",
                      )}
                    >
                      <div className="space-y-4">
                        {postcard.drawingDataUrl && (
                          <div className="h-36 w-full rounded-[12px] border border-border bg-background p-2 dark:bg-muted">
                            <img
                              src={postcard.drawingDataUrl}
                              alt=""
                              className="h-full w-full object-contain dark:invert"
                              loading="lazy"
                            />
                          </div>
                        )}
                        {isEditing ? (
                          <div className="space-y-4">
                            <Textarea
                              value={editMessage}
                              onChange={(event) => setEditMessage(event.target.value)}
                              maxLength={MAX_MESSAGE_LENGTH}
                              className="min-h-32 rounded-[8px]"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                maxLength={40}
                                placeholder="Name"
                                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                              />
                              <input
                                value={editLocation}
                                onChange={(event) => setEditLocation(event.target.value)}
                                maxLength={60}
                                placeholder="Location"
                                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/95">
                            {postcard.message}
                          </p>
                        )}
                      </div>
                      {postcard.reply && (
                        <div className="mt-5 rounded-[8px] border border-border bg-background/70 p-4 dark:bg-muted/70">
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
                            Ashvin replied
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                            {postcard.reply}
                          </p>
                        </div>
                      )}
                      <footer
                        className={cn(
                          "mt-6 flex items-end gap-4 border-t border-dashed border-border pt-4",
                          hasSender ? "justify-between" : "justify-end",
                        )}
                      >
                        {hasSender && (
                          <div className="space-y-0.5">
                            {senderName && (
                              <p className="font-mono text-[10px] text-muted-foreground/70">
                                {senderName}
                              </p>
                            )}
                            {senderLocation && (
                              <p className="font-mono text-[10px] text-muted-foreground/60">
                                {senderLocation}
                              </p>
                            )}
                          </div>
                        )}
                        <time className="font-mono text-[10px] text-muted-foreground">
                          {formatPostcardDate(postcard.createdAt)}
                        </time>
                      </footer>
                      <button
                        type="button"
                        onClick={() => handleLike(postcard._id)}
                        disabled={likingPostcardId === postcard._id}
                        aria-pressed={postcard.isLiked}
                        className={cn(
                          "mt-5 flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] transition-colors",
                          postcard.isLiked
                            ? "border-primary/70 bg-primary/10 text-primary"
                            : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        <Heart
                          className={cn("h-3.5 w-3.5", postcard.isLiked && "fill-current")}
                          aria-hidden="true"
                        />
                        <span>{postcard.likeCount ?? 0}</span>
                      </button>
                      {postcard.canEdit && (
                        <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => savePostcard(postcard._id)}
                                disabled={savingPostcardId === postcard._id}
                                className="text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                              >
                                {savingPostcardId === postcard._id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditing(postcard)}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removePostcard(postcard._id)}
                            disabled={deletingPostcardId === postcard._id}
                            className="text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                          >
                            {deletingPostcardId === postcard._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </section>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default function Postcard() {
  if (!isPostcardsEnabled) {
    return (
      <>
        <SiteNav />
        <main className={`${pageShellClassName} pt-24`}>
          <div className={contentColumnClassName}>
            <FeatureUnavailable
              title="Postcards are not configured"
              description="Set NEXT_PUBLIC_CONVEX_URL and run Convex to enable postcards. The rest of the site can run without it."
            />
            <Footer />
          </div>
        </main>
      </>
    );
  }

  return <PostcardApp />;
}
