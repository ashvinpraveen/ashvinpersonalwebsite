import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import BlogPost from "@/screens/BlogPost";
import { fetchNote } from "@/lib/cleve";
import { absoluteUrl, createMetadata, excerpt } from "@/lib/seo";

export const dynamic = "force-dynamic";

type BlogPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const note = await fetchNote(id).catch(() => null);

  if (!note) {
    return createMetadata({
      title: "Writing — Ashvin Praveen",
      description: "Writing by Ashvin Praveen on AI, startups, building, and learning in public.",
      path: `/blog/${id}`,
      type: "article",
    });
  }

  return createMetadata({
    title: `${note.title || "Untitled"} — Ashvin Praveen`,
    description: excerpt(note.content),
    path: `/blog/${id}`,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const note = await fetchNote(id).catch(() => undefined);

  const postJsonLd = note
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: note.title || "Untitled",
        description: excerpt(note.content),
        url: absoluteUrl(`/blog/${id}`),
        image: absoluteUrl("/og-image.png"),
        datePublished: note.createdAt ? new Date(note.createdAt).toISOString() : undefined,
        dateModified: note.updatedAt ? new Date(note.updatedAt).toISOString() : undefined,
        author: {
          "@type": "Person",
          name: "Ashvin Praveen",
          url: absoluteUrl("/"),
        },
        publisher: {
          "@type": "Person",
          name: "Ashvin Praveen",
          url: absoluteUrl("/"),
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(`/blog/${id}`),
        },
      }
    : null;

  return (
    <>
      {postJsonLd && (
        <JsonLd id="blog-post-json-ld" data={postJsonLd} />
      )}
      <BlogPost id={id} initialNote={note} />
    </>
  );
}
