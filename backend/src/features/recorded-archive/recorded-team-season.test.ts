import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  RecordedStandingsRaceResponseSchema,
  RecordedTeamSeasonResponseSchema,
  type VerifiedRecordedGame,
} from '@nba-performance-explorer/contracts';
import {
  buildStandingsRace,
  buildTeamSeason,
  marginBins,
  observedWinPercentages,
  streakRuns,
  teamSeasonGames,
} from './recorded-team-season.js';
import { summarizeRecordedTeam } from './recorded-team-rankings.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
/** Every source-agreed game, rebuilt from each team's season (verified slots carry the scores). */
function reconciled() {
  const seen = new Map<string, VerifiedRecordedGame>();
  for (const snapshot of p.dataset.snapshots) {
    const season = p.teamSeason({ season: '2023-24', team: snapshot.team.id })!;
    for (const g of season.games)
      if (g.verified && !seen.has(g.id)) {
        const home = g.location === 'home';
        seen.set(g.id, {
          id: g.id,
          date: g.date,
          home: home ? season.team : g.opponent,
          away: home ? g.opponent : season.team,
          homeScore: home ? g.teamScore! : g.opponentScore!,
          awayScore: home ? g.opponentScore! : g.teamScore!,
          recapUrl: g.recapUrl,
          sources: [season.attribution, season.attribution],
        });
      }
  }
  return [...seen.values()];
}
const original = p.dataset.snapshots.find((s) => s.team.abbreviation === 'LAL')!;
const east = p.dataset.snapshots.find((s) => s.team.abbreviation === 'BOS')!.team;
const west = p.dataset.snapshots.find((s) => s.team.abbreviation === 'DEN')!.team;

// Twelve games. Dates: Jan 1, 2 (back-to-back), 4 (one day rest), 7 (two days) and so on.
const DAYS = [1, 2, 4, 7, 8, 9, 11, 14, 15, 16, 18, 21];
const SCORES: [number, number][] = [
  [100, 90], // W +10
  [101, 100], // W +1 (close)
  [90, 110], // L -20 (decisive)
  [120, 100], // W +20
  [105, 104], // W +1, overtime
  [99, 100], // L -1 (close) — quarantined below
  [110, 100], // W +10
  [100, 102], // L -2
  [100, 98], // W +2
  [111, 100], // W +11
  [112, 100], // W +12
  [80, 120], // L -40
];
function fixture(quarantine: readonly number[] = [5]) {
  const source = {
    ...original,
    results: DAYS.map((day, i) => {
      const [teamScore, opponentScore] = SCORES[i]!;
      return {
        ...original.results[i]!,
        sourceId: `00223${String(i + 1).padStart(5, '0')}`,
        date: `2024-01-${String(day).padStart(2, '0')}`,
        teamScore,
        opponentScore,
        result: teamScore > opponentScore ? ('W' as const) : ('L' as const),
        location: i % 2 ? ('away' as const) : ('home' as const),
        opponent: i < 6 ? east : west,
        overtime: i === 4 ? 1 : 0,
      };
    }),
  };
  const verified: VerifiedRecordedGame[] = source.results
    .filter((_, i) => !quarantine.includes(i))
    .map((g) => ({
      id: `nba:${g.sourceId}`,
      date: g.date,
      home: g.location === 'home' ? source.team : g.opponent,
      away: g.location === 'home' ? g.opponent : source.team,
      homeScore: g.location === 'home' ? g.teamScore : g.opponentScore,
      awayScore: g.location === 'home' ? g.opponentScore : g.teamScore,
      recapUrl: g.recapUrl,
      sources: [source.attribution, source.attribution],
    }));
  return { source, verified };
}

describe('recorded team-season intelligence', () => {
  it('joins the schedule to agreed scores and keeps quarantined slots without inventing results', () => {
    const { source, verified } = fixture();
    const { games, chronologyKnown } = teamSeasonGames(source, verified);
    expect(chronologyKnown).toBe(true);
    expect(games).toHaveLength(12);
    expect(games[5]).toMatchObject({
      gameNumber: 6,
      verified: false,
      teamScore: null,
      opponentScore: null,
      result: null,
      margin: null,
    });
    expect(games.map((g) => g.restDays)).toEqual([
      null,
      0,
      1,
      2,
      0,
      0,
      1,
      2,
      0,
      0,
      1,
      2,
    ]);
    // Observed record never counts the quarantined game.
    expect(games.at(-1)).toMatchObject({ observedWins: 8, observedLosses: 3 });
    expect(games[4]!.observedWins).toBe(4);
    expect(games[5]).toMatchObject({ observedWins: 4, observedLosses: 1 });
  });

  it('computes the ten-game rolling margin only over fully verified windows', () => {
    const withQuarantine = fixture();
    const quarantined = teamSeasonGames(withQuarantine.source, withQuarantine.verified);
    // Every ten-game window up to game 12 contains the quarantined game 6.
    expect(quarantined.games.map((g) => g.rollingMargin)).toEqual(Array(12).fill(null));
    const all = fixture([]);
    const clean = teamSeasonGames(all.source, all.verified);
    const margins = SCORES.map(([a, b]) => a - b);
    expect(clean.games[8]!.rollingMargin).toBeNull();
    expect(clean.games[9]!.rollingMargin).toBeCloseTo(
      margins.slice(0, 10).reduce((s, m) => s + m, 0) / 10,
    );
    expect(clean.games[11]!.rollingMargin).toBeCloseTo(
      margins.slice(2, 12).reduce((s, m) => s + m, 0) / 10,
    );
  });

  it('breaks streaks at an unverified game instead of bridging it', () => {
    const { source, verified } = fixture();
    const { games } = teamSeasonGames(source, verified);
    const runs = streakRuns(games, true);
    expect(runs.map((r) => `${r.kind}${r.length}`)).toEqual([
      'W2',
      'L1',
      'W2', // games 4–5; game 6 is unknown, so the run stops
      'W1', // game 7 starts a new run
      'L1',
      'W3',
      'L1',
    ]);
    const season = buildTeamSeason(source, verified);
    expect(season.longestWinStreak).toMatchObject({
      kind: 'W',
      length: 3,
      fromGame: 9,
      toGame: 11,
    });
    expect(season.longestLosingStreak?.length).toBe(1);
    expect(streakRuns(games, false)).toEqual([]);
  });

  it('hand-checks every split, the margin bins and the extreme games', () => {
    const { source, verified } = fixture();
    const season = buildTeamSeason(source, verified);
    const by = Object.fromEntries(season.splits.map((s) => [s.key, s]));
    expect(by.all).toMatchObject({ games: 11, wins: 8, losses: 3 });
    expect(by.home!.games + by.away!.games).toBe(11);
    expect(by['vs-east']).toMatchObject({ games: 5, wins: 4, losses: 1 });
    expect(by['vs-west']).toMatchObject({ games: 6, wins: 4, losses: 2 });
    // 0 rest: games 2, 5, 6 (quarantined), 9, 10 → four verified, all wins.
    expect(by['back-to-back']).toMatchObject({ games: 4, wins: 4, smallSample: true });
    expect(by['one-day-rest']).toMatchObject({ games: 3, wins: 2, losses: 1 });
    expect(by['two-plus-rest']).toMatchObject({ games: 3, wins: 1, losses: 2 });
    expect(by.close).toMatchObject({ games: 4, wins: 3, losses: 1 });
    expect(by.decisive).toMatchObject({ games: 3, wins: 1, losses: 2 });
    expect(by.overtime).toMatchObject({ games: 1, wins: 1 });
    expect(by['month-01']!.games).toBe(11);
    // Opponents' observed records come from the same agreed games: Boston went 1-4 and Denver
    // 2-4 against this team, so every verified game here is against a losing team.
    expect(by['vs-losing']).toMatchObject({ games: 11, wins: 8, losses: 3 });
    expect(by['vs-winning']).toMatchObject({
      games: 0,
      winPercentage: null,
      smallSample: true,
    });
    expect(by.all!.pointsFor).toBeCloseTo(
      SCORES.filter((_, i) => i !== 5).reduce((s, [a]) => s + a, 0) / 11,
    );
    expect(by.all!.marginPerGame).toBeCloseTo(
      by.all!.pointsFor! - by.all!.pointsAgainst!,
    );
    const bins = marginBins(season.games);
    expect(bins.reduce((s, b) => s + b.wins, 0)).toBe(8);
    expect(bins.reduce((s, b) => s + b.losses, 0)).toBe(3);
    expect(bins[0]).toMatchObject({ from: -40, losses: 1 });
    // +20 is the largest margin: it lands in the top bin [20, 25) rather than falling off the end.
    expect(bins.at(-1)).toMatchObject({ from: 20, to: 25, wins: 1 });
    expect(season.largestWins).toEqual([4]);
    expect(season.largestLosses).toEqual([12]);
    const boston = season.opponents.find((o) => o.opponent.id === east.id)!;
    expect(boston).toMatchObject({ scheduled: 6, verified: 5, wins: 4, losses: 1 });
  });

  it('withholds rest splits, rest days and streaks when two schedule games share a date', () => {
    const { source, verified } = fixture([]);
    const clashing = {
      ...source,
      results: source.results.map((g, i) =>
        i === 1 ? { ...g, date: source.results[0]!.date } : g,
      ),
    };
    const season = buildTeamSeason(clashing, verified);
    expect(season.chronologyKnown).toBe(false);
    expect(
      season.games.every((g) => g.restDays === null && g.rollingMargin === null),
    ).toBe(true);
    expect(season.splits.some((s) => s.group === 'rest')).toBe(false);
    expect(season.streakRuns).toEqual([]);
  });
});

describe('genuine recorded 2023-24 team seasons and standings race', () => {
  it('agrees with the existing team summaries for every team', () => {
    const verifiedSeason = p.teamSeason({ season: '2023-24', team: 'nba:1610612738' })!;
    expect(RecordedTeamSeasonResponseSchema.parse(verifiedSeason).games).toHaveLength(
      82,
    );
    const race = p.standingsRace({ season: '2023-24' });
    expect(race.teams).toHaveLength(30);
    const percentages = observedWinPercentages(reconciled());
    expect(reconciled()).toHaveLength(1219);
    for (const snapshot of p.dataset.snapshots) {
      const season = p.teamSeason({ season: '2023-24', team: snapshot.team.id })!;
      const all = season.splits.find((s) => s.key === 'all')!;
      const ranking = p
        .teamRankings({
          season: '2023-24',
          metric: 'winPercentage',
          order: 'desc',
          minGames: 1,
          completeOnly: 'false',
        })
        .rows.find((r) => r.team.id === snapshot.team.id)!;
      expect([all.wins, all.losses]).toEqual([ranking.wins, ranking.losses]);
      const home = season.splits.find((s) => s.key === 'home')!;
      expect([home.wins, home.losses]).toEqual([
        ranking.home.wins,
        ranking.home.losses,
      ]);
      const months = season.splits.filter((s) => s.group === 'month');
      expect(months.reduce((s, m) => s + m.games, 0)).toBe(all.games);
      const raceRow = race.teams.find((t) => t.team.id === snapshot.team.id)!;
      expect([raceRow.wins.at(-1), raceRow.losses.at(-1)]).toEqual([
        all.wins,
        all.losses,
      ]);
      expect(raceRow.scheduled.at(-1)).toBe(82);
      expect(raceRow.quarantinedGameIds).toEqual(
        season.games.filter((g) => !g.verified).map((g) => g.id),
      );
      expect(season.opponents.reduce((s, o) => s + o.scheduled, 0)).toBe(82);
      // Winning + losing opponents cover every verified game except those against .500 teams.
      const even = season.games.filter(
        (g) => g.verified && percentages.get(g.opponent.id) === 0.5,
      ).length;
      const vsWinning = season.splits.find((s) => s.key === 'vs-winning')!;
      const vsLosing = season.splits.find((s) => s.key === 'vs-losing')!;
      expect(vsWinning.games + vsLosing.games + even).toBe(all.games);
    }
  });

  it('is cumulative and monotone through the season, split by conference', () => {
    const east = p.standingsRace({ season: '2023-24', conference: 'East' });
    expect(RecordedStandingsRaceResponseSchema.parse(east).teams).toHaveLength(15);
    expect(east.teams.every((t) => t.conference === 'East')).toBe(true);
    expect(east.dates).toEqual([...east.dates].sort());
    for (const t of east.teams)
      for (let i = 1; i < east.dates.length; i++) {
        expect(t.wins[i]!).toBeGreaterThanOrEqual(t.wins[i - 1]!);
        expect(t.losses[i]!).toBeGreaterThanOrEqual(t.losses[i - 1]!);
        expect(t.wins[i]! + t.losses[i]!).toBeLessThanOrEqual(t.scheduled[i]!);
      }
    // With no verified games every team stays at 0-0 while its schedule still advances.
    const empty = buildStandingsRace(p.dataset.snapshots, []);
    expect(empty.dates).toEqual([]);
    expect(summarizeRecordedTeam(p.dataset.snapshots[0]!, []).observedGames).toBe(0);
  });

  it('serves validated responses with strict inputs', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get('/api/recorded/team-season?team=nba:1610612747');
    expect(ok.status).toBe(200);
    expect(RecordedTeamSeasonResponseSchema.parse(ok.body).team.abbreviation).toBe(
      'LAL',
    );
    expect((await request(app).get('/api/recorded/team-season')).status).toBe(400);
    expect((await request(app).get('/api/recorded/team-season?team=LAL')).status).toBe(
      400,
    );
    expect(
      (await request(app).get('/api/recorded/team-season?team=nba:1610612747&extra=1'))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app).get(
          '/api/recorded/team-season?team=nba:1610612747&team=nba:1610612738',
        )
      ).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/recorded/team-season?team=nba:1610612999')).status,
    ).toBe(404);
    expect(
      (await request(app).post('/api/recorded/team-season?team=nba:1610612747')).status,
    ).toBe(405);
    const race = await request(app).get('/api/recorded/standings-race?conference=West');
    expect(race.status).toBe(200);
    expect(RecordedStandingsRaceResponseSchema.parse(race.body).teams).toHaveLength(15);
    expect(
      (await request(app).get('/api/recorded/standings-race?conference=North')).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/recorded/standings-race?season=2022-23')).status,
    ).toBe(400);
    expect((await request(app).delete('/api/recorded/standings-race')).status).toBe(
      405,
    );
  });
});
