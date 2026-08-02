import type { Metadata } from "next";
import RunClubYou from "@/screens/RunClubYou";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "You — AI Run Club",
  description: "Your streak, weekly distance, calendar, and activity history.",
  path: "/run/you",
});

export default function Page() {
  return <RunClubYou />;
}
