"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import ActivityMap from "@/components/ActivityMap";
import { CleveNote, fetchNotes } from "@/lib/cleve";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { monoLabel, heading, linkPrimary } from "@/lib/styles";

const formatNoteDate = (timestamp: number | null | undefined) => {
  if (!timestamp) return "Updated recently";

  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const PostSkeleton = () => (
  <li className="space-y-2">
    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
    <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
  </li>
);

type BlogProps = {
  initialNotes?: CleveNote[];
};

const Blog = ({ initialNotes }: BlogProps) => {
  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ["cleve-notes"],
    queryFn: fetchNotes,
    initialData: initialNotes,
  });

  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pb-20 pt-24`}>
        <div className={contentColumnClassName}>
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${heading}`}>Writing</h1>
          <p className="text-base text-muted-foreground mb-10 max-w-md">
            Thoughts on AI, building products, and things I've learned along the way.
          </p>

          {isLoading && (
            <ul className="space-y-8">
              {[...Array(5)].map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </ul>
          )}

          {isError && (
            <div className="space-y-3">
              <p className="font-mono text-sm text-destructive">
                Couldn't load posts right now.
              </p>
              <button
                onClick={() => refetch()}
                className={`font-mono text-xs ${linkPrimary}`}
              >
                Try again →
              </button>
            </div>
          )}

          {!isLoading && !isError && notes && notes.length > 0 && (
            <ActivityMap notes={notes} />
          )}

          {notes && notes.length === 0 && (
            <p className="font-mono text-sm text-muted-foreground">No posts yet.</p>
          )}

          {notes && notes.length > 0 && (
            <ul className="space-y-8">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/blog/${note.id}`}
                    className="group block space-y-1"
                  >
                    <h2 className={`text-lg font-medium text-foreground group-hover:text-foreground/70 transition-colors ${heading}`}>
                      {note.title || "Untitled"}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatNoteDate(note.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
};

export default Blog;
