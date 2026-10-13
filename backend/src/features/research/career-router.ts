import { Router } from 'express';
import {
  CareerQuerySchema,
  CareerComparisonQuerySchema,
  CareerComparisonResponseSchema,
  CareerResearchResponseSchema,
  ResearchPlayerIdSchema,
  type DataSource,
  type CareerMetric,
} from '@nba-performance-explorer/contracts';
import type { PlayerProvider } from '../players/player-provider.js';
import type { SeasonTotalsProvider } from './season-totals-provider.js';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { SourceWorkBudget } from './source-work-budget.js';
import { ProviderError, providerInvalidResponse } from '../players/provider-error.js';
import { researchProvenance } from './provenance.js';
import { analyzeCareer } from './career-service.js';

export function createCareerRouter(
  provider: PlayerProvider,
  source: DataSource,
  totals: SeasonTotalsProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  async function load(playerId: string, metric: CareerMetric, minGames: number) {
    const player = await provider.getPlayerById(playerId);
    if (!player) return null;
    if (player.id !== playerId)
      throw providerInvalidResponse('Career player identity mismatch.');
    const loaded = totals?.getCareerTotals
      ? await totals.getCareerTotals(playerId)
      : null;
    const analysis = analyzeCareer(loaded?.records ?? [], playerId, metric, minGames);
    const base = researchProvenance(
      source,
      'Reported regular-season rows only; career completeness and season completion are not verified.',
      [
        'Trade aggregate rows count once. Missing counts remain unavailable; no per-game averages are summed.',
        'Peak means the highest selected metric among reported seasons meeting the minimum games; all exact ties are retained.',
        ...(!loaded ? ['Career raw totals provider is not enabled.'] : []),
      ],
    );
    return CareerResearchResponseSchema.parse({
      player,
      ...analysis,
      status: !loaded
        ? 'unsupported'
        : loaded.records.length
          ? 'available'
          : 'records-unavailable',
      provenance: {
        ...base,
        retrievedAt: loaded?.retrievedAt ?? null,
        warnings: base.warnings.filter(
          (w) => !loaded || !w.startsWith('Upstream retrieval time'),
        ),
      },
    });
  }
  router.get(
    '/analytics/careers',
    budget.wrap(async (req, res) => {
      const query = CareerComparisonQuerySchema.safeParse(req.query);
      if (!query.success)
        return sendApiError(
          res,
          400,
          'INVALID_CAREER_COMPARISON',
          'Choose 2–4 distinct NBA players with a valid metric and minimum games.',
        );
      const rows = await Promise.all(
        query.data.players.map(async (playerId) => {
          try {
            const data = await load(playerId, query.data.metric, query.data.minGames);
            return { playerId, data, status: data?.status ?? 'player-unavailable' };
          } catch (error) {
            // A transient failure is isolated; corrupt source records still fail the response.
            if (
              !(error instanceof ProviderError) ||
              error.code === 'PROVIDER_INVALID_RESPONSE'
            )
              throw error;
            return { playerId, data: null, status: 'source-unavailable' as const };
          }
        }),
      );
      res.json(CareerComparisonResponseSchema.parse({ rows }));
    }),
  );
  router.all('/analytics/careers', methodNotAllowedHandler);
  router.get(
    '/players/:playerId/career',
    budget.wrap(async (req, res) => {
      const id = ResearchPlayerIdSchema.safeParse(req.params.playerId);
      const query = CareerQuerySchema.safeParse(req.query);
      if (!id.success || !query.success)
        return sendApiError(
          res,
          400,
          'INVALID_CAREER_QUERY',
          'Choose a valid NBA player, metric and minimum games (1–82).',
        );
      const data = await load(id.data, query.data.metric, query.data.minGames);
      if (!data) return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      res.json(data);
    }),
  );
  router.all('/players/:playerId/career', methodNotAllowedHandler);
  return router;
}
