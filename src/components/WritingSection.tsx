import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchNotes } from "@/lib/cleve";
import SectionBlock from "@/components/SectionBlock";
import ActivityMap from "./ActivityMap";
import { linkPrimary, arrowHover, heading } from "@/lib/styles";

const formatNoteDate = (timestamp: number | null | undefined) => {
  if (!timestamp) return "Updated recently";

  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const WritingSection = () => {
  const { data: notes, isLoading, isError } = useQuery({
    queryKey: ["cleve-notes"],
    queryFn: fetchNotes,
  });

  const posts = notes?.slice(0, 3) ?? [];

  return (
    <SectionBlock id="writing" label="Writing">
      {!isLoading && !isError && notes && notes.length > 0 && (
        <ActivityMap notes={notes} />
      )}
      {isLoading && (
        <div className="mb-10 h-[110px] rounded-2xl bg-muted/50 animate-pulse" />
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted/50 p-6">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
        {isError && (
          <p className="font-mono text-xs text-muted-foreground">
            Couldn't load posts.{" "}
            <Link href="/blog" className={linkPrimary}>
              Browse all →
            </Link>
          </p>
        )}
        {!isLoading && !isError && posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.id}`}
            className="group block rounded-2xl bg-muted/50 p-6 transition-colors hover:bg-muted/70"
          >
            <div className="flex items-center justify-end gap-4 mb-4">
              <span className={arrowHover}>↗</span>
            </div>
            <p className={`text-base font-medium group-hover:text-foreground transition-colors ${heading}`}>
              {post.title || "Untitled"}
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              {formatNoteDate(post.createdAt)}
            </p>
          </Link>
        ))}

        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm pt-2">
          <Link
            href="/blog"
            className={linkPrimary}
          >
            All posts →
          </Link>
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className={linkPrimary}
          >
            LinkedIn →
          </a>
        </div>
      </div>
    </SectionBlock>
  );
};

export default WritingSection;
