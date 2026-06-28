import { drawingPlacements } from "./config";

export default function DrawingField({
  postcards,
}: {
  postcards:
    | Array<{
        _id: string;
        drawingDataUrl: string | null;
        name: string;
        location: string;
      }>
    | undefined;
}) {
  const drawings = postcards?.filter((postcard) => postcard.drawingDataUrl) ?? [];

  return (
    <section className="space-y-5 border-t border-border pt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Drawings
      </h2>

      <div className="relative min-h-[22rem] overflow-hidden rounded-[12px] border border-border bg-card">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-border" />

        {drawings.length === 0 && (
          <div className="grid h-[22rem] place-items-center px-6 text-center font-mono text-xs text-muted-foreground">
            Drawings will collect here.
          </div>
        )}

        {drawings.map((postcard, index) => {
          const placement = drawingPlacements[index % drawingPlacements.length];
          return (
            <div
              key={postcard._id}
              className="absolute rounded-[12px] border border-border bg-background/80 p-3 dark:bg-muted"
              style={{
                left: placement.left,
                top: placement.top,
                width: placement.width,
                transform: `rotate(${placement.rotate})`,
              }}
            >
              <img
                src={postcard.drawingDataUrl ?? ""}
                alt={`Drawing from ${postcard.name || postcard.location || "a postcard"}`}
                className="h-full w-full object-contain dark:invert"
                loading="lazy"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
