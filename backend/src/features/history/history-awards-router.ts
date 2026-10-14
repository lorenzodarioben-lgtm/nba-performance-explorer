import { Router } from 'express';
import {
  HistoricalAwardsQuerySchema,
  HistoricalAwardsResponseSchema,
} from '@nba-performance-explorer/contracts';
import type { HistoricalAwardsProvider } from './history-awards-provider.js';
import { ArchiveSourceError } from '../wiki-archive/wiki-client.js';
import { attribution } from '../wiki-archive/archive-provider.js';
import { SourceWorkBudget } from '../research/source-work-budget.js';
import { sendApiError, methodNotAllowedHandler } from '../../middleware/errors.js';
export function createAwardsRouter(
  provider: HistoricalAwardsProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  router.get(
    '/awards',
    budget.wrap(async (req, res) => {
      const q = HistoricalAwardsQuerySchema.safeParse(req.query);
      if (!q.success)
        return sendApiError(
          res,
          400,
          'INVALID_AWARDS_SEASON',
          'Choose recorded 2023-24 yearly awards.',
        );
      if (!provider)
        return sendApiError(
          res,
          503,
          'AWARDS_DISABLED',
          'Historical award source disabled.',
        );
      try {
        const data = await provider.getAwards();
        return res.json(
          HistoricalAwardsResponseSchema.parse({
            season: q.data.season,
            awards: data.awards,
            attribution: attribution(data.page),
            provenance: {
              source: provider.source,
              servedAt: new Date().toISOString(),
              retrievedAt: data.page.retrievedAt,
              asOf: null,
              isLive: false,
              scope: 'history',
              coverage:
                'Wikipedia 2023-24 yearly award table only; missing recipients retained. Coaches/executives are recipients, not inferred NBA player identities. No complete cross-season/All-NBA-team archive claim.',
              warnings: [
                'Adapted factual award rows under CC BY-SA4.0; exact source revision/contributors/licence linked.',
                'Finalists are not winners and are excluded from recipients. Empty cells remain unavailable.',
                'Source-listed franchise association preserved only through exact team links; no person-to-NBA-ID guess from name.',
              ],
            },
          }),
        );
      } catch (e) {
        if (!(e instanceof ArchiveSourceError)) throw e;
        return sendApiError(
          res,
          e.kind === 'invalid' ? 502 : e.kind === 'timeout' ? 504 : 503,
          'AWARDS_SOURCE_UNAVAILABLE',
          'Historical awards unavailable; no substitute recipients.',
        );
      }
    }),
  );
  router.all('/awards', methodNotAllowedHandler);
  return router;
}
