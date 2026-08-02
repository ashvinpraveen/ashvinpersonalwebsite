import type { Metadata } from "next";
import RunClub from "@/screens/RunClub";
import { createMetadata } from "@/lib/seo";

const title = "AI Run Club — Ashvin Praveen";
const description =
  "Host and join Malaysian.ai run/walk meetups with live map presence, club chat, route guidance, and shareable distance tracking.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/run",
  imageAlt: "AI Run Club — walk together with live map and shareable finishes",
});

export default function RunClubPage() {
  return <RunClub />;
}
