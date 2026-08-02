import type { MetadataRoute } from "next";
import { fetchNotes } from "@/lib/cleve";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/postcards"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/resources"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/diary"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/run-club"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/run-club/feed"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/run-club/events"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const notes = await fetchNotes().catch(() => []);
  const postRoutes = notes.map((note) => ({
    url: absoluteUrl(`/blog/${note.id}`),
    lastModified: note.updatedAt || note.createdAt ? new Date(note.updatedAt ?? note.createdAt ?? now) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
