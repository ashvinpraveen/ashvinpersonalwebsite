import type { Metadata } from "next";
import MusicStudio from "@/screens/MusicStudio";
import { createMetadata } from "@/lib/seo";

const title = "Jam Room — Backing Track Studio · Ashvin Praveen";
const description =
  "A pocket band to practise with: pick a key, chords, and groove, then jam over drums, bass, and keys. Tuner, speed trainer, WAV export, and AI studio takes.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/music",
  imageAlt: "Jam Room — a backing track studio with chords, grooves, and a tuner",
});

export default function MusicPage() {
  return <MusicStudio />;
}
