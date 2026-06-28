import type { Metadata } from "next";
import AdminDashboard from "@/screens/AdminDashboard";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Admin dashboard — Ashvin Praveen",
  description: "Private admin dashboard.",
  path: "/admin/dashboard",
  noIndex: true,
});

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
