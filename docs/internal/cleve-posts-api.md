# Cleve Posts API

Last updated: 2026-11-26

## Where posts come from

The blog shows the docs Ashvin publishes at `https://cleve.ai/@ashvinpraveen`. `src/lib/cleve.ts` reads them from Cleve's public posts API. The server pages and the browser both call it directly: it needs no key and allows any origin.

```text
GET https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts?limit=50&cursor=<nextCursor>
GET https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts/<postId>
GET https://app.cleve.ai/api/v1/sites/ashvinpraveen/rss
```

- The list is newest published first. `fetchNotes` follows `nextCursor` until it is `null`, 50 posts at a time.
- A post has `id`, `title`, `excerpt`, `url`, `imageUrl`, `publishedAt` and `updatedAt` (ISO strings) and `author`. A single post also has `markdown`: the body without the title heading, which `RichMarkdown` renders.
- Responses are cached for five minutes on Cleve's CDN, so an edit in Cleve shows on the site within about five minutes.
- Full reference: https://docs.cleve.ai/developers/api#published-posts

## Settings

```bash
NEXT_PUBLIC_CLEVE_HANDLE=ashvinpraveen                 # default; forks set their own handle
NEXT_PUBLIC_CLEVE_API_URL=https://app.cleve.ai/api/v1  # default; point at a local or preview Cleve to test
```

Both are read when the site is built, so redeploy after changing them on Vercel.

## History

Until November 2026 the site read posts through a `/cleve-proxy` HTTP action in this repo's Convex deployment, which called Cleve's internal Convex queries and converted the editor JSON to Markdown itself. The posts API replaced it, and the proxy was removed. Convex now serves only view counts, chat, postcards, run club, music and admin.

Check the live API:

```bash
curl -s 'https://app.cleve.ai/api/v1/sites/ashvinpraveen/posts?limit=3' | head -c 600
```
