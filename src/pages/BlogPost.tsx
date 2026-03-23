import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { fetchNote } from "@/lib/cleve";

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ["cleve-note", id],
    queryFn: () => fetchNote(id!),
    enabled: !!id,
  });

  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-24">
        <Link
          to="/blog"
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
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
              {new Date(note.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          </article>
        )}

        <Footer />
      </main>
    </>
  );
};

export default BlogPost;
