import type { Metadata } from "next";
import PostcardAdmin from "@/screens/PostcardAdmin";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Postcard admin — Ashvin Praveen",
  description: "Private postcard reply admin.",
  path: "/admin/postcards",
  noIndex: true,
});

export default function PostcardAdminPage() {
  return <PostcardAdmin />;
}
