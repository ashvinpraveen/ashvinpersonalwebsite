"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CleveNote, fetchNote } from "@/lib/cleve";
import LazyRichMarkdown from "@/components/LazyRichMarkdown";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ActivityMapProps {
  notes: CleveNote[];
}

type ActivityDay = {
  count: number;
  date: Date;
  key: string;
  notes: CleveNote[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const LABEL_WIDTH = 30;
const MONTH_HEIGHT = 18;
const GRID_TOP = 22;
const GRID_HEIGHT = CELL * 7 + GAP * 6;
const FOOTER_HEIGHT = 30;

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatNoteDate(timestamp: number | null | undefined) {
  if (!timestamp) return "Updated recently";

  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function panelContent(note: CleveNote | null) {
  if (!note?.content) return "";

  const lines = note.content.replace(/\r\n/g, "\n").split("\n");
  const noteDate = note.createdAt ? formatNoteDate(note.createdAt) : null;
  const noteTitle = note.title?.trim().replace(/\s+/g, " ");
  const cleaned = [...lines];

  while (cleaned.length > 0 && cleaned[0].trim() === "") {
    cleaned.shift();
  }

  for (let i = 0; i < 4; i++) {
    const firstLine = cleaned[0]
      ?.trim()
      .replace(/^#+\s*/, "")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ");
    if (!firstLine) {
      cleaned.shift();
      continue;
    }
    if (
      firstLine === noteDate ||
      (noteTitle && (firstLine === noteTitle || firstLine.includes(noteTitle) || noteTitle.includes(firstLine)))
    ) {
      cleaned.shift();
      continue;
    }
    break;
  }

  while (cleaned.length > 0 && cleaned[0].trim() === "") {
    cleaned.shift();
  }

  return cleaned.join("\n").trim();
}

function cellColor(count: number) {
  if (count === 0) return "fill-muted";
  if (count === 1) return "fill-orange-200 dark:fill-orange-900";
  if (count === 2) return "fill-orange-300 dark:fill-orange-700";
  return "fill-orange-400 dark:fill-orange-500";
}

const ActivityMap = ({ notes }: ActivityMapProps) => {
  const [selectedDay, setSelectedDay] = useState<ActivityDay | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<{
    day: ActivityDay;
    x: number;
    y: number;
  } | null>(null);

  const { weeks, monthLabels, postCount } = useMemo(() => {
    const noteMap = new Map<string, CleveNote[]>();

    notes.forEach((note) => {
      if (!note.createdAt) return;
      const key = toKey(new Date(note.createdAt));
      const dayNotes = noteMap.get(key) ?? [];
      dayNotes.push(note);
      noteMap.set(key, dayNotes);
    });

    noteMap.forEach((dayNotes) => {
      dayNotes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayKey = toKey(todayDate);

    const start = new Date(todayDate);
    start.setDate(start.getDate() - 364 - start.getDay());

    const weeks: ActivityDay[][] = [];
    const cursor = new Date(start);

    while (cursor <= todayDate) {
      const week: ActivityDay[] = [];
      for (let d = 0; d < 7; d++) {
        const key = toKey(cursor);
        const dayNotes = noteMap.get(key) ?? [];
        week.push({ date: new Date(cursor), count: dayNotes.length, key, notes: dayNotes });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const monthLabels: { label: string; weekIndex: number }[] = [];
    weeks.forEach((week, i) => {
      const first = week[0].date;
      const prev = i > 0 ? weeks[i - 1][0].date : null;
      if (!prev || first.getMonth() !== prev.getMonth()) {
        const last = monthLabels[monthLabels.length - 1];
        if (!last || i - last.weekIndex >= 3) {
          monthLabels.push({ label: MONTHS[first.getMonth()], weekIndex: i });
        }
      }
    });

    const startKey = toKey(start);
    let postCount = 0;
    noteMap.forEach((dayNotes, key) => {
      if (key >= startKey && key <= todayKey) postCount += dayNotes.length;
    });

    return { weeks, monthLabels, postCount };
  }, [notes]);

  const selectedNote = selectedDay?.notes.find((note) => note.id === selectedNoteId) ?? selectedDay?.notes[0] ?? null;
  const { data: fullNote, isLoading: isLoadingNote } = useQuery({
    queryKey: ["cleve-note", selectedNote?.id],
    queryFn: () => fetchNote(selectedNote!.id),
    enabled: !!selectedNote?.id,
  });

  const panelNote = fullNote ?? selectedNote;
  const panelMarkdown = panelContent(panelNote);
  const viewWidth = LABEL_WIDTH + weeks.length * STEP - GAP;
  const viewHeight = MONTH_HEIGHT + GRID_HEIGHT + FOOTER_HEIGHT;

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const scrollToRecent = () => {
      scrollArea.scrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
    };

    scrollToRecent();
    const frame = window.requestAnimationFrame(scrollToRecent);

    return () => window.cancelAnimationFrame(frame);
  }, [viewWidth]);

  function openDay(day: ActivityDay) {
    if (day.notes.length === 0) return;
    setSelectedDay(day);
    setSelectedNoteId(day.notes[0].id);
  }

  function setHover(day: ActivityDay, weekIndex: number, dayIndex: number) {
    if (day.notes.length === 0) return;
    const frameWidth = mapFrameRef.current?.getBoundingClientRect().width ?? viewWidth;
    const scrollWidth = scrollAreaRef.current?.firstElementChild?.getBoundingClientRect().width ?? viewWidth;
    const scale = scrollWidth / viewWidth;
    const scrollLeft = scrollAreaRef.current?.scrollLeft ?? 0;
    const x = (LABEL_WIDTH + weekIndex * STEP + CELL / 2) * scale - scrollLeft;
    const y = (GRID_TOP + dayIndex * STEP + CELL / 2) * scale;

    setHoveredDay({
      day,
      x: Math.max(128, Math.min(frameWidth - 128, x)),
      y,
    });
  }

  return (
    <>
      <div className="mb-10 flex justify-center" data-activity-panel-state={selectedDay ? "open" : "closed"}>
        <div ref={mapFrameRef} className="relative w-full max-w-4xl">
          <div ref={scrollAreaRef} className="overflow-visible pb-2">
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                className="block h-auto w-full overflow-visible"
                role="img"
                aria-label={`${postCount} posts in the last year`}
              >
            {monthLabels.map(({ label, weekIndex }) => (
              <text
                key={`${label}-${weekIndex}`}
                x={LABEL_WIDTH + weekIndex * STEP}
                y={10}
                className="fill-muted-foreground font-mono text-[10px] select-none"
              >
                {label}
              </text>
            ))}

            {DAY_LABELS.map((label, i) => (
              <text
                key={`${label}-${i}`}
                x={LABEL_WIDTH - 8}
                y={GRID_TOP + i * STEP + CELL - 1}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[9px] select-none"
              >
                {label}
              </text>
            ))}

            {weeks.map((week, wi) =>
              week.map((day, di) => {
                const isActive = day.notes.length > 0;

                return (
                  <rect
                    key={day.key}
                    x={LABEL_WIDTH + wi * STEP}
                    y={GRID_TOP + di * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    tabIndex={isActive ? 0 : -1}
                    role={isActive ? "button" : "img"}
                    data-activity-cell={isActive ? "active" : "empty"}
                    aria-label={`${formatDay(day.date)}: ${day.count} post${day.count === 1 ? "" : "s"}`}
                    className={cn(
                      "outline-none transition-colors",
                      cellColor(day.count),
                      isActive
                        ? "cursor-pointer hover:stroke-primary focus:stroke-primary stroke-2"
                        : "pointer-events-none opacity-80",
                    )}
                    onMouseEnter={() => setHover(day, wi, di)}
                    onMouseMove={() => setHover(day, wi, di)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onPointerEnter={() => setHover(day, wi, di)}
                    onPointerMove={() => setHover(day, wi, di)}
                    onPointerLeave={() => setHoveredDay(null)}
                    onFocus={() => setHover(day, wi, di)}
                    onBlur={() => setHoveredDay(null)}
                    onClick={() => openDay(day)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDay(day);
                      }
                    }}
                  />
                );
              }),
            )}
              </svg>
            </div>
          </div>

          {hoveredDay && (
            <div
              className="pointer-events-none absolute z-20 w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover p-3 text-left shadow-xl"
              style={{
                left: `${hoveredDay.x}px`,
                top: `${hoveredDay.y - 8}px`,
              }}
            >
              <p className="font-mono text-[10px] text-muted-foreground">
                {formatDay(hoveredDay.day.date)}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-popover-foreground">
                {hoveredDay.day.notes[0]?.title || "Untitled"}
              </p>
              {hoveredDay.day.notes.length > 1 && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  +{hoveredDay.day.notes.length - 1} more post{hoveredDay.day.notes.length === 2 ? "" : "s"} that day
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="font-mono text-[10px] text-muted-foreground">
              {postCount} {postCount === 1 ? "post" : "posts"} in the last year
            </p>
            <div className="flex items-center gap-[3px]">
              <span className="font-mono text-[10px] text-muted-foreground mr-1">Less</span>
              {[0, 1, 2, 3].map((level) => (
                <svg
                  key={level}
                  viewBox="0 0 10 10"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <rect width="10" height="10" rx="2" className={cellColor(level)} />
                </svg>
              ))}
              <span className="font-mono text-[10px] text-muted-foreground ml-1">More</span>
            </div>
          </div>
        </div>
      </div>

      <Sheet
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDay(null);
            setSelectedNoteId(null);
          }
        }}
      >
        <SheetContent className="flex w-full flex-col overflow-hidden bg-background/95 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border px-6 py-6 pr-16">
            <SheetTitle className="text-xl leading-tight">{panelNote?.title || "Untitled"}</SheetTitle>
            <SheetDescription>
              {selectedDay ? formatDay(selectedDay.date) : "Writing"}
            </SheetDescription>
          </SheetHeader>

          {selectedDay && selectedDay.notes.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-border px-6 py-4">
              {selectedDay.notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNoteId(note.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-left text-xs transition-colors",
                    note.id === selectedNoteId
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {note.title || "Untitled"}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {isLoadingNote && (
              <p className="font-mono text-xs text-muted-foreground">Loading post...</p>
            )}

            {panelNote && !isLoadingNote && (
              <article className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <LazyRichMarkdown>{panelMarkdown}</LazyRichMarkdown>
                </div>
              </article>
            )}
          </div>

          {panelNote && (
            <Link
              href={`/blog/${panelNote.id}`}
              className="border-t border-border/40 px-6 py-4 font-mono text-sm text-muted-foreground hover:text-foreground underline-offset-4 transition-colors"
            >
              Open full post →
            </Link>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ActivityMap;
