import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

http.route({
  path: "/cleve-proxy",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/reps-coach",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/cleve-proxy",
  method: "GET",
  handler: httpAction(async (_, req) => {
    const CLEVE_API_KEY = process.env.CLEVE_API_KEY;
    if (!CLEVE_API_KEY) {
      return new Response(JSON.stringify({ error: "CLEVE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/notes";
    const res = await fetch(`https://app.cleve.ai/api/v1${path}`, {
      headers: { Authorization: `Bearer ${CLEVE_API_KEY}` },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/reps-coach",
  method: "POST",
  handler: httpAction(async (_, req) => {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { drillType, result } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (drillType === "constraint") {
      systemPrompt = `You are a writing coach with the mindset of a competitive distance running coach. You analyze writing drills - not to be nice, but to make the writer better. Be direct, specific, and constructive. Use short paragraphs. Reference specific words or phrases from their writing.`;
      userPrompt = `The writer was given this paragraph and asked to rewrite it in exactly 15 words within 60 seconds.

**Original:**
${result.original}

**Their rewrite (${result.wordCount} words, ${result.timeUsed}s):**
${result.rewrite}

Analyze:
1. Did they hit the 15-word target? If over/under, what could they cut or add?
2. Did they capture the core idea? What was lost or preserved?
3. What does their word choice reveal about their thinking patterns?
4. One specific drill to improve their compression skill.`;
    } else if (drillType === "threshold") {
      const wordsPerMinute = Math.round((result.wordCount as number) / (result.targetMinutes as number));
      systemPrompt = `You are a writing coach with the mindset of a competitive distance running coach. You analyze threshold training sessions - volume, pace, and form under pressure. Be direct and specific. Use running analogies when they fit naturally.`;
      userPrompt = `The writer set a target of ${result.targetWords} words in ${result.targetMinutes} minutes.

**Results:**
- Words written: ${result.wordCount}
- Pace: ~${wordsPerMinute} words/minute
- Backspace presses: ${result.backspaceCount}
${(result.backspaceCount as number) > 20 ? "(That's a lot of editing mid-flow.)" : ""}

**Their writing:**
${(result.text as string).slice(0, 2000)}${(result.text as string).length > 2000 ? "..." : ""}

Analyze:
1. Pace assessment - did they sustain output or fade?
2. The backspace count - what does it say about their editing impulse?
3. Sentence structure patterns — do they default to long or short? Simple or complex?
4. One specific observation about their voice or thinking style.
5. What to focus on in the next session.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }),
});

export default http;
