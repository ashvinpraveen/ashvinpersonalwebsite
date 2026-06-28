"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bot, ChevronLeft, Inbox, MailOpen, MessageCircle, Send, UserRound } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import AdminShell from "@/screens/AdminShell";
import { Button } from "@/components/ui/button";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import {
  ADMIN_UNAVAILABLE_MESSAGE,
  formatMessageTime,
  formatThreadTime,
  getThreadTitle,
  shortClientId,
} from "@/features/admin/formatters";
import { isAdminEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

function ChatAdminInbox({ adminSecret }: { adminSecret: string }) {
  const conversations = useQuery(api.chat.listForAdmin, { adminSecret });
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"chatThreads"> | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const visibleConversations = useMemo(
    () => conversations?.filter((conversation) => conversation.latestMessage) ?? [],
    [conversations],
  );
  const selectedThread = useMemo(() => {
    if (!visibleConversations || !selectedThreadId) return null;
    return visibleConversations.find((conversation) => conversation._id === selectedThreadId) ?? null;
  }, [selectedThreadId, visibleConversations]);
  const threadDetail = useQuery(
    api.chat.getThreadForAdmin,
    adminSecret && selectedThreadId ? { adminSecret, threadId: selectedThreadId } : "skip",
  );
  const markThreadRead = useMutation(api.chat.markThreadReadForAdmin);

  useEffect(() => {
    if (visibleConversations.length === 0) return;
    if (
      selectedThreadId &&
      visibleConversations.some((conversation) => conversation._id === selectedThreadId)
    ) {
      return;
    }
    setSelectedThreadId(visibleConversations[0]._id);
  }, [selectedThreadId, visibleConversations]);

  useEffect(() => {
    if (
      selectedThreadId &&
      visibleConversations &&
      !visibleConversations.some((conversation) => conversation._id === selectedThreadId)
    ) {
      setIsThreadOpen(false);
    }
  }, [selectedThreadId, visibleConversations]);

  useEffect(() => {
    if (!adminSecret || !selectedThreadId || !threadDetail?.thread.unread) return;

    void markThreadRead({
      adminSecret,
      threadId: selectedThreadId,
    });
  }, [adminSecret, markThreadRead, selectedThreadId, threadDetail?.thread.unread]);

  if (conversations === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground">Loading chats...</p>
      </div>
    );
  }

  if (conversations === null || threadDetail === null) {
    return (
      <div className="m-4 max-w-md rounded-[8px] border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {ADMIN_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  if (visibleConversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background/50 px-5 text-center">
        <Inbox aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No chats yet.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          New bot conversations will show up here as soon as visitors send a message.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-card lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 flex-col border-b border-border lg:flex lg:border-b-0 lg:border-r",
          isThreadOpen ? "hidden" : "flex",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <MessageCircle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Conversations</p>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {visibleConversations.filter((conversation) => conversation.unread).length} unread
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleConversations.map((conversation) => {
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
                onClick={() => {
                  setSelectedThreadId(conversation._id);
                  setIsThreadOpen(true);
                }}
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

      <section
        className={cn(
          "min-h-0 min-w-0 flex-col bg-background/55 lg:flex",
          isThreadOpen ? "flex" : "hidden",
        )}
      >
        {selectedThread && threadDetail ? (
          <>
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-ml-2 h-8 w-8 shrink-0 rounded-[7px] text-muted-foreground hover:text-foreground lg:hidden"
                  aria-label="Back to conversations"
                  onClick={() => setIsThreadOpen(false)}
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getThreadTitle(selectedThread)}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {shortClientId(selectedThread.clientId)} · started{" "}
                  {formatMessageTime(selectedThread.createdAt)}
                </p>
                </div>
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

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:px-4 lg:py-5">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {threadDetail.messages.map((message) => {
                  const isVisitor = message.author === "visitor";

                  return (
                    <Message
                      key={message._id}
                      from={isVisitor ? "user" : "assistant"}
                    >
                      <MessageContent className="max-w-[88%] lg:max-w-[82%]">
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
                        <MessageResponse>{message.body}</MessageResponse>
                        <time className="block text-right font-mono text-[10px] opacity-70">
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </MessageContent>
                    </Message>
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
  if (!isAdminEnabled) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background p-6">
        <FeatureUnavailable
          title="Chat admin is not configured"
          description="Set NEXT_PUBLIC_CONVEX_URL and run Convex to enable the private chat inbox."
        />
      </main>
    );
  }

  return (
    <AdminShell
      activePath="/admin"
      title="Chat inbox"
    >
      {(adminSecret) => <ChatAdminInbox adminSecret={adminSecret} />}
    </AdminShell>
  );
}
