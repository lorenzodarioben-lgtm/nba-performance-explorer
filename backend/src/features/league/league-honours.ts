// Champions and individual awards for the archived seasons. Each champion is the team that won
// four archived Finals games; it is then checked against NBA.com's franchise honours (title
// years and opponents), NBA.com's team-by-year Finals result and Wikipedia's Finals MVP team.
// Awards come from league/data/honours.json, where every winner is agreed by NBA.com and
// Wikipedia (see build-league-honours.ts).
import { existsSync, readFileSync } from 'node:fs';
import {
  LeagueHonoursResponseSchema,
  type LeagueHonoursResponse,
} from '@nba-performance-explorer/contracts';
import { LeagueExtras } from './league-extras.js';
import {
  HONOUR_AWARDS,
  HonoursFileSchema,
  type HonoursFile,
} from './league-honours-data.js';
import { LeagueRequestError, teamRef, type LeagueService } from './league-service.js';

// Champions are derived by reading every season's games, so the result is shared by every
// LeagueHonours over the same archive (the server warms it once at start-up).
const shared = new WeakMap<object, LeagueHonoursResponse>();

export class LeagueHonours {
  private readonly file: HonoursFile | null;

  constructor(
    private readonly league: LeagueService,
    private readonly extras: LeagueExtras = new LeagueExtras(),
    dir: URL = new URL('./data/', import.meta.url),
  ) {
    const path = new URL('honours.json', dir);
    this.file = existsSync(path)
      ? HonoursFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
      : null;
  }

  honours(): LeagueHonoursResponse {
    const archive = this.league.archive;
    const franchises = this.extras.franchises();
    if (!this.file || !franchises)
      throw new LeagueRequestError(
        404,
        'LEAGUE_HONOURS_UNAVAILABLE',
        'The honours archive is not installed on this server.',
      );
    const hit = shared.get(archive);
    if (hit)
      return {
        ...hit,
        provenance: { ...hit.provenance, servedAt: new Date().toISOString() },
      };
    const file = this.file;
    const champions: LeagueHonoursResponse['champions'] = [];
    const unsettled: string[] = [];
    for (const season of archive.seasons) {
      const po = archive.seasonGames(season).scopes.playoffs;
      // Older game IDs do not encode the round. The Finals are the playoffs' last pairing:
      // the two teams in the last game, from different conferences, meet in no other round.
      const games = [...(po?.games ?? [])].sort(
        (a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]),
      );
      const last = games.at(-1);
      const pair = last ? [last[2], last[3]] : [];
      const finals = games.filter((g) => pair.includes(g[2]) && pair.includes(g[3]));
      if (!finals.length) {
        unsettled.push(`${season}: no Finals games are archived.`);
        continue;
      }
      const wins = new Map<number, number>();
      for (const g of finals) {
        const [, , home, away, hp, ap] = g;
        wins.set(home, (wins.get(home) ?? 0) + (hp > ap ? 1 : 0));
        wins.set(away, (wins.get(away) ?? 0) + (ap > hp ? 1 : 0));
      }
      const teams = [...wins.keys()];
      const winner = teams.find((t) => wins.get(t) === 4);
      if (teams.length !== 2 || winner === undefined) {
        unsettled.push(
          `${season}: the archived Finals games (${finals.length}) do not show a team with four wins.`,
        );
        continue;
      }
      const loser = teams.find((t) => t !== winner)!;
      const s = archive.summary(season);
      const champion = teamRef(s, winner),
        runnerUp = teamRef(s, loser);
      const endYear = String(Number(season.slice(0, 4)) + 1);
      const fr = (id: number) => franchises.franchises.find((f) => f.teamId === id);
      const title = fr(winner)?.championships.find((c) => c.year === endYear);
      const year = fr(winner)?.seasons.find((y) => y.season === season);
      const mvp = file.winners.find(
        (w) => w.season === season && w.award === 'finals-mvp',
      );
      const mvpTeam = file.finalsMvpTeams.find((m) => m.season === season);
      const sorted = finals.map((g) => g[0]).sort();
      champions.push({
        season,
        champion,
        runnerUp,
        wins: 4,
        losses: wins.get(loser)!,
        firstGame: `nba:${sorted[0]}`,
        lastGame: `nba:${sorted.at(-1)}`,
        finalsMvp: mvp ? { playerId: mvp.playerId, name: mvp.name } : null,
        checks: {
          franchiseTitles: title
            ? {
                agrees:
                  title.opponent === null ? true : title.opponent === runnerUp.name,
                detail: `NBA.com lists a ${endYear} title${title.opponent ? ` against the ${title.opponent}` : ''}.`,
              }
            : {
                agrees: false,
                detail: `NBA.com’s franchise honours list no ${endYear} title for the ${champion.name}.`,
              },
          franchiseSeason: year
            ? {
                agrees: year.finals === 'LEAGUE CHAMPION',
                detail: `NBA.com’s team-by-year table: ${year.finals ?? 'no Finals result'}.`,
              }
            : {
                agrees: null,
                detail: 'NBA.com’s team-by-year table has no row for this season.',
              },
          finalsMvpTeam: mvpTeam
            ? {
                agrees: mvpTeam.team === champion.name,
                detail: `Wikipedia gives the Finals MVP’s team as the ${mvpTeam.team}.`,
              }
            : {
                agrees: null,
                detail: 'Wikipedia lists no Finals MVP team for this season.',
              },
        },
      });
    }
    const response = LeagueHonoursResponseSchema.parse({
      champions: champions.reverse(),
      unsettled,
      awards: HONOUR_AWARDS.map((a) => ({
        id: a.id,
        label: a.label,
        since: a.from,
        winners: file.winners
          .filter((w) => w.award === a.id)
          .sort((x, y) => y.season.localeCompare(x.season))
          .map(({ season, playerId, name, team }) => ({
            season,
            playerId,
            name,
            team,
          })),
      })),
      notes: file.notes,
      sources: [
        ...file.sources.map((s) => ({
          label: `Wikipedia: ${s.title} (revision ${s.revision})`,
          url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(s.title.replaceAll(' ', '_'))}&oldid=${s.revision}`,
          retrievedAt: s.retrievedAt,
        })),
        {
          label: 'NBA.com Stats playerawards (one request per confirmed winner)',
          url: 'https://stats.nba.com/stats/playerawards',
          retrievedAt: file.builtAt,
        },
      ],
      provenance: {
        source: 'nba-stats',
        mode: 'committed-snapshot',
        servedAt: new Date().toISOString(),
        retrievedAt: file.builtAt,
        sourceUpdatedAt: null,
        coverage: `${champions.length} champions from the archived Finals games, ${archive.seasons[0]} to ${archive.seasons.at(-1)}; ${file.winners.length} award winners agreed by NBA.com and Wikipedia.`,
        warnings: [
          'Award winners appear only when NBA.com and Wikipedia agree on player and season; anything else is listed under the notes, not guessed.',
        ],
      },
    });
    shared.set(archive, response);
    return response;
  }
}
