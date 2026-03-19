import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { drillType, result } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (drillType === "constraint") {
      systemPrompt = `You are a writing coach with the mindset of a competitive distance running coach. You analyze writing drills — not to be nice, but to make the writer better. Be direct, specific, and constructive. Use short paragraphs. Reference specific words or phrases from their writing.`;
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
      const wordsPerMinute = Math.round(result.wordCount / result.targetMinutes);
      systemPrompt = `You are a writing coach with the mindset of a competitive distance running coach. You analyze threshold training sessions — volume, pace, and form under pressure. Be direct and specific. Use running analogies when they fit naturally.`;
      userPrompt = `The writer set a target of ${result.targetWords} words in ${result.targetMinutes} minutes.

**Results:**
- Words written: ${result.wordCount}
- Pace: ~${wordsPerMinute} words/minute
- Backspace presses: ${result.backspaceCount}
${result.backspaceCount > 20 ? "(That's a lot of editing mid-flow.)" : ""}

**Their writing:**
${result.text.slice(0, 2000)}${result.text.length > 2000 ? "..." : ""}

Analyze:
1. Pace assessment — did they sustain output or fade?
2. The backspace count — what does it say about their editing impulse?
3. Sentence structure patterns — do they default to long or short? Simple or complex?
4. One specific observation about their voice or thinking style.
5. What to focus on in the next session.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("reps-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
