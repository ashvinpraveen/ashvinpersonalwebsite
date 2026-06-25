"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ArrowUp, Minus, PanelRightOpen, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CLIENT_ID_KEY = "ashvin-chat-client-id";
const MAX_MESSAGE_LENGTH = 900;
const SUGGESTED_PROMPTS = [
  "What are you building?",
  "Tell me about Cleve",
  "What should I read first?",
];

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
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
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

  function closeChat() {
    setIsOpen(false);
    setIsSidePanelOpen(false);
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2",
        isSidePanelOpen
          ? "bottom-0 right-0 top-0 hidden sm:flex"
          : "bottom-6 right-3 sm:bottom-8 sm:right-5",
      )}
    >
      {isOpen ? (
        <section
          className={cn(
            "chat-panel-enter overflow-hidden border border-border bg-card/95 shadow-2xl backdrop-blur",
            isSidePanelOpen
              ? "flex h-dvh w-[24rem] flex-col rounded-none border-y-0 border-r-0"
              : "w-[min(20rem,calc(100vw-1.5rem))] rounded-lg",
          )}
        >
          <header className="flex items-center justify-between px-3 pb-1 pt-3">
            <div>
              <p className="text-sm font-semibold">Chat with AI Ashvin</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                aria-label="Open full side chat"
                onClick={() => setIsSidePanelOpen((value) => !value)}
              >
                <PanelRightOpen aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Minimize chat"
                onClick={() => {
                  setIsOpen(false);
                  setIsSidePanelOpen(false);
                }}
              >
                <Minus aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close chat"
                onClick={closeChat}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setMessage(prompt);
                  inputRef.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div
            ref={messageListRef}
            className={cn(
              "flex flex-col gap-2 overflow-y-auto px-3 py-3",
              isSidePanelOpen
                ? "min-h-0 flex-1"
                : "h-[24rem] max-h-[min(24rem,calc(100vh-13rem))]",
            )}
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
            <div className="relative rounded-3xl bg-muted/70 p-2.5 pr-14">
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
                placeholder="Ask me anything"
                className="min-h-20 resize-none border-0 bg-transparent p-0 pr-1 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="absolute bottom-3 right-3 rounded-full"
                disabled={!message.trim() || isSending || !clientId}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className={cn("ashvin-pet-launcher", isSidePanelOpen && "hidden")}
        onClick={() => {
          setIsSidePanelOpen(false);
          setIsOpen((value) => !value);
        }}
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
