# Ashvin's Personal Website

A personal website template for builders who want their writing, projects, and story in one place — without the hassle.

**If you like this project, give it a star!** Hit the star button at the top right of this page. It helps others find it and makes my day.

---

## What Is This?

This is the source code for [ashvinpraveen.com](https://ashvinpraveen.com). It's a real, working personal website that you can fork and turn into your own — for free.

The cool part: blog posts aren't stored in the code. They come from [Cleve](https://cleve.ai), a writing app. You write in Cleve, hit publish, and your website updates automatically. No redeploying. No editing files. Just write and go.

## What You Get

- A clean homepage with your bio, work, projects, and social links
- A blog powered by your Cleve writing (no markdown files to manage)
- A writing activity heatmap (like GitHub's contribution graph, but for your writing)
- A postcard wall where visitors can leave you notes
- SEO-friendly pages with Open Graph tags and JSON-LD
- Dark mode support
- Fully responsive on mobile, tablet, and desktop
- Runs entirely on free tiers

## New to GitHub? Start Here

If you've never used GitHub before, don't worry. Here's what you need to know:

- **Repository (repo)**: A folder that holds all the code for a project, hosted on GitHub
- **Fork**: Your own copy of someone else's repo. You can change it however you want without affecting the original
- **Clone**: Downloading a repo to your computer so you can work on it locally
- **Commit**: Saving a snapshot of your changes (like a save point in a game)
- **Push**: Uploading your saved changes from your computer back to GitHub
- **Deploy**: Making your website live on the internet so anyone can visit it

You'll use all of these as you set up your site. Each step is explained below.

## Prerequisites

Before you start, you'll need to install a few things on your computer. If you already have these, skip ahead.

### 1. Install Node.js

Node.js lets you run JavaScript on your computer (outside a browser). You need it to build and run this website.

Go to [nodejs.org](https://nodejs.org) and download the **LTS** (Long Term Support) version. Run the installer, accept the defaults, and you're done.

To check it worked, open your terminal and run:

```bash
node --version
```

You should see something like `v20.x.x` or higher.

### 2. Install Git

Git is the tool that lets you download code from GitHub and track your changes.

- **Mac**: Open Terminal and run `git --version`. If it's not installed, macOS will prompt you to install it.
- **Windows**: Download from [git-scm.com](https://git-scm.com). During installation, keep the default options.
- **Linux**: Run `sudo apt install git` (Ubuntu/Debian) or `sudo dnf install git` (Fedora).

To check it worked:

```bash
git --version
```

### 3. Create a GitHub Account

If you don't have one yet, sign up at [github.com](https://github.com). It's free.

### 4. Get a Code Editor (Optional but Recommended)

You can use any text editor, but [VS Code](https://code.visualstudio.com) is free and popular. It has a built-in terminal, so you can edit code and run commands in the same window.

### 5. Use a Coding Agent to Help You (Seriously, Do This)

If you've never coded before, a coding agent is like having a developer friend sitting next to you. It can read the codebase, answer your questions, make changes for you, and even debug problems. Here are three great options:

| Tool | Cost | Best For | How to Get It |
| --- | --- | --- | --- |
| [Antigravity](https://antigravity.com) | Free | Beginners who want a no-cost option | Download the app from [antigravity.com](https://antigravity.com) |
| [Claude Code](https://claude.ai/code) | Included with Claude Pro/Max | Claude subscribers | Install via `npm install -g @anthropic-ai/claude-code`, then run `claude` in your project folder |
| [Codex](https://openai.com/index/introducing-codex/) | Included with ChatGPT Pro | ChatGPT subscribers | Install via `npm install -g @openai/codex`, then run `codex` in your project folder |

**Why use one?** Instead of manually editing each component file, you can just tell the agent:

> "Replace Ashvin's name with mine, update the social links to my profiles, and swap the profile photo to my-photo.jpg"

...and it'll make all the changes for you. It can also help you set up Convex, debug issues, and deploy to Vercel.

**Antigravity** is the easiest starting point — it's completely free, no subscription needed. If you already pay for Claude or ChatGPT, their coding agents (Claude Code and Codex) are included in your subscription and work great too.

To use any of these agents with this project, just open your terminal, navigate to your project folder, and launch the agent:

```bash
cd ashvinpersonalwebsite

# Pick one:
antigravity          # if using Antigravity
claude               # if using Claude Code
codex                # if using Codex
```

Then start asking it questions or telling it what to change. It's that simple.

---

## Fork This Repo (Make It Yours)

Forking creates your own copy of this project on your GitHub account. You can change anything you want without affecting the original.

### Step 1: Click the Fork Button

At the top right of this page, click **Fork**. GitHub will create a copy under your account.

### Step 2: Clone Your Fork to Your Computer

Go to YOUR fork (it'll be at `github.com/YOUR-USERNAME/ashvinpersonalwebsite`). Click the green **Code** button and copy the URL.

Then open your terminal and run:

```bash
git clone https://github.com/YOUR-USERNAME/ashvinpersonalwebsite.git
cd ashvinpersonalwebsite
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### Step 3: Install Dependencies

This downloads all the libraries the project needs:

```bash
npm install
```

This might take a minute. You'll see a progress bar. When it's done, you're ready to go.

---

## Run It Locally

Let's see the website on your computer before making any changes.

```bash
npm run dev
```

Open your browser and go to:

```
http://localhost:8080
```

You should see the website! It'll look like Ashvin's site right now — that's expected. The writing section won't work yet (we'll set that up next), but the rest of the site should load fine.

To stop the server, press `Ctrl + C` in your terminal.

---

## Set Up the Blog (Cleve + Convex)

The blog system has two parts:

1. **Cleve** — where you write and publish posts
2. **Convex** — a backend that connects your Cleve writing to your website

Here's how it flows:

```
You write in Cleve
  -> Cleve hosts your public writing profile
  -> Convex fetches your posts via a small proxy
  -> Your website displays them
```

### Step 1: Create a Cleve Account

Go to [cleve.ai](https://cleve.ai) and create a free account.

Write some notes and publish the ones you want on your website. Your public profile will be at:

```
https://app.cleve.ai/user/YOUR_CLEVE_USERNAME
```

### Step 2: Set Up Convex

Convex is the backend that fetches your Cleve posts. It's free for personal use.

First, install the Convex CLI if you don't have it:

```bash
npx convex dev
```

The first time you run this, it'll walk you through creating a Convex account and project. Follow the prompts — it takes about 2 minutes.

Once you have a Convex deployment, set your Cleve username:

```bash
npx convex env set CLEVE_PUBLIC_PROFILE_SLUG your_cleve_username
```

For example, if your Cleve profile is `https://app.cleve.ai/user/janedoe`:

```bash
npx convex env set CLEVE_PUBLIC_PROFILE_SLUG janedoe
```

### Step 3: Add Environment Variables

Create a file called `.env.local` in the root of your project (the same folder as `package.json`):

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_cloud_url
NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url
```

You can find these URLs in your Convex dashboard after setting up your project. The site URL usually looks like `https://your-deployment.convex.site`.

You can also skip `.env.local` at first. The site will still start, but service-backed features such as writing data, AI chat, postcards, admin, and PostHog will be empty, hidden, or show a not-configured state until their environment variables are added.

To intentionally hide optional features in a fork, add any of these:

```bash
NEXT_PUBLIC_ENABLE_BLOG=false
NEXT_PUBLIC_ENABLE_AI_CHAT=false
NEXT_PUBLIC_ENABLE_POSTCARDS=false
NEXT_PUBLIC_ENABLE_POSTHOG=false
```

**Important**: Never commit `.env.local` to GitHub. It's already in `.gitignore`, so Git will ignore it automatically.

### Step 4: Run Everything Together

Open **two terminal windows** (or two tabs in VS Code's terminal):

**Terminal 1** — Run the website:
```bash
npm run dev
```

**Terminal 2** — Run Convex:
```bash
npx convex dev
```

Now go to `http://localhost:8080` again. The writing section should show your Cleve posts!

---

## Make It Your Own

Time for the fun part — replacing Ashvin's info with yours.

> **Pro tip**: If you installed a coding agent (Antigravity, Claude Code, or Codex) from the prerequisites, you can skip the manual editing below. Just tell the agent what you want to change and it'll do it for you. For example: *"Replace all of Ashvin's personal info with mine — my name is Jane Doe, I'm a designer in NYC, here are my social links..."*

### Where Everything Lives

The personal content is split into small React components. You don't need to understand React deeply — just find the text you want to change and replace it.

| What | File | What to Change |
| --- | --- | --- |
| Your name, tagline, photo, social links | `src/components/HeroSection.tsx` | Text, image path, URLs |
| Navigation links | `src/components/SiteNav.tsx` | Link labels and URLs |
| Work experience | `src/components/WorkSection.tsx` | Job titles, companies, descriptions |
| Involvement/activities | `src/components/InvolvementSection.tsx` | Organizations, roles |
| Your bio | `src/components/AboutSection.tsx` | Your story |
| Writing preview | `src/components/WritingSection.tsx` | Usually no changes needed |
| Interests | `src/components/InterestsSection.tsx` | Your interests |
| Resources you recommend | `src/components/ResourcesSection.tsx` | Books, tools, links |
| Contact info | `src/components/ContactSection.tsx` | Email, Cal.com link |
| Footer | `src/components/Footer.tsx` | Credits, links |

### Replace Images

Put your own images (profile photo, project screenshots, etc.) in the `public/` folder. Then update the file paths in the components above to point to your new images.

For example, if you add `public/my-photo.jpg`, you'd reference it in code as `/my-photo.jpg`.

### Update Social Links

In `src/components/HeroSection.tsx`, you'll find a `socials` array at the top of the file. Replace the URLs with your own:

```tsx
{
  label: "LinkedIn",
  href: "https://linkedin.com/in/YOUR-NAME",
  icon: "/social-icons/LinkedIn_logo.svg",
},
```

### Postcard Wall

The site includes a postcard feature where visitors can leave you notes at `/postcards`. There's also an admin page at `/admin/postcards` for managing them. To set the admin password:

```bash
npx convex env set POSTCARD_ADMIN_SECRET your_secret_password
```

---

## Deploy for Free

Once your site looks good locally, let's put it on the internet. Everything below is free.

### Step 1: Deploy Convex

Make sure your Cleve username is set:

```bash
npx convex env set CLEVE_PUBLIC_PROFILE_SLUG your_cleve_username
```

Then deploy:

```bash
npx convex deploy
```

This pushes your Convex functions to the cloud. Copy the deployment URLs it gives you — you'll need them for Vercel.

### Step 2: Push Your Code to GitHub

If you forked the repo, your changes need to be pushed to your fork:

```bash
git add -A
git commit -m "customize site with my info"
git push
```

If this is your first push, Git might ask you to log in. Follow the prompts.

### Step 3: Deploy to Vercel

[Vercel](https://vercel.com) is where your website will live. It's free for personal projects.

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click **Add New Project**
3. Import your forked repository
4. Vercel will auto-detect it's a Next.js project — the defaults are fine
5. Before deploying, add your environment variables:
   - `NEXT_PUBLIC_CONVEX_URL` — your Convex cloud URL
   - `NEXT_PUBLIC_CONVEX_SITE_URL` — your Convex site URL (the one ending in `.convex.site`)
   - Optional feature flags such as `NEXT_PUBLIC_ENABLE_BLOG=false` if you want to ship without a service-backed feature
6. Click **Deploy**

In about a minute, your site will be live! Vercel gives you a URL like `your-project.vercel.app`. You can also connect a custom domain later from Vercel's dashboard.

---

## Tech Stack

For the curious, here's what powers everything:

| Layer | Tool | What It Does |
| --- | --- | --- |
| Framework | Next.js + React | Builds the pages and handles routing |
| Styling | Tailwind CSS + shadcn/ui | Makes everything look good without writing much CSS |
| Data fetching | TanStack Query | Fetches and caches blog posts efficiently |
| Backend | Convex | Runs the proxy that connects to Cleve |
| Blog content | Cleve | Where you write and publish posts |
| Analytics | Vercel Analytics | Tracks page views (privacy-friendly) |
| Hosting | Vercel | Serves the site to visitors |

---

## Project Structure

Here's a map of the important files:

```
ashvinpersonalwebsite/
|
|-- app/                          # Pages and routes
|   |-- blog/
|   |   |-- [id]/page.tsx         # Individual blog post page
|   |   |-- page.tsx              # Blog index (list of all posts)
|   |-- admin/postcards/page.tsx  # Postcard admin panel
|   |-- sitemap.ts                # Auto-generated sitemap for SEO
|
|-- convex/
|   |-- http.ts                   # The Cleve proxy (fetches your posts)
|
|-- public/                       # Images, icons, and static files
|
|-- src/
|   |-- components/               # UI building blocks
|   |   |-- HeroSection.tsx       # Your name, photo, and social links
|   |   |-- AboutSection.tsx      # Your bio
|   |   |-- WorkSection.tsx       # Work experience
|   |   |-- WritingSection.tsx    # Blog preview on homepage
|   |   |-- ActivityMap.tsx       # Writing heatmap + side panel
|   |   |-- ContactSection.tsx    # How to reach you
|   |   |-- ...                   # Other sections
|   |
|   |-- lib/
|   |   |-- cleve.ts              # Talks to the Convex proxy
|   |   |-- layout.ts             # Shared layout settings
|   |   |-- seo.ts                # SEO metadata helpers
|   |
|   |-- screens/
|       |-- Index.tsx              # Homepage
|       |-- Blog.tsx               # Blog listing page
|       |-- BlogPost.tsx           # Single blog post page
|
|-- .env.local                    # Your secret environment variables (not committed)
|-- package.json                  # Project dependencies and scripts
```

---

## Useful Commands

| Command | What It Does |
| --- | --- |
| `npm run dev` | Start the website locally on port 8080 |
| `npm run build` | Build for production (Vercel does this for you) |
| `npm run lint` | Check code for common mistakes |
| `npm run test` | Run automated tests |
| `npx convex dev` | Run Convex locally (needed for the blog to work) |
| `npx convex deploy` | Deploy Convex to the cloud |

---

## Troubleshooting

### "I see the site but the writing section is empty"

You need both environment variables in `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url
```

And you need Convex running (`npx convex dev` in a second terminal).

### "It still shows Ashvin's blog posts"

Set your own Cleve username in Convex:

```bash
npx convex env set CLEVE_PUBLIC_PROFILE_SLUG your_cleve_username
```

Then restart Convex:

```bash
npx convex dev --once
```

### "My Cleve posts don't show up"

Make sure your notes are **published** on your public Cleve profile. Private notes won't appear on your website.

### "The site works locally but the blog breaks on Vercel"

Double-check that Vercel has both environment variables set:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`

And that Convex has your Cleve slug:

```bash
npx convex env set CLEVE_PUBLIC_PROFILE_SLUG your_cleve_username
```

### "npm install gives errors"

Make sure you have Node.js 18 or higher:

```bash
node --version
```

If you're on an older version, download the latest LTS from [nodejs.org](https://nodejs.org).

### "git push asks for a password"

GitHub no longer accepts passwords for Git operations. You'll need to either:
- Use **GitHub CLI**: Install from [cli.github.com](https://cli.github.com), then run `gh auth login`
- Or set up an **SSH key**: Follow [GitHub's guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

## How the Writing System Works (For the Curious)

You don't need to understand this to use the template, but if you're curious:

```
You publish a note on Cleve
  -> Your Cleve public profile updates (app.cleve.ai/user/you)
  -> Your website's Convex proxy fetches from Cleve's API
  -> The frontend (WritingSection, Blog, ActivityMap) displays it
```

The Convex proxy lives in `convex/http.ts`. It exposes two endpoints:

```
GET /cleve-proxy?resource=notes        # All published notes
GET /cleve-proxy?resource=note&id=123  # A single note by ID
```

The frontend client in `src/lib/cleve.ts` calls these endpoints and feeds the data into React components. TanStack Query handles caching so the site feels fast.

When you publish a new note on Cleve:
- The homepage writing section updates
- The `/blog` page shows the new post
- The activity heatmap gets a new green square
- The post is available at `/blog/:id` with full SEO metadata

No redeploy needed. Just write and publish.

---

## Philosophy

Most personal websites go stale because publishing is too much work. You have to write markdown, commit it, push, wait for a deploy...

This setup fixes that by keeping the stable parts in code and the living parts in Cleve:

- **Code** owns your layout, design, and identity
- **Cleve** owns your thinking and writing
- **Convex** safely connects them

Write in Cleve. Publish when ready. Your website stays alive.

---

## Credits

Built by [Ashvin Praveen](https://ashvinpraveen.com), co-founder and CEO of [Cleve](https://cleve.ai).

Use it, remix it, make it yours. And if you do, I'd love to see what you build — drop a link in the Issues tab or tag me on [X](https://x.com/ashvinpk)!

If this helped you, please **star the repo** — it really helps others discover it.
