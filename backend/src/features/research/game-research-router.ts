import { Router } from 'express';
import { z } from 'zod';
import {
  GameResearchQuerySchema,
  GameResearchResponseSchema,
  SeasonScopeComparisonResponseSchema,
  ResearchPlayerIdSchema,
  SeasonIdSchema,
  type DataSource,
} from '@nba-performance-explorer/contracts';
import type { PlayerProvider } from '../players/player-provider.js';
import { ProviderError, providerInvalidResponse } from '../players/provider-error.js';
import { sendApiError, methodNotAllowedHandler } from '../../middleware/errors.js';
import type { GameResearchProvider } from './game-research-provider.js';
import type { SeasonTotalsProvider } from './season-totals-provider.js';
import { SourceWorkBudget } from './source-work-budget.js';
import { analyzeResearchGames } from './game-research-service.js';
import { researchProvenance } from './provenance.js';
import { efficiencyMetrics } from './efficiency.js';

export function createGameResearchRouter(
  provider: PlayerProvider,
  source: DataSource,
  gamesProvider: GameResearchProvider | undefined,
  totals: SeasonTotalsProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  async function playerLookup(id: string) {
    const player = await provider.getPlayerById(id);
    if (player && player.id !== id)
      throw providerInvalidResponse('Game research identity mismatch.');
    return player;
  }
  router.get(
    '/players/:playerId/game-research',
    budget.wrap(async (req, res) => {
      const id = ResearchPlayerIdSchema.safeParse(req.params.playerId),
        query = GameResearchQuerySchema.safeParse(req.query);
      if (!id.success || !query.success)
        return sendApiError(
          res,
          400,
          'INVALID_GAME_RESEARCH',
          'Choose a valid player, season, scope and bounded filters.',
        );
      const player = await playerLookup(id.data);
      if (!player)
        return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      const loaded = gamesProvider
        ? await gamesProvider.getGames(id.data, query.data.season, query.data.scope)
        : null;
      let reportedSeasonGames: number | null = null;
      const warnings = [
        'Observed games only; completeness is not verified. Shooting ratios use summed attempts, not mean game percentages. Missing/zero denominators are unavailable.',
        'TS% uses the conventional 0.44 free-throw estimate. Thresholds apply before rolling windows, splits and extrema.',
      ];
      if (loaded && totals) {
        try {
          const season = await totals.getSeasonTotals(
            id.data,
            query.data.season,
            query.data.scope,
          );
          if (
            season.totals &&
            (season.totals.playerId !== id.data ||
              season.totals.season !== query.data.season)
          )
            throw providerInvalidResponse('Game season totals scope mismatch.');
          reportedSeasonGames = season.totals?.gamesPlayed ?? null;
        } catch (error) {
          if (
            !(error instanceof ProviderError) ||
            error.code === 'PROVIDER_INVALID_RESPONSE'
          )
            throw error;
          warnings.push('Season summary unavailable; observed games remain usable.');
        }
      }
      let analysis;
      try {
        analysis = analyzeResearchGames(loaded?.games ?? [], id.data, query.data);
      } catch {
        throw providerInvalidResponse('Invalid game research records.');
      }
      if (
        reportedSeasonGames !== null &&
        reportedSeasonGames !== analysis.observedGames
      )
        warnings.push(
          `Observed ${analysis.observedGames} games; same-scope season summary reports ${reportedSeasonGames}.`,
        );
      if (analysis.filteredGames < query.data.window)
        warnings.push('Fewer matching games than the requested rolling window.');
      if (!loaded)
        warnings.push(
          'Raw game provider disabled. No inferred shooting counts or synthetic games.',
        );
      const base = researchProvenance(
        source,
        `Selected ${query.data.scope} player-season; observed games only.`,
        warnings,
      );
      res.json(
        GameResearchResponseSchema.parse({
          player,
          season: query.data.season,
          scope: query.data.scope,
          status: !loaded
            ? 'unsupported'
            : loaded.games.length
              ? 'available'
              : 'records-unavailable',
          reportedSeasonGames,
          ...analysis,
          provenance: {
            ...base,
            scope: query.data.scope,
            retrievedAt: loaded?.retrievedAt ?? null,
            warnings: base.warnings.filter(
              (w) => !loaded || !w.startsWith('Upstream retrieval time'),
            ),
          },
        }),
      );
    }),
  );
  router.all('/players/:playerId/game-research', methodNotAllowedHandler);
  router.get(
    '/players/:playerId/season-scopes',
    budget.wrap(async (req, res) => {
      const id = ResearchPlayerIdSchema.safeParse(req.params.playerId),
        query = z.object({ season: SeasonIdSchema }).strict().safeParse(req.query);
      if (!id.success || !query.success)
        return sendApiError(
          res,
          400,
          'INVALID_SCOPE_COMPARISON',
          'Choose a valid NBA player and season.',
        );
      const player = await playerLookup(id.data);
      if (!player)
        return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      const rows = await Promise.all(
        (['regular-season', 'playoffs'] as const).map(async (scope) => {
          const loaded = totals
            ? await totals.getSeasonTotals(id.data, query.data.season, scope)
            : null;
          if (
            loaded?.totals &&
            (loaded.totals.playerId !== id.data ||
              loaded.totals.season !== query.data.season)
          )
            throw providerInvalidResponse('Scope comparison identity mismatch.');
          const base = researchProvenance(
            source,
            `Raw ${scope} totals for one selected season.`,
            [
              'Equal season, separately labelled scopes. No playoffs is unavailable, not zero.',
              'TS% is an estimate with 0.44 × FTA; zero/unknown denominators unavailable.',
            ],
          );
          return {
            scope,
            status: !loaded
              ? 'unsupported'
              : loaded.totals
                ? 'available'
                : 'season-unavailable',
            totals: loaded?.totals ?? null,
            metrics: loaded?.totals ? efficiencyMetrics(loaded.totals) : null,
            provenance: {
              ...base,
              scope,
              retrievedAt: loaded?.retrievedAt ?? null,
              warnings: base.warnings.filter(
                (w) => !loaded || !w.startsWith('Upstream retrieval time'),
              ),
            },
          };
        }),
      );
      res.json(
        SeasonScopeComparisonResponseSchema.parse({
          player,
          season: query.data.season,
          rows,
        }),
      );
    }),
  );
  router.all('/players/:playerId/season-scopes', methodNotAllowedHandler);
  return router;
}
