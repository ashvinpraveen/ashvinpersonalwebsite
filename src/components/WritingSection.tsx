import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchNotes } from "@/lib/cleve";

const WritingSection = () => {
  const { data: notes, isLoading, isError } = useQuery({
    queryKey: ["cleve-notes"],
    queryFn: fetchNotes,
  });

  const posts = notes?.slice(0, 3) ?? [];

  return (
    <section id="writing" className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Writing</p>
      </div>
      <div className="max-w-prose">
        <div className="space-y-4 mb-10">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-transparent">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}
          {isError && (
            <p className="font-mono text-xs text-muted-foreground pl-4">
              Couldn't load posts.{" "}
              <Link to="/blog" className="text-primary hover:underline underline-offset-4">
                Browse all →
              </Link>
            </p>
          )}
          {!isLoading && !isError && posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.id}`}
              className="group flex items-start justify-between gap-4 p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all"
            >
              <div>
                <p className="text-base font-medium group-hover:text-primary transition-colors">
                  {post.title || "Untitled"}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-sm shrink-0 mt-0.5">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm pl-4">
          <Link
            to="/blog"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            All posts →
          </Link>
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            LinkedIn →
          </a>
        </div>
      </div>
    </section>
  );
};

export default WritingSection;
