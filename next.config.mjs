import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Vercel runs `next build` directly, which skips npm's prebuild hook.
// Generate the font module before Next resolves next/font/local paths.
const fetchFonts = spawnSync(process.execPath, [join(root, "scripts/fetch-fonts.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (fetchFonts.status !== 0) {
  throw new Error("Timeless font setup failed");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
