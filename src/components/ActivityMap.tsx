import { useMemo } from "react";
import { CleveNote } from "@/lib/cleve";

interface ActivityMapProps {
  notes: CleveNote[];
}

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP; // 12px per column/row

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cellColor(count: number) {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count === 2) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

const ActivityMap = ({ notes }: ActivityMapProps) => {
  const { weeks, monthLabels, postCount } = useMemo(() => {
    const countMap = new Map<string, number>();
    notes.forEach((note) => {
      if (!note.createdAt) return;
      const key = toKey(new Date(note.createdAt));
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayKey = toKey(todayDate);

    // Start from the Sunday ~52 weeks ago
    const start = new Date(todayDate);
    start.setDate(start.getDate() - 364 - start.getDay());

    const weeks: { date: Date; count: number; key: string }[][] = [];
    const cursor = new Date(start);

    while (cursor <= todayDate) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = toKey(cursor);
        week.push({ date: new Date(cursor), count: countMap.get(key) ?? 0, key });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const monthLabels: { label: string; col: number }[] = [];
    weeks.forEach((week, i) => {
      const first = week[0].date;
      const prev = i > 0 ? weeks[i - 1][0].date : null;
      if (!prev || first.getMonth() !== prev.getMonth()) {
        const last = monthLabels[monthLabels.length - 1];
        if (!last || i - last.col >= 3) {
          monthLabels.push({ label: MONTHS[first.getMonth()], col: i });
        }
      }
    });

    const startKey = toKey(start);
    let postCount = 0;
    countMap.forEach((count, key) => {
      if (key >= startKey && key <= todayKey) postCount += count;
    });

    return { weeks, monthLabels, postCount };
  }, [notes]);

  return (
    <div className="mb-10">
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: `${weeks.length * STEP + 28}px` }}>
          {/* Month labels */}
          <div className="relative h-[14px] ml-7 mb-1">
            {monthLabels.map(({ label, col }) => (
              <span
                key={`${label}-${col}`}
                className="absolute font-mono text-[10px] text-muted-foreground select-none"
                style={{ left: `${col * STEP}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Day labels + grid */}
          <div className="flex" style={{ gap: `${GAP}px` }}>
            {/* Day-of-week labels */}
            <div className="flex flex-col shrink-0 w-6 mr-1" style={{ gap: `${GAP}px` }}>
              {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
                <div
                  key={i}
                  style={{ height: `${CELL}px`, lineHeight: `${CELL}px` }}
                  className="font-mono text-[9px] text-muted-foreground text-right select-none"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                {week.map((day) => (
                  <div
                    key={day.key}
                    style={{ width: `${CELL}px`, height: `${CELL}px` }}
                    className={`rounded-[2px] transition-colors ${cellColor(day.count)}`}
                    title={`${day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${day.count} post${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: count + legend */}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <p className="font-mono text-[10px] text-muted-foreground">
          {postCount} {postCount === 1 ? "post" : "posts"} in the last year
        </p>
        <div className="flex items-center gap-[3px]">
          <span className="font-mono text-[10px] text-muted-foreground mr-1">Less</span>
          {[0, 1, 2, 3].map((level) => (
            <div
              key={level}
              style={{ width: `${CELL}px`, height: `${CELL}px` }}
              className={`rounded-[2px] ${cellColor(level)}`}
            />
          ))}
          <span className="font-mono text-[10px] text-muted-foreground ml-1">More</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityMap;
