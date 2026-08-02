import type { Metadata } from "next";
import RunClubActivity from "@/screens/RunClubActivity";
import { createMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return createMetadata({
    title: "Activity — AI Run Club",
    description: "Activity detail with map, splits, kudos, and comments.",
    path: `/run/a/${slug}`,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <RunClubActivity slug={slug} />;
}
