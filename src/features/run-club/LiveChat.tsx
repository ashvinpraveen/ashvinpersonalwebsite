"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { avatarColor } from "./browser";
import { MAX_CHAT_LENGTH } from "./config";

export type ChatMessage = {
  _id: string;
  clientId: string;
  displayName: string;
  avatarHue: number;
  body: string;
  createdAt: number;
};

type LiveChatProps = {
  messages: ChatMessage[] | undefined;
  selfClientId?: string;
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function LiveChat({
  messages,
  selfClientId,
  onSend,
  disabled,
}: LiveChatProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages?.length]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      await onSend(body);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {!messages ? (
          <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[color:var(--run-muted)]">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const mine = message.clientId === selfClientId;
            return (
              <div
                key={message._id}
                className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColor(message.avatarHue) }}
                  aria-hidden
                >
                  {(message.displayName[0] || "?").toUpperCase()}
                </div>
                <div className={`max-w-[80%] ${mine ? "text-right" : ""}`}>
                  <div className="mb-0.5 flex items-baseline gap-2 text-[11px] text-[color:var(--run-muted)]">
                    <span className="font-medium text-[color:var(--run-ink)]">
                      {mine ? "You" : message.displayName}
                    </span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <p
                    className={`inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      mine
                        ? "bg-[color:var(--run-accent)] text-[#123526]"
                        : "bg-[color:var(--run-panel)] text-[color:var(--run-ink)]"
                    }`}
                  >
                    {message.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2 border-t border-[color:var(--run-line)] pt-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHAT_LENGTH))}
          placeholder={disabled ? "Join to chat" : "Message"}
          disabled={disabled || sending}
          className="min-w-0 flex-1 rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-2.5 text-base text-[color:var(--run-ink)] outline-none placeholder:text-[color:var(--run-muted)] focus:border-[color:var(--run-accent-deep)]"
          maxLength={MAX_CHAT_LENGTH}
        />
        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--run-ink)] text-[color:var(--run-accent)] transition enabled:hover:bg-[#1a4634] disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
