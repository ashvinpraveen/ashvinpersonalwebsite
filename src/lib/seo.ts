import type { Metadata } from "next";

export const SITE_URL = "https://ashvinpraveen.com";
export const SITE_NAME = "Ashvin Praveen";
export const DEFAULT_OG_IMAGE = "/og-image.png";

export const homeTitle = "Ashvin Praveen — Co-founder & CEO of Cleve.ai";
export const homeDescription =
  "Ashvin Praveen builds AI tools for writing, thinking, and communities in Malaysia. Co-founder & CEO of Cleve.ai.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createMetadata({
  title,
  description,
  path = "/",
  type = "website",
  image = DEFAULT_OG_IMAGE,
  imageAlt = SITE_NAME,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@ashvinpk",
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
  };
}

export function excerpt(content: string | null | undefined) {
  const text = content
    ?.replace(/<[^>]+>/g, " ")
    ?.replace(/[#*_`>\-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Writing by Ashvin Praveen on AI, startups, building, and learning in public.";
  if (text.length <= 155) return text;

  return `${text.slice(0, 152).trim()}...`;
}
