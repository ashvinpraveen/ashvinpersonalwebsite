import type { Id } from "../../../convex/_generated/dataModel";

export type AttachedImage = {
  id: string;
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  name: string;
};

export type MobileViewport = {
  height: number;
  top: number;
};

export type PageContext = {
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

export type ChatToolCall =
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

export type ModelProvider = "ilmu" | "gemini";

export type AshvinPetAnimation = "idle" | "chat" | "drag";

export type PetPosition = {
  x: number;
  y: number;
};

export type PetDragState = {
  dragging: boolean;
  pointerId: number;
  previousUserSelect: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

export type ChatThreadId = Id<"chatThreads">;
