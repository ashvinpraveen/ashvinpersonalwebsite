import { Link } from "react-router-dom";

const posts = [
  {
    title: "I built an AI that thinks with me",
    description:
      "Why context is the problem, and how Cleve was built to solve it.",
    slug: "why-i-dont-let-chatgpt-write-for-me",
  },
  {
    title: "AI designs look soulless. Here's the fix.",
    description:
      "A product designer's guide to getting taste out of generative tools.",
    slug: "ai-designs-soulless",
  },
  {
    title: "Your brain is your best agent.",
    description:
      "I spent months delegating hard thinking to AI. Then I looked at which problems actually got solved.",
    slug: "human-brain-llm",
  },
];

const WritingSection = () => {
  return (
    <section id="writing" className="py-16 md:py-20 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-6 bg-primary shrink-0" />
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Writing</p>
      </div>
      <div className="max-w-prose">
        <div className="space-y-4 mb-10">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex items-start justify-between gap-4 p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all"
            >
              <div>
                <p className="text-base font-medium group-hover:text-primary transition-colors">
                  {post.title}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  {post.description}
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
