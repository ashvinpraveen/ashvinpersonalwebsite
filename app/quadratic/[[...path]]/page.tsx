import type { Metadata } from "next";
import Quadratic from "@/screens/Quadratic";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Quadratic — Issue tracking for modern teams",
  description:
    "Quadratic is a fast, keyboard-first issue tracker for planning and building products. Issues, projects, cycles, inbox, and an MCP server for your AI tools.",
  path: "/quadratic",
  imageAlt: "Quadratic — a fast, keyboard-first issue tracker",
});

export default function QuadraticPage() {
  return <Quadratic />;
}
