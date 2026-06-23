import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Blog from "@/screens/Blog";
import { fetchNotes } from "@/lib/cleve";
import { absoluteUrl, createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const title = "Writing — Ashvin Praveen";
const description =
  "Essays, notes, and build-in-public updates from Ashvin Praveen on AI, writing, startups, and community.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/blog",
});

export default async function BlogPage() {
  const notes = await fetchNotes().catch(() => undefined);
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: title,
    url: absoluteUrl("/blog"),
    description,
    author: {
      "@type": "Person",
      name: "Ashvin Praveen",
      url: absoluteUrl("/"),
    },
    blogPost: notes?.slice(0, 10).map((note) => ({
      "@type": "BlogPosting",
      headline: note.title || "Untitled",
      url: absoluteUrl(`/blog/${note.id}`),
      datePublished: note.createdAt ? new Date(note.createdAt).toISOString() : undefined,
      dateModified: note.updatedAt ? new Date(note.updatedAt).toISOString() : undefined,
    })),
  };

  return (
    <>
      <JsonLd id="blog-json-ld" data={blogJsonLd} />
      <Blog initialNotes={notes} />
    </>
  );
}
