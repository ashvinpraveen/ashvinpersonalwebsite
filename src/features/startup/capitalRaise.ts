export const fundingPitchActionIds = [
  "pitchPreseed",
  "pitchSeed",
  "pitchSeriesA",
  "pitchSeriesB",
  "pitchSeriesC",
] as const;

export type FundingPitchActionId = (typeof fundingPitchActionIds)[number];

const capitalRaiseActionIds = [
  ...fundingPitchActionIds,
  "takeBusinessLoan",
  "takePeInvestment",
] as const;

export type CapitalRaiseActionId = (typeof capitalRaiseActionIds)[number];

export const isFundingPitchAction = (
  actionId: string,
): actionId is FundingPitchActionId =>
  (fundingPitchActionIds as readonly string[]).includes(actionId);

export const isCapitalRaiseAction = (
  actionId: string,
): actionId is CapitalRaiseActionId =>
  (capitalRaiseActionIds as readonly string[]).includes(actionId);

/**
 * VC pitches used to feel like a coin flip because a raise could be wiped by
 * bankruptcy mid-activity. Eligible capital raises always close; if cash would
 * hit zero during the raise, wire the capital immediately instead.
 */
export const resolveCapitalRaiseBeforeBankruptcy = <
  T extends {
    cash: number;
    activity: { actionId: string } | null;
  },
>(
  game: T,
  applyCompleted: (game: T, actionId: CapitalRaiseActionId) => T,
): T | null => {
  if (game.cash >= 0 || !game.activity) return null;
  if (!isCapitalRaiseAction(game.activity.actionId)) return null;

  const closed = applyCompleted(game, game.activity.actionId);
  return closed.cash >= 0 ? closed : null;
};
