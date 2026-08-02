import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-run-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-run-fraunces",
  display: "swap",
});

export default function RunClubLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${outfit.variable} ${fraunces.variable}`}>{children}</div>
  );
}
