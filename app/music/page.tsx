import type { Metadata } from "next";
import MusicStudio from "@/screens/MusicStudio";
import { createMetadata } from "@/lib/seo";

const title = "Backing Track Studio — Ashvin Praveen";
const description =
  "Dial tempo, key, chords, and drums, then polish a loopable instrumental backing track.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/music",
  imageAlt: "Backing Track Studio — tempo, chords, drums, and Suno polish",
});

export default function MusicPage() {
  return <MusicStudio />;
}
