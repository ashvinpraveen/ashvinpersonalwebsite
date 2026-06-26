"use client";

import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronDown, Compass, History, Maximize2, MessageSquarePlus, Minimize2, Minus, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CLIENT_ID_KEY = "ashvin-chat-client-id";
const MODEL_PROVIDER_KEY = "ashvin-chat-model-provider";
const PET_POSITION_KEY = "ashvin-pet-position";
const MAX_MESSAGE_LENGTH = 900;
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_IMAGE_DIMENSION = 1024;
const DEFAULT_SIDE_PANEL_WIDTH = 320;
const MIN_SIDE_PANEL_WIDTH = 280;
const MAX_SIDE_PANEL_WIDTH = 520;
const COMPACT_PAGE_WIDTH = 768;
const PET_VIEWPORT_MARGIN = 12;
const PET_DRAG_THRESHOLD = 5;
const SIDE_PANEL_ANIMATION_MS = 220;
const SITE_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/blog", label: "Writing" },
  { path: "/resources", label: "Resources" },
  { path: "/text", label: "Text me" },
  { path: "/postcard", label: "Postcard" },
  { path: "/postcards", label: "Postcards" },
] as const;
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  projects: "Projects",
  about: "About",
  writing: "Writing",
  involvement: "Involvement",
  resources: "Resources",
  contact: "Contact",
};

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

type PageContext = {
  url: string;
  path: string;
  title: string;
  timeZone: string;
  visibleText: string;
  sections: Array<{
    id: string;
    label: string;
  }>;
  links: Array<{
    label: string;
    href: string;
  }>;
};

type ChatToolCall =
  | {
      name: "navigate_site";
      args: {
        path: string;
        reason?: string;
      };
    }
  | {
      name: "scroll_to_section";
      args: {
        sectionId: string;
        reason?: string;
      };
    }
  | {
      name: "highlight_section";
      args: {
        sectionId: string;
        reason?: string;
      };
    };

type ModelProvider = "ilmu" | "gemini";
type AshvinPetAnimation = "idle" | "chat" | "drag";
type PetPosition = {
  x: number;
  y: number;
};
type PetDragState = {
  dragging: boolean;
  pointerId: number;
  previousUserSelect: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

const MODEL_OPTIONS: Array<{ label: string; value: ModelProvider }> = [
  { label: "Ilmu", value: "ilmu" },
  { label: "Gemini", value: "gemini" },
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

function getStoredModelProvider(): ModelProvider {
  const storedProvider = window.localStorage.getItem(MODEL_PROVIDER_KEY);
  return storedProvider === "gemini" ? "gemini" : "ilmu";
}

function getRouteLabel(path: string) {
  if (path.startsWith("/blog/")) return "Blog post";
  return SITE_ROUTES.find((route) => route.path === path)?.label ?? "This page";
}

function clampPetPosition(position: PetPosition, size: { width: number; height: number }): PetPosition {
  const maxX = Math.max(PET_VIEWPORT_MARGIN, window.innerWidth - size.width - PET_VIEWPORT_MARGIN);
  const maxY = Math.max(PET_VIEWPORT_MARGIN, window.innerHeight - size.height - PET_VIEWPORT_MARGIN);

  return {
    x: clamp(position.x, PET_VIEWPORT_MARGIN, maxX),
    y: clamp(position.y, PET_VIEWPORT_MARGIN, maxY),
  };
}

function getDefaultPetPosition(size: { width: number; height: number }): PetPosition {
  const horizontalMargin = window.matchMedia("(min-width: 640px)").matches ? 20 : 12;
  const verticalMargin = window.matchMedia("(min-width: 640px)").matches ? 32 : 24;

  return {
    x: window.innerWidth - size.width - horizontalMargin,
    y: window.innerHeight - size.height - verticalMargin,
  };
}

function getStoredPetPosition() {
  try {
    const storedPosition = window.localStorage.getItem(PET_POSITION_KEY);
    if (!storedPosition) return null;
    const parsedPosition = JSON.parse(storedPosition) as Partial<PetPosition>;
    if (typeof parsedPosition.x !== "number" || typeof parsedPosition.y !== "number") return null;
    return { x: parsedPosition.x, y: parsedPosition.y };
  } catch {
    return null;
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function collectPageContext(path: string): PageContext {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"))
    .map((section) => ({
      id: section.id,
      label:
        section.getAttribute("aria-label") ||
        section.querySelector("h1, h2, h3")?.textContent?.trim() ||
        SECTION_LABELS[section.id] ||
        section.id,
    }))
    .filter((section) => section.id && section.label)
    .slice(0, 12);
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("main a[href]"))
    .map((link) => ({
      label: normalizeText(link.textContent ?? "").slice(0, 80),
      href: link.getAttribute("href") ?? "",
    }))
    .filter((link) => link.label && link.href)
    .slice(0, 12);
  const mainText = normalizeText(document.querySelector("main")?.textContent ?? "");
  const pageHeading = normalizeText(document.querySelector("h1")?.textContent ?? "");
  const title = pageHeading || getRouteLabel(path);

  return {
    url: window.location.href,
    path,
    title,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur",
    visibleText: mainText.slice(0, 900),
    sections,
    links,
  };
}

function isSafeSitePath(path: string) {
  return SITE_ROUTES.some((route) => route.path === path);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function GeneratedAshvinPet({
  animation = "idle",
  compact = false,
}: {
  animation?: AshvinPetAnimation;
  compact?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ashvin-pet",
        animation === "drag"
          ? "ashvin-pet--drag"
          : animation === "chat"
            ? "ashvin-pet--chat"
            : "ashvin-pet--idle",
        compact && "ashvin-pet--compact",
      )}
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

function getChatErrorDescription(error: unknown) {
  const fallback = "Please try again in a minute.";
  if (!(error instanceof Error)) return fallback;

  const cleanedMessage = error.message
    .replace(/^\[CONVEX [^\]]+\]\s+\[Request ID:[^\]]+\]\s+Server Error\s*/i, "")
    .replace(/^(Uncaught Error:\s*)+/i, "")
    .replace(/\n\s*at\s+[\s\S]*$/i, "")
    .trim();

  if (cleanedMessage && !/^called by client$/i.test(cleanedMessage)) {
    return cleanedMessage;
  }

  return fallback;
}

function ChatWidgetInner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<Id<"chatThreads"> | undefined>();
  const [clientId, setClientId] = useState("");
  const [message, setMessage] = useState("");
  const [modelProvider, setModelProvider] = useState<ModelProvider>("ilmu");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<MobileViewport | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [petPosition, setPetPosition] = useState<PetPosition | null>(null);
  const [isPetDragging, setIsPetDragging] = useState(false);
  const [sidePanelWidth, setSidePanelWidth] = useState(DEFAULT_SIDE_PANEL_WIDTH);
  const [isSidePanelExiting, setIsSidePanelExiting] = useState(false);
  const chatPanelRef = useRef<HTMLElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const petDragRef = useRef<PetDragState | null>(null);
  const sidePanelExitTimeoutRef = useRef<number | null>(null);
  const ignoreLauncherClickRef = useRef(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const chat = useQuery(
    api.chat.getForClient,
    clientId ? { clientId, threadId: activeThreadId } : "skip",
  );
  const sendMessage = useAction(api.chatAi.send);
  const startNewChat = useMutation(api.chat.startNewForClient);

  const messages = chat?.messages ?? [];
  const threads = chat?.threads ?? [];
  const hasConversation = messages.length > 0;
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const petAnimation: AshvinPetAnimation = isPetDragging ? "drag" : isOpen || isSidePanelOpen ? "chat" : "idle";

  useEffect(() => {
    setClientId(getOrCreateClientId());
    setModelProvider(getStoredModelProvider());
  }, []);

  useEffect(() => {
    const launcherRect = launcherRef.current?.getBoundingClientRect();
    const launcherSize = {
      width: launcherRect?.width ?? 80,
      height: launcherRect?.height ?? 80,
    };
    const initialPosition = getStoredPetPosition() ?? getDefaultPetPosition(launcherSize);
    setPetPosition(clampPetPosition(initialPosition, launcherSize));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const launcherRect = launcherRef.current?.getBoundingClientRect();
      const launcherSize = {
        width: launcherRect?.width ?? 80,
        height: launcherRect?.height ?? 80,
      };

      setPetPosition((currentPosition) =>
        currentPosition ? clampPetPosition(currentPosition, launcherSize) : currentPosition,
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const updatePageContext = () => {
      setPageContext(collectPageContext(pathname || window.location.pathname));
    };

    updatePageContext();
    const timeoutId = window.setTimeout(updatePageContext, 250);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
    inputRef.current?.focus();
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (!isOpen || isSidePanelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (chatPanelRef.current?.contains(target) || launcherRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      setIsSidePanelOpen(false);
      setIsHistoryOpen(false);
      setIsModelMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, isSidePanelOpen]);

  useEffect(() => {
    return () => {
      if (sidePanelExitTimeoutRef.current) {
        window.clearTimeout(sidePanelExitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId && chat?.thread?._id) {
      setActiveThreadId(chat.thread._id);
    }
  }, [activeThreadId, chat?.thread?._id]);

  useEffect(() => {
    if (!isModelMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModelMenuOpen(false);
        inputRef.current?.focus();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModelMenuOpen]);

  useEffect(() => {
    if (!isSidePanelOpen) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    if (!mediaQuery.matches) return;

    const previousPaddingRight = document.body.style.paddingRight;
    const previousTransition = document.body.style.transition;
    document.body.style.transition = previousTransition
      ? `${previousTransition}, padding-right 180ms ease`
      : "padding-right 180ms ease";

    return () => {
      document.body.style.paddingRight = previousPaddingRight;
      document.body.style.transition = previousTransition;
    };
  }, [isSidePanelOpen]);

  useEffect(() => {
    if (!isSidePanelOpen) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    if (!mediaQuery.matches) return;

    document.body.style.paddingRight = `${sidePanelWidth}px`;
  }, [isSidePanelOpen, sidePanelWidth]);

  useEffect(() => {
    const clearChatLayout = () => {
      delete document.body.dataset.chatLayout;
      document.body.style.removeProperty("--chat-main-width");
      document.body.style.removeProperty("--chat-side-width");
    };

    if (!isSidePanelOpen) {
      clearChatLayout();
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    if (!mediaQuery.matches) {
      clearChatLayout();
      return;
    }

    const updateChatLayout = () => {
      const mainWidth = window.innerWidth - sidePanelWidth;
      document.body.style.setProperty("--chat-main-width", `${mainWidth}px`);
      document.body.style.setProperty("--chat-side-width", `${sidePanelWidth}px`);
      document.body.dataset.chatLayout = mainWidth < COMPACT_PAGE_WIDTH ? "compact" : "wide";
    };

    updateChatLayout();
    window.addEventListener("resize", updateChatLayout);

    return () => {
      window.removeEventListener("resize", updateChatLayout);
      clearChatLayout();
    };
  }, [isSidePanelOpen, sidePanelWidth]);

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
  const widgetStyle = {
    ...mobileViewportStyle,
    "--chat-side-width": `${sidePanelWidth}px`,
  } as CSSProperties;
  const launcherStyle = petPosition
    ? ({
        bottom: "auto",
        left: `${petPosition.x}px`,
        right: "auto",
        top: `${petPosition.y}px`,
      } as CSSProperties)
    : undefined;
  const contextPillText = pageContext
    ? `${getRouteLabel(pageContext.path)} · ${pageContext.title}`
    : "Reading this page";

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function highlightSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    section.classList.add("chat-section-highlight");
    window.setTimeout(() => {
      section.classList.remove("chat-section-highlight");
    }, 1800);
    return true;
  }

  function applyToolCalls(toolCalls: ChatToolCall[]) {
    for (const toolCall of toolCalls) {
      if (toolCall.name === "navigate_site" && isSafeSitePath(toolCall.args.path)) {
        router.push(toolCall.args.path);
        continue;
      }

      if (toolCall.name === "scroll_to_section") {
        const didScroll = scrollToSection(toolCall.args.sectionId);
        if (!didScroll) {
          router.push(`/#${toolCall.args.sectionId}`);
          window.setTimeout(() => {
            scrollToSection(toolCall.args.sectionId);
          }, 450);
        }
        continue;
      }

      if (toolCall.name === "highlight_section") {
        const didHighlight = highlightSection(toolCall.args.sectionId);
        if (!didHighlight) {
          router.push(`/#${toolCall.args.sectionId}`);
          window.setTimeout(() => {
            highlightSection(toolCall.args.sectionId);
          }, 450);
        }
      }
    }
  }

  function handleSideResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidePanelWidth;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSidePanelWidth(
        clamp(startWidth + startX - moveEvent.clientX, MIN_SIDE_PANEL_WIDTH, MAX_SIDE_PANEL_WIDTH),
      );
    };
    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePetPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    const launcherRect = event.currentTarget.getBoundingClientRect();
    const startPosition = petPosition ?? {
      x: launcherRect.left,
      y: launcherRect.top,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    petDragRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      previousUserSelect: document.body.style.userSelect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: startPosition.x,
      startY: startPosition.y,
    };
  }

  function handlePetPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = petDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    if (!dragState.dragging && Math.hypot(deltaX, deltaY) < PET_DRAG_THRESHOLD) return;

    if (!dragState.dragging) {
      dragState.dragging = true;
      document.body.style.userSelect = "none";
      setIsPetDragging(true);
    }

    const launcherRect = event.currentTarget.getBoundingClientRect();
    setPetPosition(
      clampPetPosition(
        {
          x: dragState.startX + deltaX,
          y: dragState.startY + deltaY,
        },
        launcherRect,
      ),
    );
  }

  function handlePetPointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = petDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    document.body.style.userSelect = dragState.previousUserSelect;
    if (dragState.dragging) {
      ignoreLauncherClickRef.current = true;
      setIsPetDragging(false);
      setPetPosition((currentPosition) => {
        if (currentPosition) {
          window.localStorage.setItem(PET_POSITION_KEY, JSON.stringify(currentPosition));
        }
        return currentPosition;
      });
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    petDragRef.current = null;
  }

  function clearSidePanelExitTimeout() {
    if (sidePanelExitTimeoutRef.current) {
      window.clearTimeout(sidePanelExitTimeoutRef.current);
      sidePanelExitTimeoutRef.current = null;
    }
  }

  function openSidePanel() {
    clearSidePanelExitTimeout();
    setIsOpen(true);
    setIsSidePanelExiting(false);
    setIsSidePanelOpen(true);
  }

  function contractSidePanel() {
    if (!isSidePanelOpen) {
      openSidePanel();
      return;
    }

    clearSidePanelExitTimeout();
    setIsSidePanelExiting(true);
    sidePanelExitTimeoutRef.current = window.setTimeout(() => {
      setIsSidePanelOpen(false);
      setIsSidePanelExiting(false);
      sidePanelExitTimeoutRef.current = null;
    }, SIDE_PANEL_ANIMATION_MS);
  }

  function minimizeChat() {
    clearSidePanelExitTimeout();
    setIsHistoryOpen(false);
    setIsModelMenuOpen(false);

    if (!isSidePanelOpen) {
      setIsOpen(false);
      return;
    }

    setIsSidePanelExiting(true);
    sidePanelExitTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsSidePanelOpen(false);
      setIsSidePanelExiting(false);
      sidePanelExitTimeoutRef.current = null;
    }, SIDE_PANEL_ANIMATION_MS);
  }

  function handlePetClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (ignoreLauncherClickRef.current) {
      ignoreLauncherClickRef.current = false;
      event.preventDefault();
      return;
    }

    if (isOpen) {
      minimizeChat();
      return;
    }

    clearSidePanelExitTimeout();
    setIsSidePanelOpen(false);
    setIsSidePanelExiting(false);
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || isSending) return;

    const body = message.trim();
    if (!body && attachedImages.length === 0) return;

    setIsSending(true);
    try {
      const latestPageContext = collectPageContext(pathname || window.location.pathname);
      setPageContext(latestPageContext);
      const result = await sendMessage({
        clientId,
        threadId: activeThreadId,
        body: body || "Please look at the attached image.",
        modelProvider,
        pageContext: latestPageContext,
        images: attachedImages.map((image) => ({
          data: image.data,
          mimeType: image.mimeType,
        })),
      });
      applyToolCalls(result.toolCalls ?? []);
      setMessage("");
      setAttachedImages([]);
    } catch (error) {
      const description = getChatErrorDescription(error);
      console.warn("AI Ashvin message failed:", description);
      toast.error("Message not sent", {
        description,
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

  function handleModelProviderChange(nextProvider: ModelProvider) {
    setModelProvider(nextProvider);
    window.localStorage.setItem(MODEL_PROVIDER_KEY, nextProvider);
    setIsModelMenuOpen(false);
    inputRef.current?.focus();
  }

  if (isAdminRoute) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2",
        isSidePanelOpen
          ? "bottom-0 right-0 top-0 hidden sm:flex sm:w-[var(--chat-side-width)]"
          : isOpen
            ? "left-0 right-0 top-[var(--chat-mobile-top,0px)] h-[var(--chat-mobile-height,100dvh)] max-w-none sm:inset-auto sm:bottom-24 sm:right-5 sm:top-auto sm:h-auto sm:max-w-[calc(100vw-1.5rem)]"
          : "bottom-6 right-3 sm:bottom-8 sm:right-5",
      )}
      style={widgetStyle}
    >
      {isOpen ? (
        <section
          ref={chatPanelRef}
          className={cn(
            "relative flex flex-col overflow-hidden bg-card/95 backdrop-blur-xl sm:bg-card/75",
            isSidePanelOpen
              ? isSidePanelExiting
                ? "chat-side-panel-exit"
                : "chat-side-panel-enter"
              : "chat-panel-enter",
            isSidePanelOpen
              ? "h-dvh w-full rounded-none border-0 shadow-none"
              : "h-full w-full rounded-none shadow-2xl sm:h-auto sm:w-[min(15rem,calc(100vw-1.5rem))] sm:rounded-lg sm:border sm:border-border",
          )}
        >
          {isSidePanelOpen ? (
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 hidden h-full w-2 cursor-col-resize touch-none sm:block"
              onPointerDown={handleSideResizeStart}
            />
          ) : null}
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
                aria-label={isSidePanelOpen ? "Contract chat" : "Expand chat"}
                onClick={() => {
                  if (isSidePanelOpen) {
                    contractSidePanel();
                  } else {
                    openSidePanel();
                  }
                }}
              >
                {isSidePanelOpen ? (
                  <Minimize2 aria-hidden="true" />
                ) : (
                  <Maximize2 aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Minimize chat"
                onClick={minimizeChat}
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
              "flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-3",
              isSidePanelOpen
                ? "flex-1"
                : "flex-1 sm:h-[12rem] sm:max-h-[min(12rem,calc(70dvh-10rem))] sm:flex-none",
            )}
          >
            {hasConversation ? (
              messages.map((item) => (
                <div
                  key={item._id}
                  className={cn(
                    "text-sm leading-relaxed",
                    item.author === "visitor"
                      ? "ml-auto max-w-[82%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                      : "mr-auto w-full max-w-none px-0 py-1 text-foreground",
                  )}
                >
                  {item.author === "ashvin" ? (
                    <ChatMarkdown>{item.body}</ChatMarkdown>
                  ) : (
                    item.body
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <p className="text-base font-medium text-foreground">How can I help?</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Ashvin here, chat with me about anything.
                </p>
              </div>
            )}
            {isSending ? (
              <div className="mr-auto w-full max-w-none px-0 py-1 text-sm text-muted-foreground">
                Thinking...
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-3 pt-1 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:p-3 sm:pt-1"
          >
            <div className="overflow-hidden rounded-3xl bg-muted/70">
              <div className="px-3 pt-3">
                <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Compass aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{contextPillText}</span>
                </div>
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
                className="min-h-20 resize-none border-0 bg-transparent px-3 py-3 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                <div ref={modelMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    aria-label="Model"
                    aria-haspopup="listbox"
                    aria-expanded={isModelMenuOpen}
                    className="flex h-8 min-w-20 items-center justify-between gap-2 rounded-full bg-background/50 px-3 text-xs text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setIsModelMenuOpen((value) => !value)}
                  >
                    <span>{MODEL_OPTIONS.find((option) => option.value === modelProvider)?.label}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isModelMenuOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isModelMenuOpen ? (
                    <div
                      role="listbox"
                      aria-label="Model"
                      className="absolute bottom-full right-0 z-10 mb-1 w-28 overflow-hidden rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur-xl"
                    >
                      {MODEL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={modelProvider === option.value}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            modelProvider === option.value
                              ? "text-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                          onClick={() => handleModelProviderChange(option.value)}
                        >
                          <span>{option.label}</span>
                          {modelProvider === option.value ? (
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
        ref={launcherRef}
        type="button"
        className={cn(
          "ashvin-pet-launcher",
          isPetDragging && "ashvin-pet-launcher--dragging",
          (isOpen || isSidePanelOpen) && "hidden sm:block",
          isSidePanelOpen && "sm:hidden",
        )}
        style={launcherStyle}
        onClick={handlePetClick}
        onPointerCancel={handlePetPointerEnd}
        onPointerDown={handlePetPointerDown}
        onPointerMove={handlePetPointerMove}
        onPointerUp={handlePetPointerEnd}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide AI Ashvin chat" : "Open AI Ashvin chat"}
      >
        <GeneratedAshvinPet animation={petAnimation} />
      </button>
    </div>
  );
}

export default function ChatWidget() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;

  return <ChatWidgetInner />;
}
