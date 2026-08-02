import type { Metadata } from "next";
import RunClubShare from "@/screens/RunClubShare";
import { createMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return createMetadata({
    title: "AI Run Club finish — Ashvin Praveen",
    description: "A shared walking or running finish from AI Run Club.",
    path: `/run/s/${slug}`,
    imageAlt: "Shared AI Run Club finish card",
  });
}

export default async function RunClubSharePage({ params }: PageProps) {
  const { slug } = await params;
  return <RunClubShare slug={slug} />;
}
