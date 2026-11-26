import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
};

http.route({
  path: "/article-views",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/article-views",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = (await req.json()) as { articleId?: string };
      const articleId = typeof body.articleId === "string" ? body.articleId : null;
      if (!articleId) {
        return jsonResponse({ error: "Missing articleId" }, { status: 400 });
      }
      await ctx.runMutation(api.articleViews.record, { articleId });
      return jsonResponse({ ok: true });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Failed to record view" },
        { status: 500 },
      );
    }
  }),
});

http.route({
  path: "/article-views",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const articleIds = url.searchParams.get("ids");

    try {
      if (articleIds) {
        const ids = articleIds.split(",").filter(Boolean);
        const views: Record<string, number> = await ctx.runQuery(api.articleViews.getBatch, {
          articleIds: ids,
        });
        return jsonResponse({ data: views });
      }

      const articleId = url.searchParams.get("id");
      if (!articleId) {
        return jsonResponse({ error: "Missing article id(s)" }, { status: 400 });
      }
      const views: number = await ctx.runQuery(api.articleViews.get, { articleId });
      return jsonResponse({ data: views });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Failed to fetch views" },
        { status: 500 },
      );
    }
  }),
});

export default http;
