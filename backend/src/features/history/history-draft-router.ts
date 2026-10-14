import { Router } from 'express';
import {
  DraftQuerySchema,
  DraftResponseSchema,
} from '@nba-performance-explorer/contracts';
import type { DraftProvider } from './history-draft-provider.js';
import { ArchiveSourceError } from '../wiki-archive/wiki-client.js';
import { attribution } from '../wiki-archive/archive-provider.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { SourceWorkBudget } from '../research/source-work-budget.js';
import { sendApiError, methodNotAllowedHandler } from '../../middleware/errors.js';
export function createDraftRouter(
  provider: DraftProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  router.get(
    '/draft',
    budget.wrap(async (req, res) => {
      const q = DraftQuerySchema.safeParse(req.query);
      if (!q.success)
        return sendApiError(
          res,
          400,
          'INVALID_DRAFT_QUERY',
          'Choose 2023 draft and bounded pick/round/team/search/page controls.',
        );
      if (q.data.team && !(await staticTeamDirectoryProvider.getTeam(q.data.team)))
        return sendApiError(res, 404, 'TEAM_NOT_FOUND', 'Team not found.');
      if (!provider)
        return sendApiError(
          res,
          503,
          'DRAFT_DISABLED',
          'Historical draft source disabled.',
        );
      try {
        const data = await provider.getDraft(),
          search = q.data.search?.toLowerCase(),
          rows = data.selections.filter(
            (p) =>
              (!q.data.round || p.round === q.data.round) &&
              (!q.data.team || p.listedTeam.id === q.data.team) &&
              p.pick >= q.data.fromPick &&
              p.pick <= q.data.toPick &&
              (!search ||
                `${p.name} ${p.schoolClub ?? ''}`.toLowerCase().includes(search)),
          );
        return res.json(
          DraftResponseSchema.parse({
            year: 2023,
            selections: rows.slice(
              (q.data.page - 1) * q.data.pageSize,
              q.data.page * q.data.pageSize,
            ),
            total: rows.length,
            sourceSelections: 58,
            forfeitures: data.forfeitures,
            page: q.data.page,
            pageSize: q.data.pageSize,
            identityStatus: data.identityStatus,
            identityRetrievedAt: data.identityRetrievedAt,
            missingNBAIds: data.selections.filter((p) => !p.nbaPlayerId).length,
            attribution: attribution(data.page),
            provenance: {
              source: provider.source,
              servedAt: new Date().toISOString(),
              retrievedAt: data.page.retrievedAt,
              asOf: null,
              isLive: false,
              scope: 'history',
              coverage:
                'Wikipedia 2023 draft class: 58 numbered selections and two explicit forfeitures. Published team/trade notes retained; current roster and final ownership are not inferred.',
              warnings: [
                'Adapted source table under CC BY-SA 4.0; exact source revision, contributors and licence linked.',
                'Team filter means the first explicitly listed source team; source trade/via annotations remain literal. No reconstructed transaction ownership.',
                'Exact Wikipedia article/Wikidata P3647 NBA-ID join is CC0 and optional. Missing or unavailable mappings retain source links; no name guesses.',
                'Only source-listed fields/markers retained. Country/position/school fields are historical source text, not current eligibility/roster facts.',
              ],
            },
          }),
        );
      } catch (e) {
        if (!(e instanceof ArchiveSourceError)) throw e;
        return sendApiError(
          res,
          e.kind === 'invalid' ? 502 : e.kind === 'timeout' ? 504 : 503,
          'DRAFT_SOURCE_UNAVAILABLE',
          'Historical draft unavailable; no substitute selections.',
        );
      }
    }),
  );
  router.all('/draft', methodNotAllowedHandler);
  return router;
}
