import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { arrowHover, cardCompact, heading, monoLabel } from "@/lib/styles";
import { resourceCategories, resources } from "@/lib/resources";

const Resources = () => {
  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pt-24`}>
        <div className={contentColumnClassName}>
          <p className={`${monoLabel} mb-3`}>Resources</p>
          <h1 className={`mb-4 text-3xl font-bold md:text-4xl ${heading}`}>
            Things I keep sending people
          </h1>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
            A living list of essays, courses, communities, and tools that shaped how I think
            about startups, AI, writing, and building from Malaysia.
          </p>

          <div className="space-y-10">
            {resourceCategories.map((category) => {
              const categoryResources = resources.filter((resource) => resource.category === category);

              return (
                <section key={category} aria-labelledby={`${category}-resources`} className="space-y-3">
                  <h2 id={`${category}-resources`} className="font-mono text-sm font-medium text-foreground">
                    {category}
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {categoryResources.map((resource) => (
                      <a
                        key={resource.href}
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex min-h-40 flex-col justify-between gap-5 ${cardCompact}`}
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {resource.format}
                            </span>
                            <span className={arrowHover}>→</span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-foreground/70">
                            {resource.label}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {resource.description}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              This is deliberately incomplete. I want it to become a useful shelf, not a
              performative bookshelf.
            </p>
          </div>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default Resources;
