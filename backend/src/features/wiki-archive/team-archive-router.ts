import { Router } from 'express';
import { z } from 'zod';
import {
  ArchiveSeasonSchema,
  CanonicalTeamIdSchema,
  TeamArchiveResponseSchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { SourceWorkBudget } from '../research/source-work-budget.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { ArchiveSourceError } from './wiki-client.js';
import type { TeamArchiveProvider } from './team-archive-provider.js';
export function createTeamArchiveRouter(
  provider: TeamArchiveProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  router.get(
    '/:teamId/archive',
    budget.wrap(async (req, res) => {
      const id = CanonicalTeamIdSchema.safeParse(req.params.teamId);
      const query = z
        .object({ season: ArchiveSeasonSchema.default('2023-24') })
        .strict()
        .safeParse(req.query);
      if (!id.success || !query.success)
        return sendApiError(
          res,
          400,
          'INVALID_TEAM_ARCHIVE',
          'Choose a current team identity and the supported historical season.',
        );
      const team = await staticTeamDirectoryProvider.getTeam(id.data);
      if (!team) return sendApiError(res, 404, 'TEAM_NOT_FOUND', 'Team not found.');
      if (!provider)
        return sendApiError(
          res,
          503,
          'TEAM_ARCHIVE_DISABLED',
          'Historical team source is disabled.',
        );
      try {
        const data = await provider.getTeam(team);
        if (data.team.id !== team.id) throw new ArchiveSourceError('invalid');
        return res.json(TeamArchiveResponseSchema.parse(data));
      } catch (error) {
        if (!(error instanceof ArchiveSourceError)) throw error;
        return sendApiError(
          res,
          error.kind === 'invalid' ? 502 : error.kind === 'timeout' ? 504 : 503,
          `TEAM_ARCHIVE_${error.kind.toUpperCase()}`,
          'Historical team snapshot unavailable. No substitute roster or results shown.',
        );
      }
    }),
  );
  router.all('/:teamId/archive', methodNotAllowedHandler);
  return router;
}
