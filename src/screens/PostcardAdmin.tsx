"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AdminShell from "@/screens/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_REPLY_LENGTH = 500;

function formatPostcardDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PostcardAdminList({ adminSecret }: { adminSecret: string }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [deletingPostcardId, setDeletingPostcardId] = useState<Id<"postcards"> | null>(null);
  const [hidingPostcardId, setHidingPostcardId] = useState<Id<"postcards"> | null>(null);
  const replyToPostcard = useMutation(api.postcards.reply);
  const deletePostcard = useMutation(api.postcards.deleteForAdmin);
  const setPostcardHidden = useMutation(api.postcards.setHiddenForAdmin);
  const postcards = useQuery(
    api.postcards.listForAdmin,
    adminSecret ? { adminSecret } : "skip",
  );

  useEffect(() => {
    if (!postcards) return;
    setDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      for (const postcard of postcards) {
        nextDrafts[postcard._id] ??= postcard.reply ?? "";
      }
      return nextDrafts;
    });
  }, [postcards]);

  async function saveReply(postcardId: Id<"postcards">) {
    try {
      await replyToPostcard({
        adminSecret,
        postcardId,
        reply: drafts[postcardId] ?? "",
      });
      toast.success("Reply saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save reply.");
    }
  }

  async function removePostcard(postcardId: Id<"postcards">) {
    if (!window.confirm("Delete this postcard?")) return;

    setDeletingPostcardId(postcardId);
    try {
      await deletePostcard({ adminSecret, postcardId });
      setDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[postcardId];
        return nextDrafts;
      });
      toast.success("Postcard deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete postcard.");
    } finally {
      setDeletingPostcardId(null);
    }
  }

  async function toggleHidden(postcardId: Id<"postcards">, hidden: boolean) {
    setHidingPostcardId(postcardId);
    try {
      await setPostcardHidden({ adminSecret, postcardId, hidden });
      toast.success(hidden ? "Postcard hidden." : "Postcard restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update postcard.");
    } finally {
      setHidingPostcardId(null);
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-background/50 p-4">
      {postcards === undefined && (
        <p className="font-mono text-xs text-muted-foreground">Loading postcards...</p>
      )}

      {postcards === null && (
        <div className="max-w-md rounded-[8px] border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            That password did not work, or the admin secret is not configured.
          </p>
        </div>
      )}

      {postcards ? (
        <div className="space-y-4">
          {postcards.map((postcard) => (
            <article
              key={postcard._id}
              className="grid gap-5 rounded-[8px] border border-border bg-card p-5 md:grid-cols-[0.95fr_1.05fr]"
            >
              <div className="space-y-4">
                {postcard.hiddenAt ? (
                  <p className="w-fit rounded-full border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Hidden
                  </p>
                ) : null}
                {postcard.drawingDataUrl && (
                  <div className="h-44 rounded-[8px] border border-border bg-background p-3 dark:bg-muted">
                    <img
                      src={postcard.drawingDataUrl}
                      alt=""
                      className="h-full w-full object-contain dark:invert"
                      loading="lazy"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                  {postcard.message}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-border pt-4 font-mono text-[10px]">
                  <span className="text-muted-foreground/70">
                    {postcard.name || "Anonymous"}
                  </span>
                  {postcard.location && (
                    <span className="text-muted-foreground/60">{postcard.location}</span>
                  )}
                  <time className="text-muted-foreground">
                    {formatPostcardDate(postcard.createdAt)}
                  </time>
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor={`reply-${postcard._id}`}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Reply
                </label>
                <Textarea
                  id={`reply-${postcard._id}`}
                  value={drafts[postcard._id] ?? ""}
                  onChange={(event) =>
                    setDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [postcard._id]: event.target.value,
                    }))
                  }
                  maxLength={MAX_REPLY_LENGTH}
                  placeholder="Write a reply..."
                  className="min-h-36 rounded-[8px]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {(drafts[postcard._id] ?? "").length}/{MAX_REPLY_LENGTH}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleHidden(postcard._id, !postcard.hiddenAt)}
                      disabled={hidingPostcardId === postcard._id}
                      className="rounded-[8px] font-mono text-xs"
                    >
                      {hidingPostcardId === postcard._id
                        ? "Saving..."
                        : postcard.hiddenAt
                          ? "Restore"
                          : "Hide"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removePostcard(postcard._id)}
                      disabled={deletingPostcardId === postcard._id}
                      className="rounded-[8px] font-mono text-xs"
                    >
                      {deletingPostcardId === postcard._id ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => saveReply(postcard._id)}
                      className="rounded-[8px] font-mono text-xs"
                    >
                      Save reply
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const PostcardAdmin = () => (
  <AdminShell
    activePath="/admin/postcards"
    title="Postcards"
  >
    {(adminSecret) => <PostcardAdminList adminSecret={adminSecret} />}
  </AdminShell>
);

export default PostcardAdmin;
