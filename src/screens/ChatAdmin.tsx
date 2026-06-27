"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bot, Inbox, MailOpen, MessageCircle, Send, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function AdminMessageMarkdown({
  children,
  inverse = false,
}: {
  children: string;
  inverse?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href, ...props }) => (
          <a
            className="underline underline-offset-2"
            href={href}
            rel="noreferrer"
            target="_blank"
            {...props}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote
            className={cn(
              "my-2 border-l-2 pl-3 italic",
              inverse ? "border-white/45" : "border-border text-muted-foreground",
            )}
          >
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code
            className={cn(
              "rounded px-1 py-0.5 text-[0.85em]",
              inverse ? "bg-white/15" : "bg-muted",
            )}
          >
            {children}
          </code>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        pre: ({ children }) => (
          <pre
            className={cn(
              "my-2 overflow-x-auto rounded-[6px] p-3 text-xs",
              inverse ? "bg-black/15" : "bg-muted",
            )}
          >
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        td: ({ children }) => (
          <td
            className={cn(
              "border px-2 py-1 align-top",
              inverse ? "border-white/25" : "border-border",
            )}
          >
            {children}
          </td>
        ),
        th: ({ children }) => (
          <th
            className={cn(
              "border px-2 py-1 text-left align-top font-medium",
              inverse ? "border-white/25" : "border-border",
            )}
          >
            {children}
          </th>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function ChatAdminInbox({ adminSecret }: { adminSecret: string }) {
  const conversations = useQuery(api.chat.listForAdmin, { adminSecret });
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"chatThreads"> | null>(null);
  const visibleConversations = useMemo(() => {
    if (!conversations) return conversations;
    return conversations.filter((conversation) => conversation.latestMessage);
  }, [conversations]);
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
    if (!visibleConversations || visibleConversations.length === 0) return;
    if (
      selectedThreadId &&
      visibleConversations.some((conversation) => conversation._id === selectedThreadId)
    ) {
      return;
    }
    setSelectedThreadId(visibleConversations[0]._id);
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
          That password did not work, or the admin secret is not configured.
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
      <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
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

      <section className="flex min-h-0 min-w-0 flex-col bg-background/55">
        {selectedThread && threadDetail ? (
          <>
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
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
                      <div className="text-sm leading-relaxed">
                        <AdminMessageMarkdown inverse={isVisitor}>
                          {message.body}
                        </AdminMessageMarkdown>
                      </div>
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
    >
      {(adminSecret) => <ChatAdminInbox adminSecret={adminSecret} />}
    </AdminShell>
  );
}
