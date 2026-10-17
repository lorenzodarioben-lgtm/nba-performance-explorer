import {
  CanonicalTeamIdSchema,
  TeamDetailResponseSchema,
  TeamDirectoryResponseSchema,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';
import { z } from 'zod';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import {
  staticTeamDirectoryProvider,
  type TeamDirectoryProvider,
} from './team-directory-provider.js';

function provenance() {
  return {
    source: 'nba-api-static',
    servedAt: new Date().toISOString(),
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'directory',
    coverage:
      '30 current NBA team identities, reviewed 2026-10-14. Static identity facts, not current-season results.',
    warnings: [
      'Source: nba_api static directory, MIT license (Swar Patel). No historical aliases, conference data, rosters or schedules.',
    ],
  };
}

export function createTeamsRouter(
  provider: TeamDirectoryProvider = staticTeamDirectoryProvider,
) {
  const router = Router();
  router.get('/', async (req, res) => {
    const parsed = z
      .object({ search: z.string().trim().max(80).optional() })
      .strict()
      .safeParse(req.query);
    if (!parsed.success)
      return sendApiError(
        res,
        400,
        'INVALID_TEAM_QUERY',
        'Choose a team search of up to 80 characters.',
      );
    const search = (parsed.data.search ?? '').toLowerCase();
    const teams = (await provider.listTeams())
      .filter((team) =>
        `${team.name} ${team.abbreviation}`.toLowerCase().includes(search),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.json(
      TeamDirectoryResponseSchema.parse({ teams, provenance: provenance() }),
    );
  });
  router.all('/', methodNotAllowedHandler);
  router.get('/:teamId', async (req, res) => {
    const parsed = CanonicalTeamIdSchema.safeParse(req.params.teamId);
    if (!parsed.success)
      return sendApiError(res, 400, 'INVALID_TEAM_ID', 'Use a namespaced NBA team ID.');
    const team = await provider.getTeam(parsed.data);
    if (!team)
      return sendApiError(res, 404, 'TEAM_NOT_FOUND', 'Current team not found.');
    return res.json(
      TeamDetailResponseSchema.parse({
        team,
        provenance: provenance(),
        availability: {
          roster: false,
          schedule: false,
          statistics: false,
          reason:
            'This identity directory has no live season feed or roster. Optional historical tables use a separately attributed archive; no estimates or fixtures are substituted.',
        },
      }),
    );
  });
  router.all('/:teamId', methodNotAllowedHandler);
  return router;
}
