import JsonLd from "@/components/JsonLd";
import Index from "@/screens/Index";
import { homeDescription } from "@/lib/seo";

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ashvin Praveen",
    url: "https://ashvinpraveen.com/",
    image: "https://ashvinpraveen.com/ashvin-profile.png",
    jobTitle: "Co-founder & CEO",
    worksFor: {
      "@type": "Organization",
      name: "Cleve.ai",
      url: "https://cleve.ai",
    },
    sameAs: [
      "https://linkedin.com/in/ashvinpraveen",
      "https://instagram.com/ashvinpraveen",
      "https://tiktok.com/@ashvinpraveen",
      "https://x.com/ashvinpk",
      "https://youtube.com/@ashvinpraveen",
      "https://threads.net/@ashvinpraveen",
      "https://github.com/ashvinpraveen",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ashvin Praveen",
    url: "https://ashvinpraveen.com/",
    description: homeDescription,
    publisher: {
      "@type": "Person",
      name: "Ashvin Praveen",
    },
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd id="home-json-ld" data={homeJsonLd} />
      <Index />
    </>
  );
}
