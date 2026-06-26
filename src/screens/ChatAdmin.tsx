"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bot, Inbox, MailOpen, MessageCircle, Send, UserRound } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AdminShell from "@/screens/AdminShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatThreadTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortClientId(clientId: string) {
  if (clientId.length <= 12) return clientId;
  return `${clientId.slice(0, 6)}...${clientId.slice(-4)}`;
}

function getThreadTitle(thread: { title?: string; clientId: string }) {
  return thread.title?.trim() || `Visitor ${shortClientId(thread.clientId)}`;
}

function ChatAdminInbox({ adminSecret }: { adminSecret: string }) {
  const conversations = useQuery(api.chat.listForAdmin, { adminSecret });
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"chatThreads"> | null>(null);
  const selectedThread = useMemo(() => {
    if (!conversations || !selectedThreadId) return null;
    return conversations.find((conversation) => conversation._id === selectedThreadId) ?? null;
  }, [conversations, selectedThreadId]);
  const threadDetail = useQuery(
    api.chat.getThreadForAdmin,
    adminSecret && selectedThreadId ? { adminSecret, threadId: selectedThreadId } : "skip",
  );
  const markThreadRead = useMutation(api.chat.markThreadReadForAdmin);

  useEffect(() => {
    if (!conversations || conversations.length === 0) return;
    if (selectedThreadId && conversations.some((conversation) => conversation._id === selectedThreadId)) {
      return;
    }
    setSelectedThreadId(conversations[0]._id);
  }, [conversations, selectedThreadId]);

  useEffect(() => {
    if (!adminSecret || !selectedThreadId || !threadDetail?.thread.unread) return;

    void markThreadRead({
      adminSecret,
      threadId: selectedThreadId,
    });
  }, [adminSecret, markThreadRead, selectedThreadId, threadDetail?.thread.unread]);

  if (conversations === undefined) {
    return <p className="font-mono text-xs text-muted-foreground">Loading chats...</p>;
  }

  if (conversations === null || threadDetail === null) {
    return (
      <div className="max-w-md rounded-[8px] border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          That password did not work, or the admin secret is not configured.
        </p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-[8px] border border-dashed border-border bg-card/40 px-5 text-center">
        <Inbox aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No chats yet.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          New bot conversations will show up here as soon as visitors send a message.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-11rem)] overflow-hidden rounded-[8px] border border-border bg-card lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <MessageCircle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Conversations</p>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {conversations.filter((conversation) => conversation.unread).length} unread
          </span>
        </div>

        <div className="max-h-[22rem] overflow-y-auto lg:max-h-[calc(100dvh-14.5rem)]">
          {conversations.map((conversation) => {
            const isSelected = conversation._id === selectedThreadId;
            const isUnread = conversation.unread;

            return (
              <button
                key={conversation._id}
                type="button"
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/70",
                  isSelected && "bg-muted",
                )}
                onClick={() => setSelectedThreadId(conversation._id)}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    {isUnread ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    ) : (
                      <MailOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <p
                      className={cn(
                        "truncate text-sm",
                        isUnread ? "font-semibold text-foreground" : "font-medium text-foreground",
                      )}
                    >
                      {getThreadTitle(conversation)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs",
                      isUnread ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {conversation.latestMessage?.body ?? "New chat"}
                  </p>
                </div>
                <time
                  className={cn(
                    "pt-0.5 font-mono text-[11px]",
                    isUnread ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {formatThreadTime(conversation.lastMessageAt)}
                </time>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-[32rem] min-w-0 flex-col bg-background/55">
        {selectedThread && threadDetail ? (
          <>
            <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getThreadTitle(selectedThread)}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {shortClientId(selectedThread.clientId)} · started{" "}
                  {formatMessageTime(selectedThread.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-[8px] font-mono text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(selectedThread.clientId);
                }}
              >
                Copy ID
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {threadDetail.messages.map((message) => {
                  const isVisitor = message.author === "visitor";

                  return (
                    <article
                      key={message._id}
                      className={cn(
                        "flex max-w-[86%] flex-col gap-1 rounded-[8px] px-3 py-2 shadow-sm",
                        isVisitor
                          ? "ml-auto bg-emerald-600 text-white"
                          : "mr-auto bg-card text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {isVisitor ? (
                          <UserRound aria-hidden="true" className="h-3.5 w-3.5 opacity-80" />
                        ) : (
                          <Bot aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-widest opacity-75">
                          {isVisitor ? "Visitor" : "AI Ashvin"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                      <time className="self-end font-mono text-[10px] opacity-70">
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </article>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
            <Send aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a conversation.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ChatAdmin() {
  return (
    <AdminShell
      activePath="/admin"
      title="Chat inbox"
      description="Visitor chats with the AI bot, ordered by the latest message."
    >
      {(adminSecret) => <ChatAdminInbox adminSecret={adminSecret} />}
    </AdminShell>
  );
}
