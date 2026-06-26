export const cuttingMatGridLight = [
  "repeating-linear-gradient(to right, rgba(0,0,0,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to right, rgba(0,0,0,0.05) 0 1.25px, transparent 1.25px 80px)",
  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.05) 0 1.25px, transparent 1.25px 80px)",
].join(", ");

export const cuttingMatGridDark = [
  "repeating-linear-gradient(to right, rgba(255,255,255,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to bottom, rgba(255,255,255,0.032) 0 1px, transparent 1px 8px)",
  "repeating-linear-gradient(to right, rgba(255,255,255,0.055) 0 1.25px, transparent 1.25px 80px)",
  "repeating-linear-gradient(to bottom, rgba(255,255,255,0.055) 0 1.25px, transparent 1.25px 80px)",
].join(", ");

export const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
