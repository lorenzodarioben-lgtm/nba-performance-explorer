import { Router } from 'express';
import {
  HistoryQuerySchema,
  HistoryResponseSchema,
  SeasonIdSchema,
} from '@nba-performance-explorer/contracts';
import { sendApiError, methodNotAllowedHandler } from '../../middleware/errors.js';
import { SourceWorkBudget } from '../research/source-work-budget.js';
import { HistorySourceError, type HistoryProvider } from './history-provider.js';

export function createHistoryRouter(
  provider: HistoryProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  const handler = budget.wrap(async (req, res) => {
    const query = HistoryQuerySchema.safeParse(req.query);
    const requested = req.params.season;
    if (
      !query.success ||
      (requested !== undefined && !SeasonIdSchema.safeParse(requested).success)
    )
      return sendApiError(
        res,
        400,
        'INVALID_HISTORY_QUERY',
        'Choose a valid historical season, year bounds and source entity.',
      );
    try {
      const loaded = provider ? await provider.getSeasons() : null;
      const all = loaded?.seasons ?? [];
      const candidates = all.filter(
        (s) =>
          (query.data.from === undefined ||
            Number(s.season.slice(0, 4)) >= query.data.from) &&
          (query.data.to === undefined ||
            Number(s.season.slice(0, 4)) <= query.data.to) &&
          (!query.data.champion || s.winners.some((w) => w.id === query.data.champion)),
      );
      const seasons = candidates.filter((s) => !requested || s.season === requested);
      const index = requested
        ? candidates.findIndex((s) => s.season === requested)
        : -1;
      if (loaded && requested && !seasons.length)
        return sendApiError(
          res,
          404,
          'HISTORY_SEASON_UNAVAILABLE',
          'No historical facts for this season/filter selection.',
        );
      res.json(
        HistoryResponseSchema.parse({
          status: !loaded
            ? 'unsupported'
            : all.length
              ? 'available'
              : 'records-unavailable',
          seasons,
          sourceSeasons: all.length,
          navigation: {
            previous: index >= 0 ? (candidates[index + 1]?.season ?? null) : null,
            next: index > 0 ? (candidates[index - 1]?.season ?? null) : null,
          },
          coverage: loaded?.coverage ?? {
            rawRows: 0,
            excludedRows: 0,
            missingWinners: 0,
            capped: false,
          },
          provenance: {
            source: provider?.source ?? 'wikidata',
            servedAt: new Date().toISOString(),
            retrievedAt: loaded?.retrievedAt ?? null,
            asOf: null,
            isLive: false,
            scope: 'history',
            coverage:
              'Wikidata CC0 structured season/champion statements; source completeness and accuracy are not guaranteed.',
            warnings: [
              ...(provider?.source === 'fixture'
                ? ['DEMO FIXTURES: test facts, not NBA results.']
                : []),
              'Community-maintained facts, not an official NBA archive. Missing champion statements remain unavailable.',
              'Winner labels may be modern franchise names; no historical name or franchise-to-NBA-ID mapping is inferred.',
              'Summer League and noncanonical season labels excluded. Totals count source records only, not verified franchise championship totals.',
              'Fetched time is known; published as-of time is unknown. Source links allow checking or reporting an issue.',
              ...(loaded?.coverage.capped
                ? [
                    'Source query reached the row cap; additional records may be omitted.',
                  ]
                : []),
              ...(!loaded ? ['Historical facts provider is disabled.'] : []),
            ],
          },
        }),
      );
    } catch (error) {
      if (!(error instanceof HistorySourceError)) throw error;
      const status =
        error.kind === 'invalid' ? 502 : error.kind === 'timeout' ? 504 : 503;
      return sendApiError(
        res,
        status,
        `HISTORY_SOURCE_${error.kind.toUpperCase()}`,
        'The historical facts source is unavailable. No substitute facts are shown.',
      );
    }
  });
  router.get('/seasons', handler);
  router.get('/seasons/:season', handler);
  router.all('/seasons', methodNotAllowedHandler);
  router.all('/seasons/:season', methodNotAllowedHandler);
  return router;
}
