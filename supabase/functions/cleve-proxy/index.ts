import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLEVE_BASE = "https://app.cleve.ai/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const CLEVE_API_KEY = Deno.env.get("CLEVE_API_KEY");
  if (!CLEVE_API_KEY) {
    return new Response(JSON.stringify({ error: "CLEVE_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    // Strip the function path prefix to get the Cleve path
    // e.g. /functions/v1/cleve-proxy/notes/123 → /notes/123
    const clevePath = url.pathname.replace(/.*\/cleve-proxy/, "") || "/notes";

    const cleveRes = await fetch(`${CLEVE_BASE}${clevePath}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${CLEVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const data = await cleveRes.json();

    return new Response(JSON.stringify(data), {
      status: cleveRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleve-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
