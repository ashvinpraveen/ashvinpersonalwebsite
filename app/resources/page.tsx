import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Resources from "@/screens/Resources";
import { absoluteUrl, createMetadata } from "@/lib/seo";
import { resources } from "@/lib/resources";

const title = "Resources — Ashvin Praveen";
const description =
  "A living list of startup, AI, writing, and Malaysia resources recommended by Ashvin Praveen.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/resources",
});

export default function ResourcesPage() {
  const resourcesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: absoluteUrl("/resources"),
    description,
    mainEntity: resources.map((resource) => ({
      "@type": "CreativeWork",
      name: resource.label,
      ...(resource.href ? { url: resource.href } : {}),
      description: resource.description,
    })),
  };

  return (
    <>
      <JsonLd id="resources-json-ld" data={resourcesJsonLd} />
      <Resources />
    </>
  );
}
