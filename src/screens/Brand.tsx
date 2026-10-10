import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { heading, linkPrimary } from "@/lib/styles";

const photos = [
  {
    src: "/brand/ashvin-praveen-portrait-three-quarter.webp",
    downloadHref: "/brand/ashvin-praveen-portrait-three-quarter.png",
    downloadName: "ashvin-praveen-portrait-three-quarter.png",
    label: "Three-quarter portrait",
    alt: "Ashvin Praveen smiling in a closer three-quarter-length portrait, hands in his pockets, wearing a black button-up shirt with rolled sleeves and beige chinos against a light grey backdrop.",
  },
  {
    src: "/brand/ashvin-praveen-portrait-full-length.webp",
    downloadHref: "/brand/ashvin-praveen-portrait-full-length.png",
    downloadName: "ashvin-praveen-portrait-full-length.png",
    label: "Full-length portrait",
    alt: "Ashvin Praveen smiling in a wider full-length portrait, hands in his pockets, wearing a black button-up shirt with rolled sleeves and beige chinos against a light grey backdrop.",
  },
] as const;

const Brand = () => {
  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pt-24`}>
        <div className={contentColumnClassName}>
          <h1 className={`mb-4 text-3xl font-bold md:text-4xl ${heading}`}>Brand</h1>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Photos for speaker and press use.
          </p>

          <ul className="grid list-none gap-8 md:grid-cols-2">
            {photos.map((photo, index) => (
              <li key={photo.downloadHref}>
                <figure>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={1023}
                    height={1537}
                    priority={index === 0}
                    sizes="(min-width: 768px) 22rem, calc(100vw - 3rem)"
                    className="h-auto w-full rounded-2xl"
                  />
                  <figcaption className="mt-3 flex flex-col items-start gap-1">
                    <span className="font-mono text-xs text-muted-foreground">{photo.label}</span>
                    <a
                      href={photo.downloadHref}
                      download={photo.downloadName}
                      className={`font-mono text-xs underline ${linkPrimary}`}
                    >
                      Download full resolution
                    </a>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default Brand;
