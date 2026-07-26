import type { Metadata } from "next";
import StartupSimulator from "@/screens/StartupSimulator";
import { createMetadata } from "@/lib/seo";

const title = "Startup Simulator — Ashvin Praveen";
const description =
  "A small startup simulator about choosing what to build, promote, fund, and delegate.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/startup",
});

export default function StartupPage() {
  return <StartupSimulator />;
}
