import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "@/index.css";
import { fontClassName } from "@/lib/fonts.generated";
import { createMetadata, homeDescription, homeTitle } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: homeTitle,
  description: homeDescription,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101010",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClassName} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
