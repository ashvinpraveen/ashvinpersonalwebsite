import { describe, expect, it } from "vitest";
import {
  isCapitalRaiseAction,
  isFundingPitchAction,
  resolveCapitalRaiseBeforeBankruptcy,
} from "./capitalRaise";

describe("capital raise reliability", () => {
  it("recognizes funding pitches and other capital raises", () => {
    expect(isFundingPitchAction("pitchSeed")).toBe(true);
    expect(isFundingPitchAction("closeLeads")).toBe(false);
    expect(isCapitalRaiseAction("takePeInvestment")).toBe(true);
    expect(isCapitalRaiseAction("buildMvp")).toBe(false);
  });

  it("wires capital immediately instead of bankrupting mid-raise", () => {
    const rescued = resolveCapitalRaiseBeforeBankruptcy(
      {
        cash: -200,
        activity: { actionId: "pitchPreseed" } as { actionId: string } | null,
      },
      (game) => ({
        ...game,
        cash: game.cash + 100_000,
        activity: null as { actionId: string } | null,
      }),
    );

    expect(rescued).toEqual({
      cash: 99_800,
      activity: null,
    });
  });

  it("does not rescue unrelated activities", () => {
    const result = resolveCapitalRaiseBeforeBankruptcy(
      {
        cash: -200,
        activity: { actionId: "buildMvp" } as { actionId: string } | null,
      },
      (game) => ({
        ...game,
        cash: game.cash + 100_000,
        activity: null as { actionId: string } | null,
      }),
    );

    expect(result).toBeNull();
  });
});
