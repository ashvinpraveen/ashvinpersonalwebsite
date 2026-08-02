import type { Metadata } from "next";
import RunClubEvents from "@/screens/RunClubEvents";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Events — AI Run Club",
  description: "Meetup schedule, start point guidance, and RSVPs for AI Run Club.",
  path: "/run-club/events",
});

export default function Page() {
  return <RunClubEvents />;
}
