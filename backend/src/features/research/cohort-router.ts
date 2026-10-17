import {
  CohortQuerySchema,
  CohortResponseSchema,
  ComparisonMetricSchema,
  type AnalyticsMetric,
  type ComparisonResponse,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { PlayerProvider } from '../players/player-provider.js';
import { ProviderError } from '../players/provider-error.js';
import type { SeasonTotalsProvider } from './season-totals-provider.js';
import { efficiencyMetrics } from './efficiency.js';
import { loadComparisonRows } from './comparison-service.js';
import { analyzeCohort } from './cohort-core.js';
import { researchProvenance } from './provenance.js';
import type { DataSource } from '@nba-performance-explorer/contracts';
import { SourceWorkBudget } from './source-work-budget.js';

export function createCohortRouter(
  provider: PlayerProvider,
  source: DataSource,
  totalsProvider?: SeasonTotalsProvider,
  budget = new SourceWorkBudget(),
) {
  const router = Router();
  router.get(
    '/',
    budget.wrap(async (req, res) => {
      const parsed = CohortQuerySchema.safeParse(req.query);
      if (!parsed.success)
        return sendApiError(
          res,
          400,
          'INVALID_COHORT_QUERY',
          'Choose 2–4 distinct player-seasons, supported metrics and weights from -5 to 5.',
        );
      const q = parsed.data;
      const seasons = q.seasons.split(',');
      const selection = q.players
        .split(',')
        .map((playerId, i) => ({ playerId, season: seasons[i]! }));
      const rows = await loadComparisonRows(provider, selection);
      const values: { playerId: string; x: number; y: number }[] = [];
      const excluded: { playerId: string; reason: string }[] = [];
      const isRatio = (metric: AnalyticsMetric) =>
        ['fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage'].includes(
          metric,
        );
      const needsTotals =
        isRatio(q.x) ||
        isRatio(q.y) ||
        !ComparisonMetricSchema.safeParse(q.x).success ||
        !ComparisonMetricSchema.safeParse(q.y).success;
      for (const row of rows) {
        if (
          !row.stats ||
          row.stats.gamesPlayed === 0 ||
          row.stats.gamesPlayed < q.minGames
        ) {
          excluded.push({
            playerId: row.playerId,
            reason: row.stats ? 'Below minimum games / no played games.' : row.status,
          });
          continue;
        }
        let derived: ReturnType<typeof efficiencyMetrics> | null = null;
        if (needsTotals && totalsProvider) {
          try {
            const raw = await totalsProvider.getSeasonTotals(row.playerId, row.season);
            if (
              raw.totals?.playerId === row.playerId &&
              raw.totals.season === row.season &&
              raw.totals.gamesPlayed === row.stats.gamesPlayed
            )
              derived = efficiencyMetrics(raw.totals);
          } catch (error) {
            if (!(error instanceof ProviderError)) throw error;
          }
        }
        const metricValue = (metric: AnalyticsMetric) => {
          if (
            metric === 'fieldGoalPercentage' ||
            metric === 'threePointPercentage' ||
            metric === 'freeThrowPercentage'
          )
            return derived?.[metric] ?? null;
          const regular = ComparisonMetricSchema.safeParse(metric);
          if (regular.success) return row.stats![regular.data];
          if (
            metric === 'trueShooting' ||
            metric === 'effectiveFieldGoal' ||
            metric === 'assistTurnover' ||
            metric === 'pointsPer36'
          )
            return derived?.[metric] ?? null;
          return null;
        };
        const x = metricValue(q.x),
          y = metricValue(q.y);
        if (x === null || y === null) {
          excluded.push({
            playerId: row.playerId,
            reason:
              'Required raw metric inputs unavailable or summaries disagree on sample/scope.',
          });
          continue;
        }
        values.push({ playerId: row.playerId, x, y });
      }
      const analysis = analyzeCohort(values, q, excluded);
      const provenance = researchProvenance(
        source,
        'User-selected 2–4 player-season cohort only. Not a league population, official ranking or era adjustment.',
        [
          'Score uses within-selected-cohort population z-scores. Positive weights favor larger values; negative weights favor smaller values. Scores round to six decimals for ties.',
          ...(analysis.sample < 3
            ? [
                'Small cohort: fewer than three qualifying seasons. Descriptive correlation is unavailable.',
              ]
            : [
                'Correlation describes this selected cohort only and does not establish causation.',
              ]),
          ...(needsTotals
            ? [
                'Raw derived values require matching NBA player/season and equal games-played counts. Missing or conflicting inputs are excluded.',
              ]
            : []),
        ],
      );
      return res.json(
        CohortResponseSchema.parse({
          rows: rows as ComparisonResponse['rows'],
          analysis,
          provenance,
        }),
      );
    }),
  );
  router.all('/', methodNotAllowedHandler);
  return router;
}
