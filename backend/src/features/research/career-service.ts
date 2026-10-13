import {
  SeasonTotalsSchema,
  careerMetricValue,
  type CareerMetric,
  type CareerSeason,
  type SeasonTotals,
} from '@nba-performance-explorer/contracts';
import { providerInvalidResponse } from '../players/provider-error.js';
import { efficiencyMetrics } from './efficiency.js';

export function analyzeCareer(
  records: SeasonTotals[],
  playerId: string,
  metric: CareerMetric,
  minGames: number,
) {
  const seen = new Set<string>();
  if (records.length > 100) throw providerInvalidResponse('Too many career seasons.');
  const seasons: CareerSeason[] = records
    .map((record) => {
      const parsed = SeasonTotalsSchema.safeParse(record);
      if (!parsed.success || record.playerId !== playerId || seen.has(record.season))
        throw providerInvalidResponse('Invalid career scope or duplicate season.');
      seen.add(record.season);
      const perGame = (n: number | null) =>
        n !== null && record.gamesPlayed > 0 ? n / record.gamesPlayed : null;
      return {
        totals: record,
        metrics: efficiencyMetrics(record),
        pointsPerGame: perGame(record.points),
        reboundsPerGame: perGame(record.rebounds),
        assistsPerGame: perGame(record.assists),
      };
    })
    .sort((a, b) => a.totals.season.localeCompare(b.totals.season));
  const numberKeys = [
    'minutes',
    'points',
    'rebounds',
    'assists',
    'turnovers',
    'fieldGoalsMade',
    'fieldGoalsAttempted',
    'threesMade',
    'threesAttempted',
    'freeThrowsMade',
    'freeThrowsAttempted',
  ] as const;
  let aggregate = null;
  if (seasons.length) {
    const sums = Object.fromEntries(
      numberKeys.map((key) => [
        key,
        records.some((r) => r[key] === null)
          ? null
          : records.reduce((sum, r) => sum + (r[key] ?? 0), 0),
      ]),
    ) as Pick<SeasonTotals, (typeof numberKeys)[number]>;
    const gamesPlayed = records.reduce((sum, r) => sum + r.gamesPlayed, 0);
    aggregate = {
      ...sums,
      seasonsReported: records.length,
      gamesPlayed,
      metrics: efficiencyMetrics({
        ...sums,
        playerId,
        season: records[0]!.season,
        gamesPlayed,
      }),
    };
  }
  const qualified = seasons.flatMap((s) => {
    const value = careerMetricValue(s, metric);
    return s.totals.gamesPlayed >= minGames && value !== null
      ? [{ season: s.totals.season, value }]
      : [];
  });
  const best = qualified.length ? Math.max(...qualified.map((s) => s.value)) : null;
  const milestones = (['points', 'rebounds', 'assists'] as const).flatMap((key) => {
    if (!aggregate) return [];
    const thresholds =
      key === 'points'
        ? [1000, 5000, 10000, 20000, 30000, 40000]
        : [1000, 2500, 5000, 7500, 10000, 15000];
    return thresholds.map((threshold) => {
      let running: number | null = 0;
      let reachedByReportedSeason: string | null = null;
      for (const s of seasons) {
        const amount = s.totals[key];
        running = amount === null || running === null ? null : running + amount;
        if (!reachedByReportedSeason && running !== null && running >= threshold)
          reachedByReportedSeason = s.totals.season;
      }
      return {
        metric: key,
        threshold,
        reportedTotal: aggregate[key],
        reached: reachedByReportedSeason
          ? true
          : aggregate[key] === null
            ? null
            : aggregate[key] >= threshold,
        reachedByReportedSeason,
      };
    });
  });
  return {
    seasons,
    aggregate,
    milestones,
    peak: {
      metric,
      minGames,
      qualifiedSeasons: qualified.length,
      excludedSeasons: records.length - qualified.length,
      value: best,
      seasons: qualified.filter((s) => s.value === best).map((s) => s.season),
    },
  };
}
