import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import ConstraintDrill from "@/components/ConstraintDrill";
import ThresholdTraining from "@/components/ThresholdTraining";

type DrillMode = "select" | "constraint" | "threshold";

const Reps = () => {
  const [mode, setMode] = useState<DrillMode>("select");
  const [drillResult, setDrillResult] = useState<Record<string, unknown> | null>(null);

  const handleConstraintComplete = (result: { original: string; rewrite: string; wordCount: number; timeUsed: number }) => {
    setDrillResult(result);
  };

  const handleThresholdComplete = (result: { text: string; wordCount: number; targetWords: number; targetMinutes: number; backspaceCount: number }) => {
    setDrillResult(result);
  };

  const resetDrill = () => {
    setMode("select");
    setDrillResult(null);
  };

  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-12">
        <section className="pt-16 pb-8 md:pt-24 md:pb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1] mb-3">
            Reps
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-prose mb-2">
            Writing is a mechanical system. Clear inputs, feedback loops, daily reps. 
            This isn't about inspiration - it's about training.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            The athlete's approach to clear thinking.
          </p>
        </section>

        <section className="py-8 border-t border-border">
          {mode === "select" && (
            <div className="space-y-6">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Choose your drill
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setMode("constraint")}
                  className="border border-border hover:border-primary/40 rounded-sm p-6 text-left transition-colors group"
                >
                  <p className="font-mono text-xs text-muted-foreground mb-2">01</p>
                  <p className="font-semibold mb-2 group-hover:text-primary transition-colors">Constraint Drill</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rewrite a messy paragraph in exactly 15 words. 60 seconds. No fluff allowed.
                  </p>
                </button>
                <button
                  onClick={() => setMode("threshold")}
                  className="border border-border hover:border-primary/40 rounded-sm p-6 text-left transition-colors group"
                >
                  <p className="font-mono text-xs text-muted-foreground mb-2">02</p>
                  <p className="font-semibold mb-2 group-hover:text-primary transition-colors">Threshold Training</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Set a word target and a time limit. Write without stopping. Build endurance.
                  </p>
                </button>
              </div>
            </div>
          )}

          {mode === "constraint" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  Constraint Drill
                </p>
                <button
                  onClick={resetDrill}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </div>
              <ConstraintDrill onComplete={handleConstraintComplete} />
            </div>
          )}

          {mode === "threshold" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  Threshold Training
                </p>
                <button
                  onClick={resetDrill}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </div>
              <ThresholdTraining onComplete={handleThresholdComplete} />
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Reps;
