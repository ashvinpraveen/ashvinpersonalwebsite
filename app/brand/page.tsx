import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Brand from "@/screens/Brand";
import { absoluteUrl, createMetadata } from "@/lib/seo";

const title = "Brand — Ashvin Praveen";
const description = "Photos of Ashvin Praveen for speaker and press use.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/brand",
});

export default function BrandPage() {
  const brandJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: absoluteUrl("/brand"),
    description,
    mainEntity: {
      "@type": "Person",
      name: "Ashvin Praveen",
      url: absoluteUrl("/"),
      image: [
        absoluteUrl("/brand/ashvin-praveen-portrait-three-quarter.png"),
        absoluteUrl("/brand/ashvin-praveen-portrait-full-length.png"),
      ],
    },
  };

  return (
    <>
      <JsonLd id="brand-json-ld" data={brandJsonLd} />
      <Brand />
    </>
  );
}
