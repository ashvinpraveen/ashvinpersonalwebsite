import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { arrowHover, cardCompact, heading, monoLabel } from "@/lib/styles";
import { resources, type Resource } from "@/lib/resources";

type ResourceSection = {
  title: string;
  categories: Resource["category"][];
};

const resourceSections: ResourceSection[] = [
  {
    title: "Resources",
    categories: ["Startups", "AI and building", "Writing and thinking", "Malaysia"],
  },
  {
    title: "What's in my laptop",
    categories: ["What's in my laptop"],
  },
  {
    title: "What's in my bag",
    categories: ["What's in my bag"],
  },
];

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
            {resourceSections.map((section) => {
              const sectionResources = resources.filter((resource) =>
                section.categories.includes(resource.category),
              );

              return (
                <section key={section.title} aria-labelledby={`${section.title}-resources`} className="space-y-4">
                  <h2 id={`${section.title}-resources`} className={`text-2xl font-semibold md:text-3xl ${heading}`}>
                    {section.title}
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {sectionResources.map((resource) => {
                      const resourceContent = (
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {resource.format}
                            </span>
                            {resource.href ? <span className={arrowHover}>→</span> : null}
                          </div>
                          <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-foreground/70">
                            {resource.label}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {resource.description}
                          </p>
                        </div>
                      );

                      if (resource.href) {
                        return (
                          <a
                            key={resource.label}
                            href={resource.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex min-h-40 flex-col justify-between gap-5 ${cardCompact}`}
                          >
                            {resourceContent}
                          </a>
                        );
                      }

                      return (
                        <article
                          key={resource.label}
                          className={`group flex min-h-40 flex-col justify-between gap-5 ${cardCompact}`}
                        >
                          {resourceContent}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default Resources;
