"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Eye } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import LazyRichMarkdown from "@/components/LazyRichMarkdown";
import { CleveNote, fetchNote } from "@/lib/cleve";
import { recordArticleView, fetchArticleViews } from "@/lib/articleViews";
import { formatNoteDate } from "@/lib/dateFormat";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { navLink, heading } from "@/lib/styles";

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

  const { data: views } = useQuery({
    queryKey: ["article-views", id],
    queryFn: () => fetchArticleViews(id),
    enabled: !!id,
  });

  const recorded = useRef(false);
  useEffect(() => {
    if (!id || recorded.current) return;
    recorded.current = true;
    recordArticleView(id);
  }, [id]);

  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pt-24`}>
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
              <h1 className={`text-3xl md:text-4xl font-semibold text-foreground ${heading}`}>
                {note.title || "Untitled"}
              </h1>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>{formatNoteDate(note.createdAt)}</span>
                {typeof views === "number" && views > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {views.toLocaleString()} {views === 1 ? "view" : "views"}
                  </span>
                )}
              </div>
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
