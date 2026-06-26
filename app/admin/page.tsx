import type { Metadata } from "next";
import ChatAdmin from "@/screens/ChatAdmin";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Chat admin — Ashvin Praveen",
  description: "Private AI chat inbox.",
  path: "/admin",
  noIndex: true,
});

export default function AdminPage() {
  return <ChatAdmin />;
}
