import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Brand from "@/screens/Brand";
import { absoluteUrl, createMetadata } from "@/lib/seo";

const title = "Speaker & press kit — Ashvin Praveen";
const description =
  "Speaker and press kit for Ashvin Praveen, Co-founder & CEO of Cleve. Bios, talks, and photos for events and press.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/brand",
  image: "/og-brand.png",
  imageAlt: "Speaker and press kit for Ashvin Praveen.",
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
