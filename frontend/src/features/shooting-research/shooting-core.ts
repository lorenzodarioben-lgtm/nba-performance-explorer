import {
  SeasonTotalsSchema,
  type SeasonTotals,
} from '@nba-performance-explorer/contracts';
export function shootingProfile(input: SeasonTotals, minAttempts: number) {
  const t = SeasonTotalsSchema.parse(input);
  if (!Number.isInteger(minAttempts) || minAttempts < 1 || minAttempts > 1000)
    throw new Error('Invalid attempt qualification.');
  const subtract = (a: number | null, b: number | null) =>
    a === null || b === null ? null : a - b;
  const twosMade = subtract(t.fieldGoalsMade, t.threesMade),
    twosAttempted = subtract(t.fieldGoalsAttempted, t.threesAttempted);
  if (twosMade !== null && twosAttempted !== null && twosMade > twosAttempted)
    throw new Error('Inconsistent two-point counts.');
  const multiply = (value: number | null, factor: number) =>
    value === null ? null : value * factor;
  const rows = [
    {
      type: 'Two-point field goals',
      made: twosMade,
      attempted: twosAttempted,
      points: multiply(twosMade, 2),
    },
    {
      type: 'Three-point field goals',
      made: t.threesMade,
      attempted: t.threesAttempted,
      points: multiply(t.threesMade, 3),
    },
    {
      type: 'Free throws',
      made: t.freeThrowsMade,
      attempted: t.freeThrowsAttempted,
      points: t.freeThrowsMade,
    },
  ];
  if (
    t.points !== null &&
    rows.every((r) => r.points !== null) &&
    rows.reduce((s, r) => s + r.points!, 0) !== t.points
  )
    throw new Error('Inconsistent made-shot point totals.');
  return {
    rows: rows.map((r) => ({
      ...r,
      percentage:
        r.made !== null &&
        r.attempted !== null &&
        r.attempted > 0 &&
        r.attempted >= minAttempts
          ? r.made / r.attempted
          : null,
      qualification:
        r.attempted === null
          ? 'Attempt count unavailable'
          : r.attempted === 0
            ? 'No recorded attempts'
            : r.attempted < minAttempts
              ? 'Below selected attempt minimum'
              : 'Qualified',
      fieldGoalAttemptShare:
        r.type !== 'Free throws' &&
        r.attempted !== null &&
        t.fieldGoalsAttempted !== null &&
        t.fieldGoalsAttempted > 0
          ? r.attempted / t.fieldGoalsAttempted
          : null,
      pointShare:
        r.points !== null && t.points !== null && t.points > 0
          ? r.points / t.points
          : null,
    })),
    freeThrowRate:
      t.freeThrowsAttempted !== null &&
      t.fieldGoalsAttempted !== null &&
      t.fieldGoalsAttempted > 0
        ? t.freeThrowsAttempted / t.fieldGoalsAttempted
        : null,
  };
}
