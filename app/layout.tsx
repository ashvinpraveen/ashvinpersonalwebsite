import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import PageGrid from "@/components/PageGrid";
import "@/index.css";
import { createMetadata, homeDescription, homeTitle } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: homeTitle,
  description: homeDescription,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101010",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PageGrid />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
