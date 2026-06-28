import type { Id } from "../../../convex/_generated/dataModel";

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  points: DrawingPoint[];
  width: number;
};

export type EditablePostcard = {
  _id: Id<"postcards">;
  name: string;
  location: string;
  message: string;
};

export type PendingPostcard = {
  name: string;
  location: string;
  message: string;
  drawingDataUrl: string | null;
};

export type PostcardDraft = {
  name?: string;
  location?: string;
  message?: string;
  drawingStrokes?: DrawingStroke[];
  penSize?: number;
};
