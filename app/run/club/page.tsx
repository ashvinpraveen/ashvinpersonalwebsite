import type { Metadata } from "next";
import RunClubClub from "@/screens/RunClubClub";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Club — AI Run Club",
  description: "Live club chat, members, and weekly distance boards.",
  path: "/run/club",
});

export default function Page() {
  return <RunClubClub />;
}
