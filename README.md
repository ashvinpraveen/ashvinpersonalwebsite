# Personal Website — Built with Cleve, Lovable & Claude Code

A minimal personal website that pulls your public writing directly from [Cleve](https://cleve.ai). This README walks you through how to build your own version from scratch — the same way this one was made.

---

## Get it running in 5 minutes

```bash
git clone https://github.com/ashvinpraveen/ashvinpersonalwebsite.git
cd ashvinpersonalwebsite
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Set up your environment variables — create a `.env.local` file in the root:

```
VITE_CONVEX_URL=your_convex_url
VITE_CONVEX_SITE_URL=your_convex_site_url
```

Then start Convex:

```bash
npx convex dev
```

Add your `CLEVE_API_KEY` to your Convex project's environment variables at [dashboard.convex.dev](https://dashboard.convex.dev) → Settings → Environment Variables.

---

## Make it yours

Before changing any code, use Cleve to write out who you are and what you want to say. The site is only as good as the clarity of thought behind it.

Open Cleve and write a note answering these questions:

```
Who am I and what do I actually do? (not the LinkedIn version)
What have I built or worked on that I want people to know about?
How do I think? What are my actual mental models?
A few true things about me that aren't on my resume.
How do I want people to feel when they land on my site?
```

Once you have that, use it as context to update each section:

- `src/components/HeroSection.tsx` — your name, title, one-line description
- `src/components/AboutSection.tsx` — your story in your own words
- `src/components/WorkSection.tsx` — what you're working on now
- `src/components/ThinkingSection.tsx` — how you actually think
- `src/components/FactsSection.tsx` — a few true things about you
- `src/components/ContactSection.tsx` — how people can reach you

Replace the photos in `public/` with your own and update the references in HeroSection and AboutSection.

---

## How this was built

This wasn't built by writing code from scratch. Here's the actual process:

### 1. Write the brief in Cleve

Before touching any tools, the content was written out in Cleve — who Ashvin is, what Cleve.ai does, the tone of the site, what sections it should have. Cleve's memory meant the AI had full context on the writing style and background, so the generated copy didn't sound generic.

The prompt for Lovable was written inside Cleve too, so it was grounded in real context before being handed off to a builder.

### 2. Build the initial site in Lovable

The brief from Cleve was used as a prompt in [Lovable](https://lovable.dev) to generate the initial React + Vite + Tailwind site. Lovable handles the scaffolding fast — routing, components, dark mode, responsive layout.

The initial output was a solid starting point but needed iteration on copy, layout, and actual personalisation.

### 3. Sync to GitHub and open in Claude Code

Once the base was built in Lovable, the repo was synced to GitHub and cloned locally. From there, everything was iterated in [Claude Code](https://claude.ai/claude-code) — a terminal-based AI coding assistant.

Claude Code is where the real refinement happened: cleaning up copy, adding photos, fixing the navbar, wiring up APIs, migrating the backend.

### 4. Connect the Cleve MCP for contextualised iteration

The [Cleve MCP](https://cleve.ai) was connected to Claude Code so that every edit was made with full context on the project — the writing style, the goals, the decisions made along the way. This meant Claude wasn't starting cold on every prompt.

If you're iterating on your own site in Claude Code, connect Cleve's MCP server so your notes are available as context mid-session.

### 5. Add the Cleve API to sync public notes

The Writing section pulls notes directly from your Cleve account via the Cleve API. Any note you make public in Cleve automatically shows up on the site — no CMS, no manual publishing.

To use this:
1. Get your API key from [app.cleve.ai](https://app.cleve.ai)
2. Add it as `CLEVE_API_KEY` in your Convex environment variables
3. Publish notes in Cleve — they'll appear at `/blog`

### 6. Migrate the backend to Convex

The site started with Supabase (via Lovable) for the backend. To have full ownership, the backend was migrated to [Convex](https://convex.dev).

Convex handles:
- **`/cleve-proxy`** — a serverless HTTP action that proxies the Cleve API securely (your API key never touches the browser)
- **`/reps-coach`** — AI coaching feedback for the writing drills on `/reps`

The Convex functions live in `convex/http.ts`.

---

## Stack

| Layer | Tool |
|-------|------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Convex |
| Writing sync | Cleve API |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

---

## Deploying

Connect the repo to [Vercel](https://vercel.com). It will detect Vite automatically.

Add your environment variables in Vercel project settings:
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

Make sure `CLEVE_API_KEY` is set in Convex (not Vercel — it lives server-side).

---

## The writing section

The `/blog` route fetches your public Cleve notes and renders them as a reading list. Individual notes are at `/blog/:id`.

To populate it: write in Cleve, mark notes as public, and they appear automatically. No deploy needed.

---

Built by [Ashvin Praveen](https://ashvinpraveen.com) · Co-founder & CEO, [Cleve.ai](https://cleve.ai)
