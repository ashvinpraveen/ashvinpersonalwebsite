import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface CoachFeedbackProps {
  drillType: "constraint" | "threshold";
  result: Record<string, unknown>;
}

const CoachFeedback = ({ drillType, result }: CoachFeedbackProps) => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const getFeedback = async () => {
    setLoading(true);
    setRequested(true);
    setFeedback("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reps-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ drillType, result }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to get feedback");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setFeedback(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback("Couldn't get coach feedback right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!requested) {
    return (
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={getFeedback}
          className="font-mono text-sm text-primary hover:underline underline-offset-4 transition-colors"
        >
          Get coach feedback →
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Coach Feedback
      </p>
      <div className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary">
        {loading && !feedback && (
          <p className="text-muted-foreground font-mono text-xs animate-pulse">Analyzing your rep...</p>
        )}
        {feedback && <ReactMarkdown>{feedback}</ReactMarkdown>}
      </div>
    </div>
  );
};

export default CoachFeedback;
