"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CLIENT_ID_KEY = "ashvin-chat-client-id";
const MAX_MESSAGE_LENGTH = 900;

function getOrCreateClientId() {
  const existingClientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existingClientId) return existingClientId;

  const clientId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

function GeneratedAshvinPet({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src="/ai-ashvin-pet.png"
      alt=""
      aria-hidden="true"
      className={cn("ashvin-pet", compact && "ashvin-pet--compact")}
      draggable={false}
    />
  );
}

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = useQuery(
    api.chat.getForClient,
    clientId ? { clientId } : "skip",
  );
  const sendMessage = useAction(api.chatAi.send);

  const messages = chat?.messages ?? [];
  const hasConversation = messages.length > 0;

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
    inputRef.current?.focus();
  }, [isOpen, messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || isSending) return;

    const body = message.trim();
    if (!body) return;

    setIsSending(true);
    try {
      await sendMessage({
        clientId,
        body,
      });
      setMessage("");
    } catch (error) {
      console.error(error);
      toast.error("Message not sent", {
        description: "AI Ashvin is having trouble right now. Please try again in a minute.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {isOpen ? (
        <section className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card/95 shadow-2xl backdrop-blur">
          <header className="flex items-center justify-between px-3 pb-1 pt-3">
            <div>
              <p className="text-sm font-semibold">Chat with AI Ashvin</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </header>

          <div
            ref={messageListRef}
            className="flex max-h-80 min-h-44 flex-col gap-2 overflow-y-auto px-3 py-3"
          >
            {!hasConversation ? (
              <div className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                Ask about my projects, AI, startups, Malaysia, or what I am
                learning in public.
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item._id}
                  className={cn(
                    "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    item.author === "visitor"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground",
                  )}
                >
                  {item.body}
                </div>
              ))
            )}
            {isSending ? (
              <div className="mr-auto max-w-[82%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="p-3 pt-1">
            <div className="relative rounded-3xl bg-muted/70 p-2.5 pr-14 shadow-inner">
              <Textarea
                ref={inputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask AI Ashvin something..."
                className="min-h-20 resize-none border-0 bg-transparent p-0 pr-1 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="absolute bottom-3 right-3 rounded-full"
                disabled={!message.trim() || isSending || !clientId}
              >
                <Send aria-hidden="true" />
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="ashvin-pet-launcher"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide AI Ashvin chat" : "Open AI Ashvin chat"}
      >
        <GeneratedAshvinPet />
      </button>
    </div>
  );
}

export default function ChatWidget() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;

  return <ChatWidgetInner />;
}
