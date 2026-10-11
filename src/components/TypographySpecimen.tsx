import type { CSSProperties } from "react";
import { heading, linkPrimary } from "@/lib/styles";

const sample = "Designing fun products";

type Face = "serif" | "sans";

type Weight = {
  name: string;
  weight: number;
  italic: boolean;
};

type Specimen = {
  id: string;
  title: string;
  face: Face;
  styl: number;
  kicker: string;
  note?: string;
  weights: Weight[];
};

const serifWeights: Weight[] = [
  { name: "Thin", weight: 200, italic: false },
  { name: "Light", weight: 300, italic: true },
  { name: "Book", weight: 350, italic: true },
  { name: "Regular", weight: 400, italic: true },
  { name: "Medium", weight: 500, italic: true },
  { name: "Semibold", weight: 600, italic: true },
  { name: "Bold", weight: 700, italic: true },
];

const sansWeights: Weight[] = [
  { name: "Light", weight: 300, italic: true },
  { name: "Regular", weight: 420, italic: true },
  { name: "Medium", weight: 500, italic: true },
  { name: "Semibold", weight: 600, italic: true },
  { name: "Bold", weight: 700, italic: true },
  { name: "Black", weight: 800, italic: true },
];

const specimens: Specimen[] = [
  {
    id: "serif-display",
    title: "Serif Display",
    face: "serif",
    styl: 0,
    kicker: "Timeless Serif · headings",
    weights: serifWeights,
  },
  {
    id: "serif-text",
    title: "Serif Text",
    face: "serif",
    styl: 100,
    kicker: "Timeless Serif",
    note: "The italic variable file has no Text cut.",
    weights: serifWeights.map((weight) => ({ ...weight, italic: false })),
  },
  {
    id: "sans",
    title: "Sans",
    face: "sans",
    styl: 100,
    kicker: "Timeless Sans",
    weights: sansWeights,
  },
  {
    id: "sans-grotesk",
    title: "Sans Grotesk",
    face: "sans",
    styl: 0,
    kicker: "Timeless Sans",
    weights: sansWeights,
  },
];

const familyFor = (face: Face) =>
  face === "serif"
    ? 'var(--font-timeless-serif), Georgia, "Iowan Old Style", "Times New Roman", serif'
    : 'var(--font-timeless-sans), "DM Sans", system-ui, sans-serif';

function sampleStyle(specimen: Specimen, weight: number, italic: boolean): CSSProperties {
  const axes =
    specimen.face === "serif"
      ? `"STYL" ${specimen.styl}, "wght" ${weight}`
      : `"STYL" ${specimen.styl}, "wght" ${weight}, "ital" ${italic ? 100 : 0}`;

  return {
    fontFamily: familyFor(specimen.face),
    fontWeight: weight,
    fontStyle: italic ? "italic" : "normal",
    fontVariationSettings: axes,
    fontSynthesis: "none",
  };
}

export default function TypographySpecimen() {
  return (
    <section className="mt-14" aria-labelledby="typography-heading" id="typography">
      <h2 id="typography-heading" className={`text-xl font-semibold md:text-2xl ${heading}`}>
        Typography
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The site is set in{" "}
        <a
          href="https://www.timeless.co/type"
          target="_blank"
          rel="noopener noreferrer"
          className={`underline ${linkPrimary}`}
        >
          Timeless
        </a>
        .
      </p>
      <p className="timeless-specimen-note mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Timeless is embedded on the live site. This preview is using the fallback faces.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        {specimens.map((specimen) => (
          <article key={specimen.id} className="rounded-2xl bg-muted/50 p-5">
            <header className="mb-4">
              <h3 className="text-base font-semibold">{specimen.title}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {specimen.kicker}
              </p>
            </header>
            <ul className="space-y-4">
              {specimen.weights.map((weight) => (
                <li key={weight.name} className="border-t border-foreground/10 pt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-foreground/70">
                      {weight.name}
                      {specimen.id === "serif-display" && weight.weight === 500 ? " · headings" : ""}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {weight.weight}
                    </span>
                  </div>
                  <p
                    className="mt-1.5 text-[1.35rem] leading-tight"
                    style={sampleStyle(specimen, weight.weight, false)}
                  >
                    {sample}
                  </p>
                  {weight.italic ? (
                    <>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Italic
                      </p>
                      <p
                        className="text-[1.35rem] leading-tight text-foreground/80"
                        style={sampleStyle(specimen, weight.weight, true)}
                      >
                        {sample}
                      </p>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {specimen.note ? (
              <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {specimen.note}
              </p>
            ) : specimen.id === "serif-display" ? (
              <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                Thin has no italic.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
