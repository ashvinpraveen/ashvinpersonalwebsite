"use client";

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import type { DrawingStroke } from "./types";
import { cn } from "@/lib/utils";

export default function DrawingPad({
  hasDrawing,
  onHasDrawingChange,
  strokes,
  onStrokesChange,
  penSize,
  onPenSizeChange,
}: {
  hasDrawing: boolean;
  onHasDrawingChange: (hasDrawing: boolean) => void;
  strokes: DrawingStroke[];
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  penSize: number;
  onPenSizeChange: (penSize: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<DrawingStroke[]>(strokes);
  const [strokeCount, setStrokeCount] = useState(0);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#000000";

    return { context, width: rect.width, height: rect.height };
  }, []);

  const drawStroke = useCallback((
    context: CanvasRenderingContext2D,
    stroke: DrawingStroke,
    width: number,
    height: number,
  ) => {
    if (stroke.points.length === 0) return;

    context.lineWidth = stroke.width;
    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);

    if (stroke.points.length === 1) {
      context.lineTo(stroke.points[0].x * width + 0.01, stroke.points[0].y * height + 0.01);
    } else {
      stroke.points.slice(1).forEach((point) => {
        context.lineTo(point.x * width, point.y * height);
      });
    }

    context.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const preparedCanvas = prepareCanvas();
    if (!preparedCanvas) return;

    const { context, width, height } = preparedCanvas;
    context.clearRect(0, 0, width, height);
    strokesRef.current.forEach((stroke) => drawStroke(context, stroke, width, height));
  }, [drawStroke, prepareCanvas]);

  useEffect(() => {
    redrawCanvas();
    window.addEventListener("resize", redrawCanvas);
    return () => window.removeEventListener("resize", redrawCanvas);
  }, [redrawCanvas]);

  useEffect(() => {
    strokesRef.current = strokes;
    redrawCanvas();
    setStrokeCount(strokes.length);
    onHasDrawingChange(strokes.length > 0);
  }, [onHasDrawingChange, redrawCanvas, strokes]);

  function commitStrokes(nextStrokes: DrawingStroke[]) {
    strokesRef.current = nextStrokes;
    setStrokeCount(nextStrokes.length);
    onHasDrawingChange(nextStrokes.length > 0);
    onStrokesChange(nextStrokes);
    redrawCanvas();
  }

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    isDrawingRef.current = true;
    commitStrokes([...strokesRef.current, { points: [point], width: penSize }]);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;

    const point = getPoint(event);
    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (!currentStroke) return;

    const nextStrokes = strokesRef.current.map((stroke, index) =>
      index === strokesRef.current.length - 1
        ? { ...stroke, points: [...stroke.points, point] }
        : stroke,
    );
    commitStrokes(nextStrokes);
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    isDrawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clearDrawing() {
    commitStrokes([]);
  }

  function undoStroke() {
    commitStrokes(strokesRef.current.slice(0, -1));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Pen</span>
          {[2, 3, 5].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPenSizeChange(size)}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border border-border transition-colors hover:text-foreground",
                penSize === size && "border-primary/60 text-primary",
              )}
              aria-label={`Use ${size}px pen`}
              title={`${size}px pen`}
            >
              <span
                aria-hidden="true"
                className="rounded-full bg-current"
                style={{ width: size + 4, height: size + 4 }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={undoStroke}
          disabled={strokeCount === 0}
          className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          aria-label="Undo last line"
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-[12px] border border-border bg-background dark:bg-muted",
          hasDrawing && "border-primary/70",
        )}
      >
        <canvas
          ref={canvasRef}
          id="postcard-drawing"
          className="block h-64 w-full touch-none dark:invert"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="Drawing canvas"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearDrawing}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
