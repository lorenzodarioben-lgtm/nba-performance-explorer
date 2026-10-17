// Team and franchise research over the league archive: franchise identity periods and titles,
// season-by-season records, and one season's record, box totals, shooting, NBA.com ratings,
// team leaders and roster.
import {
  LeagueTeamResponseSchema,
  type LeagueTeamResponse,
} from '@nba-performance-explorer/contracts';
import { value } from './league-archive.js';
import type { Line, LineField } from './league-data.js';
import { LeagueExtras } from './league-extras.js';
import { LeagueRequestError, teamRef, type LeagueService } from './league-service.js';

const TOTAL_ROWS: [LineField, string][] = [
  ['pts', 'Points'],
  ['fgm', 'Field goals made'],
  ['fga', 'Field goals attempted'],
  ['fg3m', '3-pointers made'],
  ['fg3a', '3-pointers attempted'],
  ['ftm', 'Free throws made'],
  ['fta', 'Free throws attempted'],
  ['oreb', 'Offensive rebounds'],
  ['dreb', 'Defensive rebounds'],
  ['reb', 'Rebounds'],
  ['ast', 'Assists'],
  ['stl', 'Steals'],
  ['blk', 'Blocks'],
  ['tov', 'Turnovers'],
  ['pf', 'Personal fouls'],
];
const LEADER_ROWS: [LineField, string][] = [
  ['pts', 'Points'],
  ['reb', 'Rebounds'],
  ['ast', 'Assists'],
  ['stl', 'Steals'],
  ['blk', 'Blocks'],
  ['fg3m', '3-pointers made'],
];

const ratio = (a: number | null, b: number | null) =>
  a === null || b === null || b === 0 ? null : a / b;
export function shooting(t: Line) {
  const v = (f: LineField) => value(t, f);
  const fga = v('fga'),
    fta = v('fta'),
    pts = v('pts');
  return {
    fieldGoal: ratio(v('fgm'), fga),
    threePoint: ratio(v('fg3m'), v('fg3a')),
    freeThrow: ratio(v('ftm'), fta),
    effectiveFieldGoal:
      v('fgm') === null || v('fg3m') === null
        ? null
        : ratio(v('fgm')! + 0.5 * v('fg3m')!, fga),
    trueShooting:
      pts === null || fga === null || fta === null || fga + fta === 0
        ? null
        : pts / (2 * (fga + 0.44 * fta)),
  };
}
const boxRows = (t: Line, gp: number) =>
  TOTAL_ROWS.map(([key, label]) => {
    const total = value(t, key);
    return {
      key,
      label,
      total,
      perGame: total === null || gp === 0 ? null : Math.round((total / gp) * 100) / 100,
    };
  });

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const experienceBucket = (exp: string | null) => {
  if (exp === null) return 'Not listed';
  if (exp === 'R' || exp === '0') return 'Rookie';
  const n = Number(exp);
  if (!Number.isFinite(n)) return 'Not listed';
  return n <= 3
    ? '1–3 seasons'
    : n <= 6
      ? '4–6 seasons'
      : n <= 9
        ? '7–9 seasons'
        : '10+ seasons';
};

export class LeagueTeams {
  constructor(
    private readonly league: LeagueService,
    readonly extras: LeagueExtras = new LeagueExtras(),
  ) {}

  private franchise(teamId: number) {
    const data = this.extras.franchises();
    const f = data?.franchises.find((x) => x.teamId === teamId);
    if (!f || !data) return null;
    const archived = new Set(this.league.archive.seasons);
    // Seasons NBA.com lists before they are played (0 games) are not history yet.
    const seasons = f.seasons
      .filter((s) => s.gp > 0)
      .map((s) => ({
        season: s.season,
        name: `${s.city} ${s.name}`.trim(),
        wins: s.wins,
        losses: s.losses,
        winPercentage: s.wins / Math.max(1, s.wins + s.losses),
        conferenceRank: s.conferenceRank,
        divisionRank: s.divisionRank,
        playoffWins: s.playoffWins,
        playoffLosses: s.playoffLosses,
        finals: s.finals && s.finals !== 'N/A' ? s.finals : null,
        archived: archived.has(s.season),
      }));
    const identities: NonNullable<LeagueTeamResponse['franchise']>['identities'] = [];
    for (const s of f.seasons.filter((x) => x.gp > 0)) {
      const last = identities.at(-1);
      const prevStart = last ? Number(last.lastSeason.slice(0, 4)) : null;
      if (
        last &&
        last.city === s.city &&
        last.name === s.name &&
        prevStart === Number(s.season.slice(0, 4)) - 1
      ) {
        last.lastSeason = s.season;
        last.seasons++;
      } else
        identities.push({
          city: s.city,
          name: s.name,
          firstSeason: s.season,
          lastSeason: s.season,
          seasons: 1,
        });
    }
    const totals = data.franchiseHistory.find((r) => r.teamId === teamId);
    const best = Math.max(...seasons.map((s) => s.winPercentage));
    const worst = Math.min(...seasons.map((s) => s.winPercentage));
    const pct = (x: number) => x.toFixed(3).replace(/^0/, '');
    const record = (list: typeof seasons) =>
      list.map((s) => `${s.wins}–${s.losses}`)[0] ?? '';
    const bestSeasons = seasons.filter((s) => s.winPercentage === best);
    const worstSeasons = seasons.filter((s) => s.winPercentage === worst);
    const playoffSeasons = seasons.filter(
      (s) => (s.playoffWins ?? 0) + (s.playoffLosses ?? 0) > 0,
    );
    return {
      founded: f.yearFounded,
      arena: f.arena,
      identities,
      totals: totals
        ? {
            games: totals.games,
            wins: totals.wins,
            losses: totals.losses,
            playoffAppearances: totals.playoffAppearances,
            divisionTitles: totals.divisionTitles,
            conferenceTitles: totals.conferenceTitles,
            leagueTitles: totals.leagueTitles,
          }
        : null,
      championships: f.championships,
      conferenceTitles: f.conferenceTitles,
      divisionTitles: f.divisionTitles,
      seasons,
      notable: seasons.length
        ? [
            {
              label: 'Best record',
              value: `${record(bestSeasons)} (${pct(best)})`,
              seasons: bestSeasons.slice(0, 10).map((s) => s.season),
            },
            {
              label: 'Worst record',
              value: `${record(worstSeasons)} (${pct(worst)})`,
              seasons: worstSeasons.slice(0, 10).map((s) => s.season),
            },
            {
              label: 'Seasons with playoff games',
              value: `${playoffSeasons.length} of ${seasons.length}`,
              seasons: playoffSeasons.slice(-10).map((s) => s.season),
            },
          ]
        : [],
    };
  }

  team(teamIdText: string, seasonArg: string | undefined): LeagueTeamResponse {
    const teamId = Number(teamIdText.slice(4));
    const archive = this.league.archive;
    const seasons = archive.seasons.filter((s) =>
      archive.summary(s).teams.some((t) => t.teamId === teamId),
    );
    const franchise = this.franchise(teamId);
    if (!seasons.length && !franchise)
      throw new LeagueRequestError(
        404,
        'LEAGUE_TEAM_UNKNOWN',
        'No NBA franchise in the league archive has that ID.',
      );
    if (seasonArg && !seasons.includes(seasonArg))
      throw new LeagueRequestError(
        404,
        'LEAGUE_TEAM_NOT_IN_SEASON',
        `This team did not play in ${seasonArg}, or that season is not archived.`,
      );
    const seasonLabel = seasonArg ?? seasons.at(-1) ?? null;
    const latest = seasons.at(-1) ? archive.summary(seasons.at(-1)!) : null;
    const team = latest
      ? teamRef(latest, teamId)
      : { id: teamIdText, abbreviation: 'UNK', name: `Team ${teamId}` };
    let season: LeagueTeamResponse['season'] = null;
    const warnings: string[] = [];
    let summaryForProvenance = latest;
    if (seasonLabel) {
      const s = archive.summary(seasonLabel);
      summaryForProvenance = s;
      const reg = s.scopes['regular-season'];
      const t = reg.teams.find((x) => x.teamId === teamId)!;
      const games = archive
        .seasonGames(seasonLabel)
        .scopes[
          'regular-season'
        ].games.filter((g) => g[2] === teamId || g[3] === teamId);
      const split = (pick: (g: (typeof games)[number]) => boolean) => {
        const list = games.filter(pick);
        const wins = list.filter((g) =>
          g[2] === teamId ? g[4] > g[5] : g[5] > g[4],
        ).length;
        return { wins, losses: list.length - wins };
      };
      const standing = s.standings?.find((x) => x.teamId === teamId);
      const po = s.scopes.playoffs?.teams.find((x) => x.teamId === teamId);
      const rating =
        s.teamRatings?.['regular-season'].find((x) => x.teamId === teamId) ?? null;
      const stints = reg.players.filter((p) => p.teamId === teamId);
      const leaders = LEADER_ROWS.map(([key, lbl]) => ({
        key,
        label: lbl,
        rows: stints
          .map((p) => ({ p, total: value(p.totals, key) }))
          .filter(
            (x): x is { p: (typeof stints)[number]; total: number } => x.total !== null,
          )
          .sort((a, b) => b.total - a.total || a.p.playerId - b.p.playerId)
          .slice(0, 3)
          .map(({ p, total }) => ({
            playerId: String(p.playerId),
            name: this.league.name(s, p.playerId),
            gamesPlayed: p.gp,
            total,
            perGame: Math.round((total / p.gp) * 10) / 10,
          })),
      }));
      const rosterFile = this.extras.rosters(seasonLabel);
      const rosterTeam = rosterFile?.teams.find((x) => x.teamId === teamId);
      const appearedIds = new Set(stints.map((p) => p.playerId));
      const gpOf = new Map(stints.map((p) => [p.playerId, p.gp]));
      let roster: NonNullable<LeagueTeamResponse['season']>['roster'] = null;
      if (rosterTeam) {
        const count = (labels: string[]) =>
          [
            ...labels.reduce(
              (m, l) => m.set(l, (m.get(l) ?? 0) + 1),
              new Map<string, number>(),
            ),
          ]
            .map(([l, c]) => ({ label: l, count: c }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        const ages = rosterTeam.players
          .map((p) => p.age)
          .filter((a): a is number => a !== null);
        roster = {
          listed: rosterTeam.players.length,
          appeared: appearedIds.size,
          listedWhoAppeared: rosterTeam.players.filter((p) =>
            appearedIds.has(p.playerId),
          ).length,
          positions: count(rosterTeam.players.map((p) => p.position ?? 'Not listed')),
          experience: count(
            rosterTeam.players.map((p) => experienceBucket(p.experience)),
          ),
          age: ages.length
            ? {
                min: Math.min(...ages),
                median: median(ages),
                max: Math.max(...ages),
                known: ages.length,
              }
            : null,
          players: rosterTeam.players.map((p) => ({
            playerId: String(p.playerId),
            name: p.name,
            number: p.number,
            position: p.position,
            age: p.age,
            experience: p.experience,
            gamesPlayed: gpOf.get(p.playerId) ?? 0,
          })),
          coaches: rosterTeam.coaches
            .map((c) => `${c.name}${c.type ? ` (${c.type})` : ''}`.slice(0, 120))
            .slice(0, 20),
        };
      } else warnings.push(`No NBA.com roster list is archived for ${seasonLabel}.`);
      season = {
        season: seasonLabel,
        team: teamRef(s, teamId),
        record: {
          overall: { wins: t.w, losses: t.l },
          home: split((g) => g[2] === teamId && g[6] === 0),
          road: split((g) => g[3] === teamId && g[6] === 0),
          neutral: split((g) => g[6] === 1),
        },
        standing: standing
          ? {
              conference: standing.conference,
              rank: standing.playoffRank,
              division: standing.division,
              divisionRank: standing.divisionRank,
              gamesBehind: standing.conferenceGamesBack,
            }
          : null,
        playoffs: po ? { wins: po.w, losses: po.l, games: po.gp } : null,
        totals: { team: boxRows(t.totals, t.gp), opponent: boxRows(t.opponent, t.gp) },
        shooting: { team: shooting(t.totals), opponent: shooting(t.opponent) },
        ratings: rating
          ? {
              offRating: rating.offRating,
              defRating: rating.defRating,
              netRating: rating.netRating,
              pace: rating.pace,
              possessions: rating.possessions,
            }
          : null,
        ratingsNote: rating
          ? 'NBA.com’s published ratings: points scored and allowed per 100 possessions, net rating, and pace (possessions per 48 minutes), from its possession counts.'
          : `NBA.com publishes no team ratings for ${seasonLabel} (they start in 1996–97), and this app does not estimate possessions.`,
        leaders,
        roster,
      };
      if (reg.incompleteBoxGames.length)
        warnings.push(
          `${reg.incompleteBoxGames.length} ${seasonLabel} box scores league-wide do not add up to the team totals, so player leaders that season may be understated.`,
        );
    }
    const coverage = `${team.name}: ${seasons.length} archived seasons${seasons.length ? ` (${seasons[0]} to ${seasons.at(-1)})` : ''} from NBA.com game logs, standings and ratings; franchise history and titles from NBA.com’s franchise tables${seasonLabel ? `; rosters are NBA.com’s season roster lists` : ''}.`;
    return LeagueTeamResponseSchema.parse({
      team,
      franchise,
      seasons,
      season,
      provenance: {
        source: 'nba-stats',
        mode: 'committed-snapshot',
        servedAt: new Date().toISOString(),
        retrievedAt: summaryForProvenance
          ? (summaryForProvenance.source.requests
              .map((r) => r.retrievedAt)
              .sort()
              .at(-1) ?? null)
          : null,
        sourceUpdatedAt: null,
        coverage: coverage.slice(0, 600),
        warnings: warnings.slice(0, 20),
      },
    });
  }
}
