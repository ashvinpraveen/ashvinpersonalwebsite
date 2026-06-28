import {
  CLIENT_ID_KEY,
  MAX_IMAGE_DIMENSION,
  MAX_INPUT_ROWS,
  MODEL_PROVIDER_KEY,
  PET_POSITION_KEY,
  PET_VIEWPORT_MARGIN,
  SECTION_LABELS,
  SITE_ROUTES,
} from "./config";
import type { AttachedImage, ModelProvider, PageContext, PetPosition } from "./types";

export function getOrCreateClientId() {
  const existingClientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existingClientId) return existingClientId;

  const clientId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

export function getStoredModelProvider(): ModelProvider {
  const storedProvider = window.localStorage.getItem(MODEL_PROVIDER_KEY);
  return storedProvider === "gemini" ? "gemini" : "ilmu";
}

export function getRouteLabel(path: string) {
  if (path.startsWith("/blog/")) return "Blog post";
  return SITE_ROUTES.find((route) => route.path === path)?.label ?? "This page";
}

export function clampPetPosition(
  position: PetPosition,
  size: { width: number; height: number },
): PetPosition {
  const maxX = Math.max(PET_VIEWPORT_MARGIN, window.innerWidth - size.width - PET_VIEWPORT_MARGIN);
  const maxY = Math.max(PET_VIEWPORT_MARGIN, window.innerHeight - size.height - PET_VIEWPORT_MARGIN);

  return {
    x: clamp(position.x, PET_VIEWPORT_MARGIN, maxX),
    y: clamp(position.y, PET_VIEWPORT_MARGIN, maxY),
  };
}

export function getDefaultPetPosition(size: { width: number; height: number }): PetPosition {
  const horizontalMargin = window.matchMedia("(min-width: 640px)").matches ? 20 : 12;
  const verticalMargin = window.matchMedia("(min-width: 640px)").matches ? 32 : 24;

  return {
    x: window.innerWidth - size.width - horizontalMargin,
    y: window.innerHeight - size.height - verticalMargin,
  };
}

export function getStoredPetPosition() {
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

export function collectPageContext(path: string): PageContext {
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

export function isSafeSitePath(path: string) {
  return SITE_ROUTES.some((route) => route.path === path);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function shouldContainScroll(element: HTMLElement, deltaY: number) {
  if (Math.abs(deltaY) < 0.01) return false;

  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) return true;

  const isAtTop = element.scrollTop <= 0;
  const isAtBottom = element.scrollTop >= maxScrollTop - 1;

  return (deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom);
}

export function resizeChatInput(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";

  const styles = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
  const maxHeight = lineHeight * MAX_INPUT_ROWS + paddingTop + paddingBottom;
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string) {
  if (mimeType === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.78);
}

export async function compressImage(file: File): Promise<AttachedImage> {
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

export function getChatErrorDescription(error: unknown) {
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
