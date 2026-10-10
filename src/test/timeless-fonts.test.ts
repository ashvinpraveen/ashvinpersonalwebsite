import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FONT_FILES = [
  "src/fonts/timeless/TimelessSerifVF.woff2",
  "src/fonts/timeless/TimelessSerifItalicVF.woff2",
  "src/fonts/timeless/TimelessSansVF.woff2",
];

function isWoff2(file: string) {
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

describe("Timeless font licensing", () => {
  it("gitignores Timeless font files anywhere in the tree", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    for (const extension of ["woff2", "woff", "otf", "ttf", "ttc", "eot", "dfont"]) {
      expect(gitignore).toContain(`**/*[Tt]imeless*.${extension}`);
    }
  });

  it("does not point the loader at font binaries unless the files are present", () => {
    const source = readFileSync("src/fonts/timeless/load.ts", "utf8");
    if (FONT_FILES.every(isWoff2)) return;
    expect(source).not.toMatch(/\.woff2/);
    expect(source).not.toContain("next/font/local");
    expect(source).toContain("timelessReady = false");
  });
});
