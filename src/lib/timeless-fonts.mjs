import { closeSync, openSync, readSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Private Blob prefix. Files are never committed; see scripts/fetch-fonts.mjs. */
export const TIMELESS_BLOB_PREFIX = "fonts/timeless";

export const TIMELESS_FILENAMES = [
  "TimelessSerifVF.woff2",
  "TimelessSerifItalicVF.woff2",
  "TimelessSansVF.woff2",
];

/** Previous open-source face. Forks keep today's look when Timeless is absent. */
export const SANS_FALLBACKS = ["DM Sans", "system-ui", "sans-serif"];

/** Used when Timeless Serif itself is missing at runtime, behind DM Sans. */
export const SERIF_FALLBACKS = ["Georgia", "Iowan Old Style", "Times New Roman", "serif"];

const FONT_DIR = join(root, "src/fonts/timeless");

export function timelessFontPath(filename) {
  return join(FONT_DIR, filename);
}

export function timelessLoadModulePath() {
  return join(FONT_DIR, "load.ts");
}

function isWoff2(file) {
  try {
    if (statSync(file).size < 256) return false;
    const handle = openSync(file, "r");
    try {
      const bytes = new Uint8Array(4);
      readSync(handle, bytes, 0, 4, 0);
      return String.fromCharCode(...bytes) === "wOF2";
    } finally {
      closeSync(handle);
    }
  } catch {
    return false;
  }
}

/** True only when all three private font files are present and look like woff2. */
export function timelessFontsReady() {
  return TIMELESS_FILENAMES.every((filename) => isWoff2(timelessFontPath(filename)));
}
