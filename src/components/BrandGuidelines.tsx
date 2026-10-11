"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import TypographySpecimen from "@/components/TypographySpecimen";
import { heading } from "@/lib/styles";

const colourTokens = [
  { name: "Background", variable: "--background" },
  { name: "Text", variable: "--foreground" },
  { name: "Card", variable: "--card" },
  { name: "Muted", variable: "--muted" },
  { name: "Muted text", variable: "--muted-foreground" },
  { name: "Accent", variable: "--accent" },
  { name: "Border", variable: "--border" },
  { name: "Link", variable: "--link" },
  { name: "Link hover", variable: "--link-hover" },
  { name: "Selection", variable: "--selection" },
] as const;

type TokenVariable = (typeof colourTokens)[number]["variable"];
type ColourMap = Record<TokenVariable, string>;

const sectionTitleClass = `text-xl font-semibold md:text-2xl ${heading}`;

function findStyleRule(selector: string): CSSStyleRule | null {
  const visit = (rules: CSSRuleList): CSSStyleRule | null => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        const selectors = rule.selectorText.split(",").map((part) => part.trim());
        if (selectors.includes(selector) && rule.style.getPropertyValue("--background")) return rule;
      }
      if (rule instanceof CSSGroupingRule) {
        const nested = visit(rule.cssRules);
        if (nested) return nested;
      }
    }
    return null;
  };

  for (const sheet of document.styleSheets) {
    try {
      const found = visit(sheet.cssRules);
      if (found) return found;
    } catch {
      continue;
    }
  }
  return null;
}

function hslChannelsToHex(raw: string): string | null {
  const match = raw.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return null;
  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }
  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`.toUpperCase();
}

function readPalette(selector: string): ColourMap | null {
  const rule = findStyleRule(selector);
  if (!rule) return null;
  const palette = {} as ColourMap;
  for (const token of colourTokens) {
    const hex = hslChannelsToHex(rule.style.getPropertyValue(token.variable));
    if (!hex) return null;
    palette[token.variable] = hex;
  }
  return palette;
}

function Swatch({
  name,
  hex,
  copied,
  onCopy,
}: {
  name: string;
  hex: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? `Copied ${name} ${hex}` : `Copy ${name} ${hex}`}
        className="flex w-full items-center gap-3 rounded-xl border border-foreground/10 bg-background p-2 text-left transition-colors hover:border-foreground/25"
      >
        <span
          aria-hidden="true"
          className="h-11 w-11 shrink-0 rounded-lg border border-foreground/15"
          style={{ backgroundColor: hex }}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm">{name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{copied ? "Copied" : hex}</span>
        </span>
      </button>
    </li>
  );
}

export default function BrandGuidelines() {
  const [light, setLight] = useState<ColourMap | null>(null);
  const [dark, setDark] = useState<ColourMap | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLight(readPalette(":root"));
    setDark(readPalette(".dark"));
  }, []);

  async function onCopy(key: string, name: string, hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedKey(key);
      setStatus(`Copied ${name} ${hex}`);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      setStatus("");
    }
  }

  const palettes = [
    { label: "Light", colours: light },
    { label: "Dark", colours: dark },
  ] as const;

  return (
    <details className="group mt-16 rounded-2xl border border-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>
          <h2 className={sectionTitleClass}>Brand guidelines</h2>
          <span className="mt-1 block text-sm text-muted-foreground">Colours and typography.</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          size={18}
        />
      </summary>
      <div className="border-t border-foreground/10 px-5 pb-6 pt-5">
        <h3 className="text-base font-semibold">Colours</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Taken from the site&apos;s colour tokens. Click a swatch to copy its hex.
        </p>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        {light && dark ? (
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            {palettes.map((palette) => {
              const colours = palette.colours;
              if (!colours) return null;
              return (
                <div key={palette.label}>
                  <h4 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {palette.label}
                  </h4>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {colourTokens.map((token) => {
                      const hex = colours[token.variable];
                      const key = `${palette.label}:${token.variable}`;
                      return (
                        <Swatch
                          key={key}
                          name={token.name}
                          hex={hex}
                          copied={copiedKey === key}
                          onCopy={() => void onCopy(key, `${palette.label} ${token.name}`, hex)}
                        />
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Colour tokens are loading.</p>
        )}
        <TypographySpecimen nested />
      </div>
    </details>
  );
}
