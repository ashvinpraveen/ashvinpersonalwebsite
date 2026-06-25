"use client";

import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowUp, History, MessageSquarePlus, Minus, PanelRightOpen, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CLIENT_ID_KEY = "ashvin-chat-client-id";
const MAX_MESSAGE_LENGTH = 900;
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_IMAGE_DIMENSION = 1024;
const SUGGESTED_PROMPTS = [
  "What are you building?",
  "Tell me about Cleve",
  "What should I read first?",
];

type AttachedImage = {
  id: string;
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  name: string;
};

type MobileViewport = {
  height: number;
  top: number;
};

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

function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string) {
  if (mimeType === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.78);
}

async function compressImage(file: File): Promise<AttachedImage> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare image.");
    }
    context.drawImage(image, 0, 0, width, height);

    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return {
      id:
        typeof window.crypto?.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      data: canvasToDataUrl(canvas, mimeType).split(",")[1] ?? "",
      mimeType,
      name: file.name,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
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

function ChatMarkdown({ children }: { children: string }) {
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
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
        ),
        code: ({ children }) => (
          <code className="rounded bg-background/70 px-1 py-0.5 text-[0.85em]">
            {children}
          </code>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<Id<"chatThreads"> | undefined>();
  const [clientId, setClientId] = useState("");
  const [message, setMessage] = useState("");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<MobileViewport | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chat = useQuery(
    api.chat.getForClient,
    clientId ? { clientId, threadId: activeThreadId } : "skip",
  );
  const sendMessage = useAction(api.chatAi.send);
  const startNewChat = useMutation(api.chat.startNewForClient);

  const messages = chat?.messages ?? [];
  const threads = chat?.threads ?? [];
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

  useEffect(() => {
    if (!activeThreadId && chat?.thread?._id) {
      setActiveThreadId(chat.thread._id);
    }
  }, [activeThreadId, chat?.thread?._id]);

  useEffect(() => {
    if (!isSidePanelOpen) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    if (!mediaQuery.matches) return;

    const previousPaddingRight = document.body.style.paddingRight;
    const previousTransition = document.body.style.transition;
    document.body.style.paddingRight = "18rem";
    document.body.style.transition = previousTransition
      ? `${previousTransition}, padding-right 180ms ease`
      : "padding-right 180ms ease";

    return () => {
      document.body.style.paddingRight = previousPaddingRight;
      document.body.style.transition = previousTransition;
    };
  }, [isSidePanelOpen]);

  useEffect(() => {
    if (!isOpen || isSidePanelOpen) {
      setMobileViewport(null);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateMobileViewport = () => {
      setMobileViewport({
        height: Math.round(viewport.height),
        top: Math.round(viewport.offsetTop),
      });
    };

    updateMobileViewport();
    viewport.addEventListener("resize", updateMobileViewport);
    viewport.addEventListener("scroll", updateMobileViewport);
    window.addEventListener("orientationchange", updateMobileViewport);

    return () => {
      viewport.removeEventListener("resize", updateMobileViewport);
      viewport.removeEventListener("scroll", updateMobileViewport);
      window.removeEventListener("orientationchange", updateMobileViewport);
    };
  }, [isOpen, isSidePanelOpen]);

  const mobileViewportStyle = mobileViewport
    ? ({
        "--chat-mobile-height": `${mobileViewport.height}px`,
        "--chat-mobile-top": `${mobileViewport.top}px`,
      } as CSSProperties)
    : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || isSending) return;

    const body = message.trim();
    if (!body && attachedImages.length === 0) return;

    setIsSending(true);
    try {
      await sendMessage({
        clientId,
        threadId: activeThreadId,
        body: body || "Please look at the attached image.",
        images: attachedImages.map((image) => ({
          data: image.data,
          mimeType: image.mimeType,
        })),
      });
      setMessage("");
      setAttachedImages([]);
    } catch (error) {
      console.error(error);
      toast.error("Message not sent", {
        description: "AI Ashvin is having trouble right now. Please try again in a minute.",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleNewChat() {
    if (!clientId) return;

    try {
      const threadId = await startNewChat({ clientId });
      setActiveThreadId(threadId);
      setMessage("");
      setAttachedImages([]);
      setIsHistoryOpen(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error(error);
      toast.error("Could not start chat", {
        description: "Try again in a moment.",
      });
    }
  }

  async function handleImageSelection(files: FileList | null) {
    if (!files?.length) return;

    const openSlots = MAX_IMAGE_ATTACHMENTS - attachedImages.length;
    if (openSlots <= 0) {
      toast.error("Only 3 images", {
        description: "Remove an image before attaching another one.",
      });
      return;
    }

    const imageFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, openSlots);

    if (imageFiles.length === 0) {
      toast.error("Images only", {
        description: "Attach a PNG, JPG, or similar image file.",
      });
      return;
    }

    try {
      const compressedImages = await Promise.all(imageFiles.map(compressImage));
      setAttachedImages((currentImages) => [
        ...currentImages,
        ...compressedImages.filter((image) => image.data),
      ].slice(0, MAX_IMAGE_ATTACHMENTS));
    } catch (error) {
      console.error(error);
      toast.error("Image not attached", {
        description: "That image could not be prepared. Try another one.",
      });
    }
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2",
        isSidePanelOpen
          ? "bottom-0 right-0 top-0 hidden sm:flex"
          : isOpen
            ? "left-0 right-0 top-[var(--chat-mobile-top,0px)] h-[var(--chat-mobile-height,100dvh)] max-w-none sm:inset-auto sm:bottom-8 sm:right-5 sm:top-auto sm:h-auto sm:max-w-[calc(100vw-1.5rem)]"
          : "bottom-6 right-3 sm:bottom-8 sm:right-5",
      )}
      style={mobileViewportStyle}
    >
      {isOpen ? (
        <section
          className={cn(
            "chat-panel-enter flex flex-col overflow-hidden bg-card/95 shadow-2xl backdrop-blur-xl sm:border sm:border-border sm:bg-card/75",
            isSidePanelOpen
              ? "h-dvh w-[18rem] rounded-none border-y-0 border-r-0"
              : "h-full w-full rounded-none sm:h-auto sm:w-[min(15rem,calc(100vw-1.5rem))] sm:rounded-lg",
          )}
        >
          <header className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
            <div>
              <p className="text-sm font-semibold">Chat</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="New chat"
                onClick={() => {
                  void handleNewChat();
                }}
              >
                <MessageSquarePlus aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Chat history"
                onClick={() => setIsHistoryOpen((value) => !value)}
              >
                <History aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 sm:inline-flex"
                aria-label="Open full side chat"
                onClick={() => setIsSidePanelOpen((value) => !value)}
              >
                <PanelRightOpen aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Minimize chat"
                onClick={() => {
                  setIsOpen(false);
                  setIsSidePanelOpen(false);
                  setIsHistoryOpen(false);
                }}
              >
                <Minus aria-hidden="true" />
              </Button>
            </div>
          </header>

          {isHistoryOpen ? (
            <div className="mx-3 mb-2 rounded-md border border-border bg-background/60 p-1.5">
              {threads.length > 0 ? (
                <div className="space-y-1">
                  {threads.map((thread) => (
                    <button
                      key={thread._id}
                      type="button"
                      className={cn(
                        "block w-full truncate rounded px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                        thread._id === chat?.thread?._id && "bg-muted text-foreground",
                      )}
                      onClick={() => {
                        setActiveThreadId(thread._id);
                        setIsHistoryOpen(false);
                      }}
                    >
                      {thread.title ?? "New chat"}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet.</p>
              )}
            </div>
          ) : null}

          <div
            ref={messageListRef}
            className={cn(
              "flex min-h-0 flex-col gap-2 overflow-y-auto px-3 py-3",
              isSidePanelOpen
                ? "flex-1"
                : "flex-1 sm:h-[12rem] sm:max-h-[min(12rem,calc(70dvh-10rem))] sm:flex-none",
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
                  {item.author === "ashvin" ? (
                    <ChatMarkdown>{item.body}</ChatMarkdown>
                  ) : (
                    item.body
                  )}
                </div>
              ))
            )}
            {isSending ? (
              <div className="mr-auto max-w-[82%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-3 pt-1 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:p-3 sm:pt-1"
          >
            <div className="overflow-hidden rounded-3xl bg-muted/70">
              <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full bg-background/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setMessage(prompt);
                      inputRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
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
                className="min-h-20 resize-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex min-h-12 items-center justify-between gap-2 px-2.5 pb-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleImageSelection(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Attach images"
                    className="h-8 w-8 shrink-0 rounded-full"
                    disabled={attachedImages.length >= MAX_IMAGE_ATTACHMENTS}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                  {attachedImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border bg-background/70"
                    >
                      <img
                        src={`data:${image.mimeType};base64,${image.data}`}
                        alt={image.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${image.name}`}
                        className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-background opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => {
                          setAttachedImages((currentImages) =>
                            currentImages.filter((currentImage) => currentImage.id !== image.id),
                          );
                        }}
                      >
                        <X aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  className="h-8 w-8 shrink-0 rounded-full"
                  disabled={(!message.trim() && attachedImages.length === 0) || isSending || !clientId}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className={cn("ashvin-pet-launcher", (isOpen || isSidePanelOpen) && "hidden sm:block", isSidePanelOpen && "sm:hidden")}
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
