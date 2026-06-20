"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import LazyRichMarkdown from "@/components/LazyRichMarkdown";
import { CleveNote, fetchNote } from "@/lib/cleve";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { navLink } from "@/lib/styles";

const formatNoteDate = (timestamp: number | null | undefined) => {
  if (!timestamp) return "Updated recently";

  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

type BlogPostProps = {
  id: string;
  initialNote?: CleveNote;
};

const BlogPost = ({ id, initialNote }: BlogPostProps) => {
  const { data: note, isLoading, isError } = useQuery({
    queryKey: ["cleve-note", id],
    queryFn: () => fetchNote(id),
    enabled: !!id,
    initialData: initialNote,
  });

  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pb-20 pt-24`}>
        <div className={contentColumnClassName}>
          <Link
            href="/blog"
            className={`font-mono text-xs ${navLink}`}
          >
            ← All posts
          </Link>

          {isLoading && (
            <p className="font-mono text-sm text-muted-foreground mt-8">Loading...</p>
          )}

          {isError && (
            <p className="font-mono text-sm text-destructive mt-8">Failed to load post.</p>
          )}

          {note && (
            <article className="mt-8 space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {note.title || "Untitled"}
              </h1>
              <p className="font-mono text-xs text-muted-foreground">
                {formatNoteDate(note.createdAt)}
              </p>
              <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
                <LazyRichMarkdown>{note.content ?? ""}</LazyRichMarkdown>
              </div>
            </article>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
};

export default BlogPost;
