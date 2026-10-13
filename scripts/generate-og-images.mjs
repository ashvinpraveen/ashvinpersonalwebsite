/**
 * Renders the 1200×630 link-preview PNGs.
 *
 *   node scripts/generate-og-images.mjs
 *   node scripts/generate-og-images.mjs --artifacts /opt/cursor/artifacts
 *
 * Type is Timeless Serif (Display cut, STYL 0), with Georgia as the fallback
 * stack. The variable fonts are not in git. `scripts/fetch-fonts.mjs` downloads
 * them into src/assets/fonts/timeless/ when BLOB_READ_WRITE_TOKEN is set.
 *
 * Needs Chrome or Chromium on PATH (or CHROME_PATH).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const width = 1200;
const height = 630;

const fontDir = join(root, "src/assets/fonts/timeless");
const romanPath = join(fontDir, "TimelessSerifVF.woff2");
const italicPath = join(fontDir, "TimelessSerifItalicVF.woff2");

const cards = [
  {
    file: "og-image.png",
    kicker: "ashvinpraveen.com",
    titleLines: ["Ashvin Praveen"],
    titleSize: 88,
    subtitle: "Co-founder & CEO of Cleve",
    logos: true,
  },
  {
    file: "og-brand.png",
    kicker: "Ashvin Praveen",
    titleLines: ["Speaker &", "press kit"],
    titleSize: 80,
    subtitle: "Bios, talks, and photos for events and press.",
    logos: true,
  },
  {
    file: "og-startup.png",
    kicker: "ashvinpraveen.com",
    titleLines: ["Startup Simulator"],
    titleSize: 64,
    subtitle: "Grow a pixel-art startup by managing marketing, product, and sales.",
    logos: true,
  },
];

const artifactsDir = readArtifactsDir(process.argv.slice(2));

const grainSvg = readGrainSvg();
const roman = readFont(romanPath);
const italic = readFont(italicPath);
const portrait = dataUri(join(root, "public/brand/ashvin-praveen-portrait-three-quarter.png"));
const cleve = dataUri(join(root, "public/brand/cleve-logo-black-text.png"));
const malaysian = dataUri(join(root, "public/logo-malaysian-ai.png"));
const naic = dataUri(join(root, "public/logo-naic.png"));

const chrome = findChrome();
const scratch = join(tmpdir(), `og-images-${process.pid}`);
mkdirSync(scratch, { recursive: true });

try {
  for (const card of cards) {
    const htmlPath = join(scratch, `${card.file}.html`);
    const pngPath = join(root, "public", card.file);
    writeFileSync(htmlPath, renderHtml(card));
    await screenshot(htmlPath, pngPath);
    const size = pngSize(readFileSync(pngPath));
    if (size.width !== width || size.height !== height) {
      throw new Error(`${card.file} is ${size.width}×${size.height}, expected ${width}×${height}`);
    }
    if (artifactsDir) {
      mkdirSync(artifactsDir, { recursive: true });
      writeFileSync(join(artifactsDir, card.file), readFileSync(pngPath));
    }
    console.log(`wrote public/${card.file}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function readArtifactsDir(argv) {
  const flag = argv.indexOf("--artifacts");
  if (flag === -1) return "";
  const dir = argv[flag + 1];
  if (!dir) throw new Error("--artifacts needs a directory");
  return resolve(dir);
}

function readFont(path) {
  try {
    return readFileSync(path).toString("base64");
  } catch {
    throw new Error(
      `Missing ${path}. Run scripts/fetch-fonts.mjs with BLOB_READ_WRITE_TOKEN set. See the Timeless fonts section of the README.`,
    );
  }
}

function readGrainSvg() {
  const source = readFileSync(join(root, "src/lib/visuals.ts"), "utf8");
  const match = source.match(/export const grainSvg = `([^`]+)`/);
  if (!match) {
    throw new Error("Could not read grainSvg from src/lib/visuals.ts");
  }
  return match[1];
}

function dataUri(path) {
  return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }

  throw new Error("Chrome or Chromium is required. Set CHROME_PATH if it is not on PATH.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Headless Chrome writes the PNG, then keeps the virtual-time clock running.
// Wait until the file size settles and then stop the process.
async function screenshot(htmlPath, pngPath) {
  rmSync(pngPath, { force: true });
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      "--default-background-color=FFF3ECE2",
      "--virtual-time-budget=4000",
      "--run-all-compositor-stages-before-draw",
      `--screenshot=${pngPath}`,
      htmlPath,
    ],
    { stdio: "ignore" },
  );

  let lastSize = -1;
  let stableReads = 0;
  const started = Date.now();

  try {
    while (Date.now() - started < 20000) {
      await sleep(200);
      if (!existsSync(pngPath)) continue;
      const size = statSync(pngPath).size;
      if (size > 10000 && size === lastSize) {
        stableReads += 1;
        if (stableReads >= 2) return;
      } else {
        stableReads = 0;
        lastSize = size;
      }
    }
    throw new Error(`Chrome did not produce ${pngPath}`);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Chrome did not write a PNG");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function renderHtml(card) {
  const logos = card.logos
    ? `<div class="logos">
        <img class="cleve" src="${cleve}" alt="" />
        <img class="my" src="${malaysian}" alt="" />
        <img class="naic" src="${naic}" alt="" />
      </div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Timeless Serif";
    src: url("data:font/woff2;base64,${roman}") format("woff2");
    font-weight: 200 700;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: "Timeless Serif";
    src: url("data:font/woff2;base64,${italic}") format("woff2");
    font-weight: 300 700;
    font-style: italic;
    font-display: block;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: hsl(36 40% 92%);
  }
  .card {
    position: relative;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: hsl(36 40% 92%);
    color: hsl(30 14% 25%);
    font-family: "Timeless Serif", Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-weight: 400;
    font-style: normal;
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    /* Same grain tile as the site (128px, overlay). A touch stronger than the
       hero's 0.3 so the tooth still reads after link-preview compression. */
    opacity: 0.42;
    mix-blend-mode: overlay;
    background-image: ${grainSvg};
    background-repeat: repeat;
    background-size: 128px 128px;
  }
  .copy {
    position: absolute;
    z-index: 2;
    left: 68px;
    top: 64px;
    bottom: 52px;
    width: 640px;
    display: flex;
    flex-direction: column;
  }
  .kicker {
    font-size: 20px;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: hsl(30 12% 48%);
    font-variation-settings: "STYL" 0, "wght" 400;
  }
  h1 {
    margin-top: 16px;
    max-width: 9.6em;
    font-size: ${card.titleSize}px;
    font-weight: 400;
    font-style: normal;
    letter-spacing: -0.03em;
    line-height: 1.02;
    font-variation-settings: "STYL" 0, "wght" 400;
  }
  .rule {
    width: 64px;
    height: 5px;
    margin: 26px 0 20px;
    border-radius: 99px;
    background: hsl(33 18% 82%);
  }
  .sub {
    max-width: 15.5em;
    font-size: 30px;
    font-style: italic;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.28;
    color: hsl(30 14% 25% / 0.86);
    font-variation-settings: "wght" 400;
  }
  .logos {
    display: flex;
    align-items: center;
    gap: 22px;
    margin-top: auto;
    padding-top: 28px;
  }
  .logos img { display: block; width: auto; }
  .logos .cleve { height: 38px; }
  .logos .my { height: 44px; }
  .logos .naic { height: 42px; }
  .frame {
    position: absolute;
    z-index: 1;
    top: 40px;
    right: 48px;
    width: 356px;
    height: 535px;
  }
  .mat {
    position: absolute;
    left: 16px;
    top: 16px;
    width: 356px;
    height: 535px;
    border-radius: 18px;
    background: hsl(33 18% 82%);
  }
  .frame img {
    position: absolute;
    inset: 0;
    width: 356px;
    height: 535px;
    object-fit: cover;
    object-position: center center;
    border-radius: 18px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="copy">
      <p class="kicker">${escapeHtml(card.kicker)}</p>
      <h1>${card.titleLines.map((line) => escapeHtml(line)).join("<br />")}</h1>
      <div class="rule"></div>
      <p class="sub">${escapeHtml(card.subtitle)}</p>
      ${logos}
    </div>
    <div class="frame">
      <div class="mat"></div>
      <img src="${portrait}" alt="" />
    </div>
    <div class="grain"></div>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
