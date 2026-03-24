import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { fetchNotes } from "@/lib/cleve";

const PostSkeleton = () => (
  <li className="space-y-2">
    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
    <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
  </li>
);

const Blog = () => {
  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ["cleve-notes"],
    queryFn: fetchNotes,
  });

  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-24">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Writing
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
              className="font-mono text-xs text-primary hover:underline underline-offset-4 transition-colors"
            >
              Try again →
            </button>
          </div>
        )}

        {notes && notes.length === 0 && (
          <p className="font-mono text-sm text-muted-foreground">No posts yet.</p>
        )}

        {notes && notes.length > 0 && (
          <ul className="space-y-8">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/blog/${note.id}`}
                  className="group block space-y-1"
                >
                  <h2 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                    {note.title || "Untitled"}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Footer />
      </main>
    </>
  );
};

export default Blog;
