import type { Metadata } from "next";
import Postcard from "@/screens/Postcard";
import { absoluteUrl, createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const title = "Postcards — Ashvin Praveen";
const description =
  "Drop a thought, share something you learned, or just say hi. I read and respond to everything.";

export const metadata: Metadata = createMetadata({
  title,
  description,
  path: "/postcards",
});

export default function PostcardsPage() {
  const postcardJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: absoluteUrl("/postcards"),
    description,
  };

  return (
    <>
      <script
        id="postcard-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postcardJsonLd) }}
      />
      <Postcard />
    </>
  );
}
