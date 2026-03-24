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
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Writing
      </p>
      <div className="max-w-prose">
        <div className="space-y-8 mb-10">
          {posts.map((post) => (
            <div key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="text-base font-medium hover:underline underline-offset-4 transition-colors"
              >
                {post.title}
              </Link>
              <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                {post.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
          <Link
            to="/blog"
            className="flex items-center gap-2 text-primary hover:underline underline-offset-4 transition-colors"
          >
            <span className="text-muted-foreground">→</span> All posts
          </Link>
          <a
            href="https://linkedin.com/in/ashvinpraveen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline underline-offset-4 transition-colors"
          >
            <span className="text-muted-foreground">→</span> LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
};

export default WritingSection;
