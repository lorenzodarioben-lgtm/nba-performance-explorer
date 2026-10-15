import { ShotQuerySchema } from '@nba-performance-explorer/contracts';

import { readWorkbenchState } from '../workbench/workbench-config';
import { readSimilarityState } from '../similarity/similarity-config';

/** Which tool a saved path belongs to, and the exact API request that tool makes for it. */
export type EmbedPlan =
  | { kind: 'series'; tool: string; api: string }
  | { kind: 'comparison'; tool: string; api: string }
  | { kind: 'similarity'; tool: string; api: string }
  | { kind: 'workbench'; tool: string; api: string }
  | { kind: 'shots'; tool: string; api: string }
  | { kind: 'team-season'; tool: string; api: string }
  | { kind: 'link'; tool: string; api: null };

export function embedPlan(path: string): EmbedPlan {
  const [pathname = '', search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  const series = /^\/games\/series\/(r[1-4]-[A-Z]{3}-[A-Z]{3})$/.exec(pathname);
  if (series)
    return {
      kind: 'series',
      tool: 'Series film room',
      api: `/api/games/series/${series[1]}`,
    };
  if (pathname === '/compare/recorded') {
    const players = params.get('players') ?? '';
    if (/^\d{1,12}(?:,\d{1,12}){1,3}$/.test(players))
      return {
        kind: 'comparison',
        tool: 'Comparison studio',
        api: `/api/recorded/player-comparison?players=${players}`,
      };
  }
  if (pathname === '/discover/similar') {
    const state = readSimilarityState(params);
    if (state.valid && state.player) {
      const api = new URLSearchParams({
        player: state.player,
        metrics: state.metrics.join(','),
        minGames: String(state.minGames),
        limit: String(state.limit),
      });
      return {
        kind: 'similarity',
        tool: 'Similarity finder',
        api: `/api/recorded/similarity?${api}`,
      };
    }
  }
  if (pathname === '/lab/workbench') {
    const state = readWorkbenchState(params);
    if (state.valid)
      return {
        kind: 'workbench',
        tool: 'Research workbench',
        api: `/api/recorded/workbench?${state.api}`,
      };
  }
  if (pathname === '/lab/shots') {
    const api = new URLSearchParams(params);
    api.delete('view');
    if (ShotQuerySchema.safeParse(Object.fromEntries(api)).success)
      return { kind: 'shots', tool: 'Shot studio', api: `/api/shots?${api}` };
  }
  const team = /^\/teams\/(nba:\d{1,12})\/season$/.exec(pathname);
  if (team)
    return {
      kind: 'team-season',
      tool: 'Team season',
      api: `/api/recorded/team-season?team=${encodeURIComponent(team[1]!)}`,
    };
  return { kind: 'link', tool: 'Linked research', api: null };
}
