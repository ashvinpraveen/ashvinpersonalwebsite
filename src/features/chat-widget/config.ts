import type { ModelProvider } from "./types";

export const CLIENT_ID_KEY = "ashvin-chat-client-id";
export const MODEL_PROVIDER_KEY = "ashvin-chat-model-provider";
export const PET_POSITION_KEY = "ashvin-pet-position";
export const MAX_MESSAGE_LENGTH = 900;
export const MAX_IMAGE_ATTACHMENTS = 3;
export const MAX_IMAGE_DIMENSION = 1024;
export const MAX_INPUT_ROWS = 7;
export const DEFAULT_SIDE_PANEL_WIDTH = 320;
export const MIN_SIDE_PANEL_WIDTH = 280;
export const MAX_SIDE_PANEL_WIDTH = 520;
export const COMPACT_PAGE_WIDTH = 768;
export const PET_VIEWPORT_MARGIN = 12;
export const PET_DRAG_THRESHOLD = 5;
export const SIDE_PANEL_ANIMATION_MS = 220;

export const SITE_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/diary", label: "Diary" },
  { path: "/blog", label: "Writing" },
  { path: "/resources", label: "Resources" },
  { path: "/text", label: "Text me" },
  { path: "/postcard", label: "Postcard" },
  { path: "/postcards", label: "Postcards" },
] as const;

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  projects: "Projects",
  about: "About",
  writing: "Writing",
  involvement: "Involvement",
  resources: "Resources",
  contact: "Contact",
};

export const MODEL_OPTIONS: Array<{ label: string; value: ModelProvider }> = [
  { label: "Ilmu", value: "ilmu" },
  { label: "Gemini", value: "gemini" },
];
