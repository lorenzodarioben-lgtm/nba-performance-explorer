import {
  CapabilityResponseSchema,
  ComparisonResponseSchema,
  ComparisonSelectionSchema,
  InsightQuerySchema,
  PlayerInsightsResponseSchema,
  ResearchPlayerIdSchema,
  SeasonIdSchema,
  SeasonTotalsResponseSchema,
  type DataSource,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { PlayerProvider } from '../players/player-provider.js';
import { providerInvalidResponse } from '../players/provider-error.js';
import { loadComparisonRows } from './comparison-service.js';
import { analyzeGames } from './stats-core.js';
import { researchProvenance } from './provenance.js';
import { efficiencyMetrics } from './efficiency.js';
import type { SeasonTotalsProvider } from './season-totals-provider.js';
import { z } from 'zod';
import { SourceWorkBudget } from './source-work-budget.js';

export function createResearchRouter(
  provider: PlayerProvider,
  source: DataSource,
  totalsProvider?: SeasonTotalsProvider,
  budget = new SourceWorkBudget(),
  extensions: {
    history?: boolean;
    games?: boolean;
    archive?: boolean;
    teamArchive?: boolean;
    shots?: boolean;
  } = {},
) {
  const router = Router();
  router.get(
    '/players/:playerId/totals',
    budget.wrap(async (req, res) => {
      const id = ResearchPlayerIdSchema.safeParse(req.params.playerId);
      const query = z.object({ season: SeasonIdSchema }).strict().safeParse(req.query);
      if (!id.success || !query.success)
        return sendApiError(
          res,
          400,
          'INVALID_TOTALS_QUERY',
          'Choose an NBA player and a recorded season.',
        );
      const player = await provider.getPlayerById(id.data);
      if (player && player.id !== id.data)
        throw providerInvalidResponse('Player identity mismatch in totals lookup.');
      if (!player)
        return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      const base = researchProvenance(
        source,
        'Sourced raw regular-season totals; derived shooting metrics use aggregated attempts.',
      );
      if (!totalsProvider)
        return res.json(
          SeasonTotalsResponseSchema.parse({
            status: 'unsupported',
            totals: null,
            metrics: null,
            provenance: {
              ...base,
              warnings: [
                ...base.warnings,
                'Raw totals provider is not enabled. No totals inferred from per-game averages.',
              ],
            },
          }),
        );
      const data = await totalsProvider.getSeasonTotals(id.data, query.data.season);
      if (
        data.totals &&
        (data.totals.playerId !== id.data || data.totals.season !== query.data.season)
      )
        throw providerInvalidResponse('Totals scope mismatch.');
      return res.json(
        SeasonTotalsResponseSchema.parse({
          status: data.totals ? 'available' : 'season-unavailable',
          totals: data.totals,
          metrics: data.totals ? efficiencyMetrics(data.totals) : null,
          provenance: {
            ...base,
            retrievedAt: data.retrievedAt,
            warnings: [
              ...(source === 'fixture'
                ? ['DEMO FIXTURES: test data, not NBA results.']
                : []),
              'TS% is an estimate with the conventional 0.44 free-throw multiplier. Zero/unknown denominators yield unavailable.',
              ...(data.totals && data.totals.gamesPlayed < 10
                ? ['Small sample: fewer than ten recorded games.']
                : []),
            ],
          },
        }),
      );
    }),
  );
  router.all('/players/:playerId/totals', methodNotAllowedHandler);
  router.get('/data-sources/status', (_req, res) =>
    res.json(
      CapabilityResponseSchema.parse({
        playerSource: source,
        checkedAt: new Date().toISOString(),
        hostVerified: false,
        capabilities: [
          {
            id: 'historical-team-roster-results',
            status: extensions.teamArchive ? 'conditional' : 'blocked',
            reason: extensions.teamArchive
              ? 'Licensed2023-24 team snapshots: source-listed roster, regular finals and separate participant summaries; exact CC0 external-ID joins. Per-team source validation required; no current roster or live schedule.'
              : 'Historical team snapshot provider disabled.',
          },
          {
            id: 'historical-season-facts',
            status: extensions.history ? 'conditional' : 'blocked',
            reason: extensions.history
              ? 'Wikidata CC0 recorded season/champion statements with missingness and modern-label warnings; not an official complete archive.'
              : 'Historical facts provider disabled.',
          },
          {
            id: 'raw-game-research',
            status: extensions.games ? 'conditional' : 'blocked',
            reason: extensions.games
              ? 'Individual regular/playoff logs with raw attempts, observed-cohort qualifiers and query evidence.'
              : 'Raw game provider disabled.',
          },
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
            id: 'selected-cohort-analytics',
            status: 'conditional',
            reason:
              'Selected 2–4 player-seasons, explicit z-score ranking formula and scatter/table; no league population.',
          },
          {
            id: 'raw-shooting-efficiency',
            status: totalsProvider ? 'conditional' : 'blocked',
            reason: totalsProvider
              ? 'Totals-mode inputs from the existing career endpoint; zero/unknown denominators unavailable.'
              : 'Raw totals provider disabled; totals are never inferred.',
          },
          {
            id: 'local-research',
            status: 'available',
            reason: 'Local-only versioned favorites and saved URLs.',
          },
          {
            id: 'games-standings-leaders',
            status: extensions.archive ? 'conditional' : 'blocked',
            reason: extensions.archive
              ? 'Licensed Wikipedia 2023-24 historical standings/category leaders and 2024 recorded playoff games; no live/current-season feed or full player box scores.'
              : 'Historical snapshot provider disabled; broader live feeds still require rights/access verification.',
          },
          {
            id: 'shots-lineups-history',
            status: extensions.shots ? 'conditional' : 'blocked',
            reason: extensions.shots
              ? 'CC0 recorded partial2018 playoff shot events with verified IDs/coordinate reconciliation; real lineups and comprehensive history remain unavailable.'
              : 'Shot provider disabled; real lineups and comprehensive history remain unavailable.',
          },
          {
            id: 'league-analytics',
            status: 'blocked',
            reason:
              'No verified league-wide cohort or possessions. League percentiles and lineup ratings unsupported; selected-player shooting efficiency has a separate capability.',
          },
        ],
      }),
    ),
  );
  router.all('/data-sources/status', methodNotAllowedHandler);

  router.get(
    '/players/:playerId/insights',
    budget.wrap(async (req, res) => {
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
      if (player && player.id !== parsedId.data)
        throw providerInvalidResponse('Player identity mismatch in insights.');
      if (!player)
        return sendApiError(res, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
      const seasons = await provider.listPlayerSeasons(parsedId.data);
      const season = parsedQuery.data.season ?? seasons[0]?.season ?? null;
      const stats = season
        ? await provider.getPlayerSeasonStats(parsedId.data, season)
        : null;
      if (stats && stats.season !== season)
        throw providerInvalidResponse('Season scope mismatch in insights.');
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
      if (analysis.filteredGames < parsedQuery.data.window)
        warnings.push('Fewer matching games than the requested rolling window.');
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
    }),
  );
  router.all('/players/:playerId/insights', methodNotAllowedHandler);

  router.get(
    '/analytics/compare',
    budget.wrap(async (req, res) => {
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
      const rows = await loadComparisonRows(provider, parsed.data);
      return res.json(
        ComparisonResponseSchema.parse({
          rows,
          provenance: researchProvenance(
            source,
            'Selected player-season summaries. Raw per-game values and sourced shooting ratios; no era adjustment.',
          ),
        }),
      );
    }),
  );
  router.all('/analytics/compare', methodNotAllowedHandler);
  return router;
}
