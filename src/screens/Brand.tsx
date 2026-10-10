import Image from "next/image";
import CopyTextButton from "@/components/CopyTextButton";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import { contentColumnClassName, pageShellClassName } from "@/lib/layout";
import { heading, linkPrimary, monoLabel } from "@/lib/styles";

const tagline =
  "Co-founder & CEO of Cleve.ai | AI Content Workspace | Sharing my thoughts & lessons while building in public | Antler W23";

const shortBio =
  "Ashvin Praveen is Co-founder & CEO of Cleve, a fast-growing Malaysian AI startup helping entrepreneurs and professionals transform their raw ideas into content that amplifies their message. Cleve has 40,000+ users and is used in 100+ countries.";

const fullBio = `${shortBio}

Ashvin has worked with numerous founders, C-suites and creators to build their personal brands and drive their message. As Co-founder & CEO of Cleve, he focuses on building world class AI applications. He is Director of the National AI Competition (NAIC) 2026, run by Rakan Tutor with Sunway University.

Ashvin is known for his insights on the future of AI and the capabilities of the technologies as well as what we can do to fully leverage AI in improving our productivity and capabilities. He and his team are experimenting daily at the cutting edge of AI and regularly share insights on social media about their learnings.

On stage, Ashvin speaks passionately about AI's role in creativity, the future of personal branding, and the messy realities of entrepreneurship.

When he's not building Cleve, Ashvin enjoys exploring different creative formats, from performing music and producing videos, to vibe coding and tinkering with the latest tech.`;

const mcIntro =
  "Ashvin Praveen, CEO & Co-founder of Cleve.ai, working on building an AI second brain for people and teams, where AI agents can execute planning, research and writing tasks with specific context.";

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

const topics = [
  "AI's role in creativity",
  "The future of personal branding",
  "The messy realities of entrepreneurship",
];

const signatureTalks = [
  {
    title: "Humans Following Humans",
    detail:
      "Thought leadership and how it's reshaping marketing in an AI world. Keynote, KL Digital Marketing Conference 2024.",
  },
  {
    title: "Engineering virality",
    detail:
      "The science of going global with content, built around LinkedIn Wrapped: 0 to 110,000 users in 4 weeks, people from 100 countries, and 3 million views in two weeks. Core message: virality is not a channel, it's a product decision made early.",
  },
  {
    title: "Content Marketing with AI",
    detail:
      "A practical walkthrough on building a consistent content engine with AI, from ideation through execution, without compromising brand voice. The tools can change. The workflow should hold. 60 minutes including Q&A.",
  },
  {
    title: "The Future with Agentic AI",
    detail:
      "Panel, Ashvin moderating. Make AI agents super easy to understand and accessible, and discuss the opportunities and how people can think about new applications and building with agents.",
  },
  {
    title: "Designing AI tools for content creation",
    detail:
      "BrandStrat 2024. How he has been thinking about designing AI tools for content creation, and what he thinks is coming next.",
  },
];

const appearances = [
  {
    label: "Talks",
    items: [
      "Keynote, KL Digital Marketing Conference 2024, on the power of thought leadership. Thanks to Skill-Lyft.",
      "Keynote, BrandStrat Summit 2024 (2 October).",
      "EcoWorld AI Marketing Masterclass, Content Marketing with AI, 28 July 2026, Menara EcoWorld, Kuala Lumpur. Organised by Cat Insights Venture (Daily CMO).",
    ],
  },
  {
    label: "Panels",
    items: [
      "Eight panels in 2024, including Sunway University and Taylor's, plus a talk at Curtin.",
      "Panel, UOA Group's The Tech Collective, with Khai Chun Thee and Tzy Hwan Hiew.",
      "Moderator, The Future with Agentic AI, with Khalil Nooh (Mesolitica), Nazirul Hafiy (Sarawak Artificial Intelligence Centre) and Dr Lee Sue Han (Swinburne Sarawak).",
    ],
  },
  {
    label: "Media",
    items: [
      "BFM 89.9, Enterprise Biz Bytes: 45-minute interview with Richard Bradbury on the early days of building in AI, global competition, Antler, and startup experiments. On Spotify and Apple Podcasts.",
      "Also featured in Edge Malaysia, Vulcan Post, and the Superhuman AI newsletter.",
      "Study International: “UK engineering grad builds six-figure business and AI tool on LinkedIn.” Their write-up, not Ashvin's bio.",
      "Rebel Curiosities podcast with Pearl.",
      "Media contact for the Cursor x Anthropic Hackathon Malaysia: 1,873 signups and 684 participants, one of the region's largest AI development events.",
    ],
  },
  {
    label: "Events",
    items: [
      "Organised Malaysia's largest AI competition for youths, the NAIC grand finals at Sunway University, bringing 2,000 students together.",
      "In 2024, ran a Halloween networking event and a branding talk.",
    ],
  },
];

const roles = [
  "Co-founder & CEO, Cleve (Dec 2023 to present), Kuala Lumpur. Backed by Antler.",
  "Director of the National AI Competition (NAIC) 2026, run by Rakan Tutor with Sunway University. Rakan Tutor is an NGO he is part of.",
  "Founder in Residence, Antler (Oct to Dec 2023). Selected for Antler's MY1 cohort, and one of seven teams Antler funded from that cohort.",
  "Co-founder & CMO, whacked (2020 to 2023), helping entrepreneurs and founders grow their digital influence and become business thought leaders.",
];

const facts = [
  "1st Class Honours, Mechanical Engineering, University of Sheffield (ASEAN Merit Scholar).",
  "Born in Kuching, Sarawak. Grew up in Miri and Bintulu.",
  "Built whacked, a six-figure content agency, while and after studying. Helped 40+ founders and entrepreneurs build their brands online.",
  "LinkedIn Wrapped: 0 to 110,000 users in 4 weeks, from 100 countries.",
  "easyeats: scaled from 400 to 25,000 app downloads in one year, 99% organically with social media.",
  "NAIC: 2,000 students aged 15 to 19 from across Malaysia, co-organised with Sunway University and supported by the Ministry of Education Malaysia.",
  "Cleve serves users in more than 100 countries, has processed nearly 100 million words, and has grown organically to 40,000+ users. Pre-seed funding from Antler.",
  "Went through an NVIDIA and AWS startup accelerator.",
  "Helped a YouTube channel reach 150k subscribers while studying.",
];

const links = [
  { href: "https://ashvinpraveen.com", label: "Website" },
  { href: "https://cleve.ai", label: "Cleve" },
  { href: "https://linkedin.com/in/ashvinpraveen", label: "LinkedIn" },
  { href: "https://x.com/ashvinpk", label: "X" },
  { href: "https://instagram.com/ashvinpraveen", label: "Instagram" },
  { href: "https://tiktok.com/@ashvinpraveen", label: "TikTok" },
  { href: "https://youtube.com/@ashvinpraveen", label: "YouTube" },
  { href: "https://cal.com/ashvinpraveen", label: "Book a call" },
];

const sectionTitleClass = `text-xl font-semibold md:text-2xl ${heading}`;

function CopyBlock({
  title,
  text,
  name,
}: {
  title: string;
  text: string;
  name: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <CopyTextButton text={text} name={name} />
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        {text.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

const Brand = () => {
  return (
    <>
      <SiteNav />
      <main className={`${pageShellClassName} pt-24`}>
        <div className={contentColumnClassName}>
          <p className={`${monoLabel} mb-3`}>Press kit</p>
          <h1 className={`mb-3 text-3xl font-semibold leading-[1.15] md:text-4xl ${heading}`}>Ashvin Praveen</h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{tagline}</p>

          <div className="mt-10">
            <p className="mb-4 text-sm text-muted-foreground">Photos for speaker and press use.</p>
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
          </div>

          <section className="mt-16 space-y-4" aria-labelledby="bios-heading">
            <h2 id="bios-heading" className={sectionTitleClass}>
              Bios
            </h2>
            <CopyBlock title="Short bio" text={shortBio} name="short bio" />
            <CopyBlock title="Full bio" text={fullBio} name="full bio" />
          </section>

          <section className="mt-14" aria-labelledby="intro-heading">
            <h2 id="intro-heading" className={sectionTitleClass}>
              MC intro
            </h2>
            <div className="mt-4">
              <CopyBlock title="Moderator intro" text={mcIntro} name="MC intro" />
            </div>
          </section>

          <section className="mt-14 space-y-8" aria-labelledby="talks-heading">
            <h2 id="talks-heading" className={sectionTitleClass}>
              Talks
            </h2>
            <div>
              <h3 className="mb-3 text-base font-semibold">Topics</h3>
              <ul className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <li key={topic} className="rounded-full bg-muted/50 px-3 py-1.5 text-sm">
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-base font-semibold">Signature talks</h3>
              <ul className="space-y-4">
                {signatureTalks.map((talk) => (
                  <li key={talk.title}>
                    <h4 className="font-semibold">{talk.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{talk.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-14 space-y-6" aria-labelledby="selected-heading">
            <h2 id="selected-heading" className={sectionTitleClass}>
              Selected talks, panels and media
            </h2>
            {appearances.map((group) => (
              <div key={group.label}>
                <h3 className={`${monoLabel} mb-2`}>{group.label}</h3>
                <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/90">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="mt-14" aria-labelledby="background-heading">
            <h2 id="background-heading" className={sectionTitleClass}>
              Roles and facts
            </h2>
            <div className="mt-4 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className={`${monoLabel} mb-3`}>Roles</h3>
                <ul className="list-disc space-y-3 pl-4 text-sm leading-relaxed text-foreground/90">
                  {roles.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className={`${monoLabel} mb-3`}>Notable facts</h3>
                <ul className="list-disc space-y-3 pl-4 text-sm leading-relaxed text-foreground/90">
                  {facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-14" aria-labelledby="connect-heading">
            <h2 id="connect-heading" className={sectionTitleClass}>
              Connect
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkPrimary}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              For speaking and press enquiries, book a call or message on LinkedIn.
            </p>
          </section>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default Brand;
