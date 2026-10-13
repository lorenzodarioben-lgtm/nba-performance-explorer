import {
  CapabilityResponseSchema,
  ComparisonResponseSchema,
  ComparisonSelectionSchema,
  InsightQuerySchema,
  PlayerInsightsResponseSchema,
  ResearchPlayerIdSchema,
  type DataSource,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { PlayerProvider } from '../players/player-provider.js';
import { ProviderError, providerInvalidResponse } from '../players/provider-error.js';
import { analyzeGames } from './stats-core.js';
import { researchProvenance } from './provenance.js';

export function createResearchRouter(provider: PlayerProvider, source: DataSource) {
  const router = Router();
  router.get('/data-sources/status', (_req, res) =>
    res.json(
      CapabilityResponseSchema.parse({
        playerSource: source,
        checkedAt: new Date().toISOString(),
        hostVerified: false,
        capabilities: [
          {
            id: 'team-directory',
            status: 'available',
            reason:
              '30 sourced static NBA identities with namespaced IDs; no season rosters/results.',
          },
          {
            id: 'player-insights',
            status: 'conditional',
            reason:
              'Existing regular-season PlayerProvider; observed games only, upstream availability varies.',
          },
          {
            id: 'comparison',
            status: 'conditional',
            reason: '2–4 player season summaries from the existing provider.',
          },
          {
            id: 'local-research',
            status: 'available',
            reason: 'Local-only versioned favorites and saved URLs.',
          },
          {
            id: 'games-standings-leaders',
            status: 'blocked',
            reason:
              'New live feeds require usage rights and host validation. No fabricated substitutions.',
          },
          {
            id: 'shots-lineups-history',
            status: 'blocked',
            reason: 'No verified rights-cleared dataset for these capabilities.',
          },
          {
            id: 'league-analytics',
            status: 'blocked',
            reason:
              'No verified league cohort, raw attempts or possessions. TS%, percentiles and lineup ratings unsupported.',
          },
        ],
      }),
    ),
  );
  router.all('/data-sources/status', methodNotAllowedHandler);

  router.get('/players/:playerId/insights', async (req, res) => {
    const parsedId = ResearchPlayerIdSchema.safeParse(req.params.playerId);
    const parsedQuery = InsightQuerySchema.safeParse(req.query);
    if (!parsedId.success || !parsedQuery.success) {
      return sendApiError(
        res,
        400,
        'INVALID_INSIGHT_QUERY',
        'Choose a valid player, season and bounded filters.',
      );
    }
    const player = await provider.getPlayerById(parsedId.data);
    if (!player) return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    const seasons = await provider.listPlayerSeasons(parsedId.data);
    const season = parsedQuery.data.season ?? seasons[0]?.season ?? null;
    const stats = season
      ? await provider.getPlayerSeasonStats(parsedId.data, season)
      : null;
    const games =
      season && stats ? await provider.listPlayerGames(parsedId.data, season) : [];
    let analysis;
    try {
      analysis = analyzeGames(games, parsedQuery.data);
    } catch {
      throw providerInvalidResponse('Game records failed research validation.');
    }
    const warnings: string[] = [];
    if (!stats)
      warnings.push('No recorded season summary is available for this selection.');
    if (stats && games.length !== stats.gamesPlayed)
      warnings.push(
        `Observed ${games.length} games; season summary reports ${stats.gamesPlayed}. Cohorts and extrema cover observed games only.`,
      );
    if (games.length < parsedQuery.data.window)
      warnings.push('Fewer observed games than the requested rolling window.');
    return res.json(
      PlayerInsightsResponseSchema.parse({
        player,
        seasons,
        season,
        stats,
        ...analysis,
        provenance: researchProvenance(
          source,
          'Observed regular-season games, not verified complete season/career coverage.',
          warnings,
        ),
      }),
    );
  });
  router.all('/players/:playerId/insights', methodNotAllowedHandler);

  router.get('/analytics/compare', async (req, res) => {
    const keys = Object.keys(req.query);
    const players =
      typeof req.query.players === 'string' ? req.query.players.split(',') : [];
    const seasons =
      typeof req.query.seasons === 'string' ? req.query.seasons.split(',') : [];
    const parsed = ComparisonSelectionSchema.safeParse(
      players.map((playerId, i) => ({ playerId, season: seasons[i] })),
    );
    if (
      !parsed.success ||
      seasons.length !== players.length ||
      keys.some((k) => k !== 'players' && k !== 'seasons')
    ) {
      return sendApiError(
        res,
        400,
        'INVALID_COMPARISON',
        'Choose 2–4 distinct NBA players with one valid season each.',
      );
    }
    const rows = [];
    // Sequential slots bound upstream concurrency. A source outage remains a per-player
    // unavailable row, never a zero or a fixture substitute.
    for (const slot of parsed.data) {
      try {
        const player = await provider.getPlayerById(slot.playerId);
        const stats = player
          ? await provider.getPlayerSeasonStats(slot.playerId, slot.season)
          : null;
        rows.push({
          ...slot,
          player,
          stats,
          status: !player
            ? 'player-not-found'
            : stats
              ? 'available'
              : 'season-unavailable',
        });
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error;
        rows.push({ ...slot, player: null, stats: null, status: 'source-unavailable' });
      }
    }
    return res.json(
      ComparisonResponseSchema.parse({
        rows,
        provenance: researchProvenance(
          source,
          'Selected player-season summaries. Raw per-game values and sourced shooting ratios; no era adjustment.',
        ),
      }),
    );
  });
  router.all('/analytics/compare', methodNotAllowedHandler);
  return router;
}
