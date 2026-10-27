import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "@/features/quadratic/quadratic.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-q-inter",
  display: "swap",
});

export default function QuadraticLayout({ children }: { children: ReactNode }) {
  return <div className={inter.variable}>{children}</div>;
}
