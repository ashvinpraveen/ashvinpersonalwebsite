import type { Metadata } from "next";
import RunClubFeed from "@/screens/RunClubFeed";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Feed — AI Run Club",
  description: "Club activity feed with kudos, comments, and shareable finishes.",
  path: "/run-club/feed",
});

export default function Page() {
  return <RunClubFeed />;
}
