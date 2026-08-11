import type { ReactNode } from "react";
import { Outfit, Syne } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-music-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-music-display",
  display: "swap",
});

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${outfit.variable} ${syne.variable} font-[family-name:var(--font-music-sans)]`}>
      {children}
    </div>
  );
}
