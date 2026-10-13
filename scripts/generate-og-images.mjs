/**
 * Renders the 1200×630 link-preview PNGs.
 *
 *   node scripts/generate-og-images.mjs
 *   node scripts/generate-og-images.mjs --artifacts /opt/cursor/artifacts
 *
 * Layout follows the homepage hero: cutting-mat ground, faint gears, Timeless
 * Serif (Display cut, STYL 0, Georgia fallback), and the square profile photo.
 * The variable font is not in git. `scripts/fetch-fonts.mjs` downloads
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

const cards = [
  {
    file: "og-image.png",
    title: "Ashvin Praveen",
    subtitle: "Co-founder & CEO of Cleve",
    cleveWord: true,
  },
  {
    file: "og-brand.png",
    title: "Speaker & press kit",
    subtitle: "Bios, talks, and photos for events and press.",
  },
  {
    file: "og-startup.png",
    title: "Startup Simulator",
    subtitle: "Grow a pixel-art startup by managing marketing, product, and sales.",
  },
];

const artifactsDir = readArtifactsDir(process.argv.slice(2));

const visuals = readFileSync(join(root, "src/lib/visuals.ts"), "utf8");
const grainSvg = readGrainSvg(visuals);
const cuttingMat = readCuttingMat(visuals);
const roman = readFont(romanPath);
const portrait = dataUri(join(root, "public/ashvin-profile.png"));
const cleveMark = dataUri(join(root, "public/cleve-logo.png"));
const gearMarkup = buildGearMarkup();

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

function readGrainSvg(source) {
  const match = source.match(/export const grainSvg = `([^`]+)`/);
  if (!match) {
    throw new Error("Could not read grainSvg from src/lib/visuals.ts");
  }
  return match[1];
}

function readCuttingMat(source) {
  const match = source.match(/export const cuttingMatGridLight = \[([\s\S]*?)\]\.join/);
  if (!match) {
    throw new Error("Could not read cuttingMatGridLight from src/lib/visuals.ts");
  }
  const layers = [...match[1].matchAll(/"([^"]+)"/g)].map((found) => found[1]);
  if (layers.length === 0) {
    throw new Error("cuttingMatGridLight has no gradient layers");
  }
  return layers.join(", ");
}

function createGearPath(cx, cy, pitchRadius, toothDepth, teeth) {
  const points = Array.from({ length: teeth * 2 }, (_, index) => {
    const radius = pitchRadius + (index % 2 === 0 ? toothDepth / 2 : -toothDepth / 2);
    const angle = -Math.PI / 2 + (index * Math.PI) / teeth;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(" ") + " Z";
}

function buildGearMarkup() {
  const ring = createGearPath(480, 320, 400, -10, 90);
  const sun = createGearPath(480, 320, 320, 10, 72);
  const planets = [
    [660, 631.769],
    [120, 320],
    [660, 8.231],
  ].map(([x, y]) => ({ x, y, path: createGearPath(x, y, 40, 10, 9) }));

  const planetMarkup = planets
    .map(
      (gear) => `<g>
        <circle cx="${gear.x}" cy="${gear.y}" r="40" stroke-dasharray="6 8" fill="none" />
        <path d="${gear.path}" />
      </g>`,
    )
    .join("");

  const spokes = planets
    .map(
      (gear) => `<line x1="480" y1="320" x2="${gear.x}" y2="${gear.y}" />
        <circle cx="${gear.x}" cy="${gear.y}" r="7" fill="none" />`,
    )
    .join("");

  return `<g stroke="currentColor" stroke-width="1.5" fill="none">
    <path d="${ring}" opacity="0.36" />
    <circle cx="480" cy="320" r="400" stroke-dasharray="4 11" stroke-width="1.2" opacity="0.32" />
    <path d="${sun}" />
    <circle cx="480" cy="320" r="320" stroke-dasharray="6 8" />
    <g opacity="0.34" stroke-width="1.1">
      ${spokes}
      <circle cx="480" cy="320" r="20" />
    </g>
    ${planetMarkup}
  </g>`;
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
      "--default-background-color=FFEDE7DE",
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

function subtitleHtml(card) {
  if (!card.cleveWord) return escapeHtml(card.subtitle);
  const [before, after = ""] = card.subtitle.split("Cleve");
  return `${escapeHtml(before)}<span class="cleve"><img src="${cleveMark}" alt="" />Cleve</span>${escapeHtml(after)}`;
}

function renderHtml(card) {
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: hsl(35 30% 90%);
  }
  .card {
    position: relative;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: hsl(35 30% 90%);
    color: hsl(30 14% 25%);
    font-family: "Timeless Serif", Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-weight: 400;
    font-style: normal;
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .mat {
    position: absolute;
    inset: 0;
    background-image: ${cuttingMat};
    background-position: right top;
  }
  .gears {
    position: absolute;
    right: -133px;
    top: -20px;
    width: 667px;
    height: 733px;
    overflow: visible;
    color: hsl(30 14% 25% / 0.15);
  }
  .stage {
    position: absolute;
    z-index: 2;
    left: 72px;
    right: 64px;
    top: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    column-gap: 40px;
    align-items: center;
  }
  h1 {
    max-width: 12em;
    font-size: 44px;
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.1;
    font-variation-settings: "STYL" 0, "wght" 400;
  }
  .sub {
    max-width: 28em;
    margin-top: 12px;
    font-size: 20px;
    font-weight: 400;
    font-style: normal;
    letter-spacing: -0.01em;
    line-height: 1.55;
    color: hsl(30 14% 25% / 0.7);
    font-variation-settings: "STYL" 0, "wght" 400;
  }
  .cleve {
    display: inline-flex;
    align-items: center;
    gap: 0.28em;
    font-weight: 600;
    color: hsl(30 14% 25%);
    font-variation-settings: "STYL" 0, "wght" 600;
  }
  .cleve img {
    width: 0.95em;
    height: 0.95em;
    border-radius: 0.2em;
  }
  .photo {
    width: 300px;
    height: 300px;
    border-radius: 16px;
    object-fit: cover;
    object-position: center top;
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    opacity: 0.3;
    mix-blend-mode: overlay;
    background-image: ${grainSvg};
    background-repeat: repeat;
    background-size: 128px 128px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="mat"></div>
    <svg class="gears" viewBox="0 0 800 880" fill="none" aria-hidden="true">
      ${gearMarkup}
    </svg>
    <div class="stage">
      <div>
        <h1>${escapeHtml(card.title)}</h1>
        <p class="sub">${subtitleHtml(card)}</p>
      </div>
      <img class="photo" src="${portrait}" alt="" />
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
