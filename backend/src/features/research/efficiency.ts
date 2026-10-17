import type {
  EfficiencyMetrics,
  SeasonTotals,
} from '@nba-performance-explorer/contracts';

export function efficiencyMetrics(s: SeasonTotals): EfficiencyMetrics {
  const ratio = (made: number | null, attempted: number | null) =>
    made !== null && attempted !== null && attempted > 0 ? made / attempted : null;
  return {
    fieldGoalPercentage: ratio(s.fieldGoalsMade, s.fieldGoalsAttempted),
    threePointPercentage: ratio(s.threesMade, s.threesAttempted),
    freeThrowPercentage: ratio(s.freeThrowsMade, s.freeThrowsAttempted),
    effectiveFieldGoal:
      s.fieldGoalsMade !== null &&
      s.threesMade !== null &&
      s.fieldGoalsAttempted !== null &&
      s.fieldGoalsAttempted > 0
        ? (s.fieldGoalsMade + 0.5 * s.threesMade) / s.fieldGoalsAttempted
        : null,
    trueShooting:
      s.points !== null &&
      s.fieldGoalsAttempted !== null &&
      s.freeThrowsAttempted !== null &&
      s.fieldGoalsAttempted + 0.44 * s.freeThrowsAttempted > 0
        ? s.points / (2 * (s.fieldGoalsAttempted + 0.44 * s.freeThrowsAttempted))
        : null,
    assistTurnover: ratio(s.assists, s.turnovers),
    pointsPer36:
      s.points !== null && s.minutes !== null && s.minutes > 0
        ? (36 * s.points) / s.minutes
        : null,
  };
}
