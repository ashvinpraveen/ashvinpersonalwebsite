import type { Metadata } from "next";
import DiaryAdmin from "@/screens/DiaryAdmin";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Diary admin — Ashvin Praveen",
  description: "Private diary chat inbox.",
  path: "/admin/diary",
  noIndex: true,
});

export default function DiaryAdminPage() {
  return <DiaryAdmin />;
}
