import { Router } from 'express';
import {
  CareerQuerySchema,
  CareerComparisonQuerySchema,
  CareerComparisonResponseSchema,
  CareerResearchResponseSchema,
  ResearchPlayerIdSchema,
  type DataSource,
  type CareerMetric,
  type SeasonScope,
} from '@nba-performance-explorer/contracts';
import type { PlayerProvider } from '../players/player-provider.js';
import type { SeasonTotalsProvider } from './season-totals-provider.js';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { SourceWorkBudget } from './source-work-budget.js';
import { ProviderError, providerInvalidResponse } from '../players/provider-error.js';
import { researchProvenance } from './provenance.js';
import { analyzeCareer } from './career-service.js';
import type { PlayerBioProvider } from './player-bio-provider.js';

export function createCareerRouter(
  provider: PlayerProvider,
  source: DataSource,
  totals: SeasonTotalsProvider | undefined,
  budget: SourceWorkBudget,
  bio?: PlayerBioProvider,
) {
  const router = Router();
  async function load(
    playerId: string,
    metric: CareerMetric,
    minGames: number,
    scope: SeasonScope,
  ) {
    const player = await provider.getPlayerById(playerId);
    if (!player) return null;
    if (player.id !== playerId)
      throw providerInvalidResponse('Career player identity mismatch.');
    const loaded = totals?.getCareerTotals
      ? await totals.getCareerTotals(playerId, scope)
      : null;
    let birth: { birthDate: string | null; retrievedAt: string } | null = null;
    const birthWarnings: string[] = [];
    if (bio && loaded) {
      try {
        birth = await bio.getBirthDate(playerId);
      } catch (error) {
        if (
          !(error instanceof ProviderError) ||
          error.code === 'PROVIDER_INVALID_RESPONSE'
        )
          throw error;
        birthWarnings.push(
          'Birth date source unavailable; age values are not inferred.',
        );
      }
    }
    const analysis = analyzeCareer(loaded?.records ?? [], playerId, metric, minGames, {
      birthDate: birth?.birthDate ?? null,
      stints: loaded?.stints ?? [],
    });
    const base = researchProvenance(
      source,
      `Reported ${scope} rows only; career completeness and season completion are not verified.`,
      [
        'Trade aggregate rows count once. Missing counts remain unavailable; no per-game averages are summed.',
        'Peak means the highest selected metric among reported seasons meeting the minimum games; all exact ties are retained.',
        ...(!loaded ? ['Career raw totals provider is not enabled.'] : []),
        ...birthWarnings,
        'Age is completed calendar years on October 1 of the season start year, calculated from sourced birth date; not draft age or official seasonal age.',
        'Team stint abbreviations and NBA IDs are source records, not transfer dates or reconstructed historical franchise names.',
      ],
    );
    return CareerResearchResponseSchema.parse({
      player,
      birthDate: birth?.birthDate ?? null,
      birthDateRetrievedAt: birth?.retrievedAt ?? null,
      ...analysis,
      status: !loaded
        ? 'unsupported'
        : loaded.records.length
          ? 'available'
          : 'records-unavailable',
      provenance: {
        ...base,
        scope,
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
            const data = await load(
              playerId,
              query.data.metric,
              query.data.minGames,
              query.data.scope,
            );
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
      const data = await load(
        id.data,
        query.data.metric,
        query.data.minGames,
        query.data.scope,
      );
      if (!data) return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      res.json(data);
    }),
  );
  router.all('/players/:playerId/career', methodNotAllowedHandler);
  return router;
}
