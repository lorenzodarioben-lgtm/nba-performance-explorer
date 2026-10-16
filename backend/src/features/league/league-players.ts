// One player across the league archive (stints, availability, highs and lows, milestones), plus
// league-wide rank movement by date and distributions with percentiles.
import {
  LeagueDistributionResponseSchema,
  LeagueMovementResponseSchema,
  LeaguePlayerResponseSchema,
  type LeagueDistributionResponse,
  type LeagueLeaderMetric,
  type LeagueMovementResponse,
  type LeaguePlayerResponse,
  type LeagueScope,
} from '@nba-performance-explorer/contracts';
import { value, type PlayerGameLine } from './league-archive.js';
import type { LineField } from './league-data.js';
import {
  capabilities,
  LeagueRequestError,
  snapshotProvenance,
  teamRef,
  type LeagueService,
} from './league-service.js';

type Mark = LeaguePlayerResponse['careerHighs']['regularSeason'][number];
const HIGH_FIELDS: [LineField, string][] = [
  ['pts', 'Points'],
  ['reb', 'Rebounds'],
  ['ast', 'Assists'],
  ['stl', 'Steals'],
  ['blk', 'Blocks'],
  ['fg3m', '3-pointers made'],
  ['fgm', 'Field goals made'],
  ['ftm', 'Free throws made'],
  ['min', 'Minutes'],
];
const SEASON_HIGHS: [LineField, string][] = HIGH_FIELDS.filter(([f]) =>
  ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'min'].includes(f),
);
const SEASON_LOWS: [LineField, string][] = [
  ['pts', 'Points'],
  ['min', 'Minutes'],
];
const MILESTONES: [LineField | 'gp', string, number[]][] = [
  [
    'pts',
    'career points',
    [1000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000],
  ],
  ['reb', 'career rebounds', [1000, 5000, 10000, 15000]],
  ['ast', 'career assists', [1000, 5000, 10000, 15000]],
  ['fg3m', 'career 3-pointers', [500, 1000, 2000, 3000, 4000]],
  ['stl', 'career steals', [1000, 2000]],
  ['blk', 'career blocks', [1000, 2000, 3000]],
  ['gp', 'career games', [500, 1000, 1500]],
];
const label = (start: number) =>
  `${start}-${String((start + 1) % 100).padStart(2, '0')}`;

export class LeaguePlayers {
  private readonly cache = new Map<number, LeaguePlayerResponse>();
  constructor(private readonly league: LeagueService) {}

  private gameRef(season: string, l: PlayerGameLine) {
    const s = this.league.archive.summary(season);
    return {
      id: `nba:${l.gameId}`,
      date: l.date,
      season,
      team: teamRef(s, l.teamId).abbreviation,
      opponent: teamRef(s, l.opponentId).abbreviation,
      home: l.home,
      won: l.won,
    };
  }

  /** Best (or worst) mark per field over a set of lines, with every game at that mark. */
  private marks(
    lines: { season: string; l: PlayerGameLine }[],
    fields: [LineField, string][],
    lowest = false,
  ): Mark[] {
    const out: Mark[] = [];
    for (const [key, lbl] of fields) {
      const withValue = lines
        .map((x) => ({ ...x, v: value(x.l.line, key) }))
        // A "low" is among games actually played: a line with minutes recorded above zero.
        .filter(
          (x): x is typeof x & { v: number } =>
            x.v !== null && (!lowest || (value(x.l.line, 'min') ?? 0) > 0),
        );
      if (!withValue.length) continue;
      const target = lowest
        ? Math.min(...withValue.map((x) => x.v))
        : Math.max(...withValue.map((x) => x.v));
      if (!lowest && target <= 0) continue;
      const at = withValue
        .filter((x) => x.v === target)
        .sort((a, b) => b.l.date.localeCompare(a.l.date));
      out.push({
        key,
        label: lbl,
        value: target,
        games: at.slice(0, 5).map((x) => this.gameRef(x.season, x.l)),
        count: at.length,
      });
    }
    return out;
  }

  player(playerIdText: string): LeaguePlayerResponse {
    const playerId = Number(playerIdText);
    const hit = this.cache.get(playerId);
    if (hit)
      return {
        ...hit,
        provenance: { ...hit.provenance, servedAt: new Date().toISOString() },
      };
    const archive = this.league.archive;
    const seasons = archive.seasons.filter((s) =>
      archive.summary(s).players.some((p) => p.playerId === playerId),
    );
    if (!seasons.length)
      throw new LeagueRequestError(
        404,
        'LEAGUE_PLAYER_NOT_ARCHIVED',
        'This player has no games in the league archive (1983–84 onward).',
      );
    const regular: { season: string; l: PlayerGameLine }[] = [];
    const playoffs: { season: string; l: PlayerGameLine }[] = [];
    const seasonRows: LeaguePlayerResponse['seasons'] = [];
    const incompleteSeasons: LeaguePlayerResponse['coverage']['incompleteSeasons'] = [];
    let name = '';
    for (const season of seasons) {
      const s = archive.summary(season);
      name = s.players.find((p) => p.playerId === playerId)!.name;
      const reg = archive
        .playerLines(season, 'regular-season')
        .filter((l) => l.playerId === playerId);
      const po = archive
        .playerLines(season, 'playoffs')
        .filter((l) => l.playerId === playerId);
      regular.push(...reg.map((l) => ({ season, l })));
      playoffs.push(...po.map((l) => ({ season, l })));
      const games = archive.seasonGames(season).scopes['regular-season'].games;
      const stints = s.scopes['regular-season'].players
        .filter((p) => p.playerId === playerId)
        .sort((a, b) => a.firstGame.localeCompare(b.firstGame));
      // Box scores that do not add up, among this player's teams' games that season.
      const teams = new Set(stints.map((p) => p.teamId));
      const incomplete = new Set([
        ...s.scopes['regular-season'].incompleteBoxGames,
        ...(s.scopes.playoffs?.incompleteBoxGames ?? []),
      ]);
      const affected = games.filter(
        (g) => incomplete.has(g[0]) && (teams.has(g[2]) || teams.has(g[3])),
      ).length;
      if (affected) incompleteSeasons.push({ season, teamGamesAffected: affected });
      seasonRows.push({
        season,
        age: s.players.find((p) => p.playerId === playerId)?.age ?? null,
        stints: stints.map((p) => ({
          team: teamRef(s, p.teamId),
          franchiseId: `nba:${p.teamId}`,
          firstGame: p.firstGame,
          lastGame: p.lastGame,
          gamesPlayed: p.gp,
          teamGamesInSpan: games.filter(
            (g) =>
              (g[2] === p.teamId || g[3] === p.teamId) &&
              g[1] >= p.firstGame &&
              g[1] <= p.lastGame,
          ).length,
          points: value(p.totals, 'pts'),
          rebounds: value(p.totals, 'reb'),
          assists: value(p.totals, 'ast'),
          minutes: value(p.totals, 'min'),
        })),
        playoffGames: po.length,
        highs: this.marks(
          reg.map((l) => ({ season, l })),
          SEASON_HIGHS,
        ),
        lows: this.marks(
          reg.map((l) => ({ season, l })),
          SEASON_LOWS,
          true,
        ),
      });
    }
    // Seasons inside the span with no archived games for this player.
    const start = Number(seasons[0]!.slice(0, 4)),
      end = Number(seasons.at(-1)!.slice(0, 4));
    const gaps: string[] = [];
    for (let y = start; y <= end; y++)
      if (!seasons.includes(label(y)) && archive.has(label(y))) gaps.push(label(y));
    const ordered = [...regular].sort(
      (a, b) =>
        a.l.date.localeCompare(b.l.date) || a.l.gameId.localeCompare(b.l.gameId),
    );
    const firstArchiveSeason = archive.seasons[0]!;
    const mayPredateArchive = seasons[0] === firstArchiveSeason;
    const wholeCareer =
      !mayPredateArchive &&
      incompleteSeasons.length === 0 &&
      seasons.every((s) => capabilities(archive.summary(s)).playerStats);
    // Milestones: the game in which a cumulative regular-season total first reached each mark.
    const milestones: LeaguePlayerResponse['milestones'] = [];
    for (const [key, lbl, thresholds] of MILESTONES) {
      let total = 0;
      let next = 0;
      for (const x of ordered) {
        const v = key === 'gp' ? 1 : value(x.l.line, key);
        if (v === null) continue;
        total += v;
        while (next < thresholds.length && total >= thresholds[next]!) {
          milestones.push({
            key,
            label: `${thresholds[next]!.toLocaleString('en-US')} ${wholeCareer ? lbl : lbl.replace('career ', '') + ' in archived games'}`,
            threshold: thresholds[next]!,
            game: this.gameRef(x.season, x.l),
            archiveCount: !wholeCareer,
          });
          next++;
        }
      }
    }
    const latest = archive.summary(seasons.at(-1)!);
    const response = LeaguePlayerResponseSchema.parse({
      playerId: String(playerId),
      name,
      coverage: {
        firstSeason: seasons[0],
        lastSeason: seasons.at(-1),
        firstGame: ordered[0]?.l.date ?? playoffs[0]!.l.date,
        lastGame: [...regular, ...playoffs]
          .map((x) => x.l.date)
          .sort()
          .at(-1),
        mayPredateArchive,
        incompleteSeasons,
        wholeCareer,
      },
      seasons: seasonRows,
      gaps,
      careerHighs: {
        regularSeason: this.marks(regular, HIGH_FIELDS),
        playoffs: this.marks(playoffs, HIGH_FIELDS),
      },
      milestones: milestones.sort((a, b) => a.game.date.localeCompare(b.game.date)),
      provenance: snapshotProvenance(
        latest,
        `${name}: ${regular.length} regular-season and ${playoffs.length} playoff box lines in ${seasons.length} archived seasons (${seasons[0]} to ${seasons.at(-1)}).${wholeCareer ? ' The archive holds every box line of this career to date.' : ' The archive may not hold every game of this career; see the coverage notes.'}`,
      ),
    });
    this.cache.set(playerId, response);
    if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value!);
    return response;
  }

  private index:
    | { id: number; name: string; key: string; first: string; last: string }[]
    | null = null;
  /** Archive players whose name contains every typed word (accents ignored), most recent first. */
  search(text: string) {
    const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!this.index) {
      const byId = new Map<
        number,
        { id: number; name: string; key: string; first: string; last: string }
      >();
      for (const season of this.league.archive.seasons)
        for (const p of this.league.archive.summary(season).players) {
          const hit = byId.get(p.playerId);
          if (hit) hit.last = season;
          else
            byId.set(p.playerId, {
              id: p.playerId,
              name: p.name,
              key: fold(p.name),
              first: season,
              last: season,
            });
        }
      this.index = [...byId.values()];
    }
    const words = fold(text).split(/\s+/).filter(Boolean);
    return this.index
      .filter((p) => words.every((w) => p.key.includes(w)))
      .sort((a, b) => b.last.localeCompare(a.last) || a.name.localeCompare(b.name))
      .slice(0, 12)
      .map((p) => ({
        playerId: String(p.id),
        name: p.name,
        firstSeason: p.first,
        lastSeason: p.last,
      }));
  }

  movement(q: {
    season?: string | undefined;
    scope: LeagueScope;
    metric: string;
    mode: 'totals' | 'per-game';
    date?: string | undefined;
  }): LeagueMovementResponse {
    const archive = this.league.archive;
    const season =
      q.season ??
      [...archive.seasons]
        .reverse()
        .find((s) => capabilities(archive.summary(s)).playerStats)!;
    if (!archive.has(season))
      throw new LeagueRequestError(
        404,
        'LEAGUE_SEASON_NOT_ARCHIVED',
        `Season ${season} is not in the league archive.`,
      );
    if (!capabilities(archive.summary(season)).playerStats)
      throw new LeagueRequestError(
        422,
        'LEAGUE_PLAYER_STATS_INCOMPLETE',
        `${season} box scores are incomplete, so dated player totals would be understated.`,
      );
    const s = archive.summary(season);
    const field = (
      {
        points: 'pts',
        rebounds: 'reb',
        assists: 'ast',
        steals: 'stl',
        blocks: 'blk',
        threesMade: 'fg3m',
      } as const
    )[q.metric as 'points'];
    const lines = archive
      .playerLines(season, q.scope)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!lines.length)
      throw new LeagueRequestError(
        404,
        'LEAGUE_SCOPE_EMPTY',
        `No ${q.scope} games are archived for ${season}.`,
      );
    const dates = [...new Set(lines.map((l) => l.date))];
    const date = q.date ?? dates.at(-1)!;
    if (!dates.includes(date))
      throw new LeagueRequestError(
        404,
        'LEAGUE_DATE_NO_GAMES',
        `No ${q.scope} games were played on ${date}.`,
      );
    const totals = new Map<number, { gp: number; sum: number; team: number }>();
    const teamGames = new Map<number, number>();
    const ranksByDate: Map<number, number>[] = [];
    let previousTable: Map<number, number> = new Map();
    let snapshot: LeagueMovementResponse['snapshot'] = [];
    let i = 0;
    for (const d of dates) {
      const teamsToday = new Set<string>();
      for (; i < lines.length && lines[i]!.date === d; i++) {
        const l = lines[i]!;
        const v = value(l.line, field);
        const t = totals.get(l.playerId) ?? { gp: 0, sum: 0, team: l.teamId };
        t.gp++;
        t.sum += v ?? 0;
        t.team = l.teamId;
        totals.set(l.playerId, t);
        teamsToday.add(`${l.gameId}|${l.teamId}`);
      }
      for (const key of teamsToday) {
        const team = Number(key.split('|')[1]);
        teamGames.set(team, (teamGames.get(team) ?? 0) + 1);
      }
      const maxTeamGames = Math.max(...teamGames.values());
      const minGames =
        q.mode === 'per-game'
          ? q.scope === 'playoffs'
            ? Math.min(4, maxTeamGames)
            : Math.ceil(0.7 * maxTeamGames)
          : 1;
      const entries = [...totals]
        .filter(([, t]) => t.gp >= minGames)
        .map(([id, t]) => ({
          id,
          value: q.mode === 'per-game' ? t.sum / t.gp : t.sum,
          gp: t.gp,
          team: t.team,
        }))
        .sort((a, b) => b.value - a.value);
      const ranks = new Map<number, number>();
      entries.forEach((e, k) =>
        ranks.set(
          e.id,
          k > 0 && entries[k - 1]!.value === e.value
            ? ranks.get(entries[k - 1]!.id)!
            : k + 1,
        ),
      );
      ranksByDate.push(ranks);
      if (d === date)
        snapshot = entries.slice(0, 25).map((e) => ({
          rank: ranks.get(e.id)!,
          playerId: String(e.id),
          name: this.league.name(s, e.id),
          team: teamRef(s, e.team).abbreviation,
          gamesPlayed: e.gp,
          value: Math.round(e.value * 100) / 100,
          previousRank: previousTable.get(e.id) ?? null,
        }));
      previousTable = ranks;
      if (d === date) break;
    }
    const shownDates = dates.slice(0, ranksByDate.length);
    const finalTop = [...ranksByDate.at(-1)!]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10)
      .map(([id]) => id);
    return LeagueMovementResponseSchema.parse({
      query: { season, scope: q.scope, metric: q.metric, mode: q.mode, date },
      dates,
      snapshot,
      trajectories: finalTop.map((id) => ({
        playerId: String(id),
        name: this.league.name(s, id),
        ranks: ranksByDate.map((r) => r.get(id) ?? null),
      })),
      qualification:
        q.mode === 'per-game'
          ? `Each date ranks players with at least ${q.scope === 'playoffs' ? '4 games (or every game so far)' : '70% of the most games any team had played by then'}, using only games played through that date. This app's rule, not the NBA's.`
          : 'Each date ranks season totals through that date.',
      provenance: snapshotProvenance(
        s,
        `${season} ${q.scope === 'playoffs' ? 'playoffs' : 'regular season'}: leaderboards rebuilt for each of ${shownDates.length} game dates from the box lines played by then.`,
      ),
    });
  }

  distribution(q: {
    season?: string | undefined;
    scope: LeagueScope;
    metric: LeagueLeaderMetric;
    player?: string | undefined;
  }): LeagueDistributionResponse {
    const percent = /Percentage$/.test(q.metric);
    const mode = percent || q.metric === 'gamesPlayed' ? 'totals' : 'per-game';
    const base = this.league.rank({
      season: q.season,
      scope: q.scope,
      metric: q.metric,
      mode,
      page: 1,
    });
    const values = base.rows.map((r) => r.value).sort((a, b) => a - b);
    const quant = (p: number) => {
      if (!values.length) return 0;
      const pos = (values.length - 1) * p;
      const lo = Math.floor(pos),
        hi = Math.ceil(pos);
      return values[lo]! + (values[hi]! - values[lo]!) * (pos - lo);
    };
    const min = values[0] ?? 0,
      max = values.at(-1) ?? 0;
    const binCount = Math.min(14, Math.max(1, values.length));
    const width = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, k) => ({
      from: min + k * width,
      to: min + (k + 1) * width,
      count: 0,
    }));
    for (const v of values)
      bins[Math.min(binCount - 1, Math.floor((v - min) / width))]!.count++;
    const s = base.s;
    let marker: LeagueDistributionResponse['marker'] = null;
    let profile: LeagueDistributionResponse['profile'] = [];
    if (q.player) {
      const row = base.rows.find((r) => r.playerId === q.player);
      const appeared = s.scopes[base.scope]!.players.some(
        (p) => String(p.playerId) === q.player,
      );
      marker = {
        playerId: q.player,
        name: this.league.name(s, Number(q.player)),
        value: row?.value ?? null,
        percentile: row?.percentile ?? null,
        rank: row?.rank ?? null,
        reason: row
          ? null
          : appeared
            ? 'Outside the qualified cohort (games or attempts below the minimum, or inputs missing).'
            : `No ${base.scope} games in ${base.season}.`,
      };
      const CATS: [LeagueLeaderMetric, string][] = [
        ['points', 'Points per game'],
        ['rebounds', 'Rebounds per game'],
        ['assists', 'Assists per game'],
        ['steals', 'Steals per game'],
        ['blocks', 'Blocks per game'],
        ['threesMade', '3PM per game'],
        ['trueShootingPercentage', 'TS%'],
        ['freeThrowPercentage', 'FT%'],
      ];
      profile = CATS.map(([metric, lbl]) => {
        const r = this.league.rank({
          season: base.season,
          scope: base.scope,
          metric,
          mode: /Percentage$/.test(metric) ? 'totals' : 'per-game',
          page: 1,
        });
        const mine = r.rows.find((x) => x.playerId === q.player);
        return {
          metric,
          label: lbl,
          value: mine?.value ?? null,
          percentile: mine?.percentile ?? null,
          n: r.rows.length,
        };
      });
    }
    return LeagueDistributionResponseSchema.parse({
      query: { season: base.season, scope: base.scope, metric: q.metric },
      definition: base.def.definition,
      qualification: `${base.minGames ? `At least ${base.minGames} games` : 'No games minimum'}${base.minAttempts !== null ? ` and ${base.minAttempts} attempts` : ''}; the same cohort as the leaders page. Percentile = 100 × (players below + half of ties) ÷ cohort size.`,
      n: values.length,
      summary: values.length
        ? {
            min,
            q1: quant(0.25),
            median: quant(0.5),
            q3: quant(0.75),
            max,
            mean: values.reduce((t, v) => t + v, 0) / values.length,
          }
        : null,
      bins: bins.map((b) => ({
        from: Math.round(b.from * 10000) / 10000,
        to: Math.round(b.to * 10000) / 10000,
        count: b.count,
      })),
      marker,
      profile,
      provenance: snapshotProvenance(
        s,
        `${base.season} ${base.scope === 'playoffs' ? 'playoffs' : 'regular season'}: the qualified cohort of ${values.length} players, from summed NBA.com box lines.`,
      ),
    });
  }
}
