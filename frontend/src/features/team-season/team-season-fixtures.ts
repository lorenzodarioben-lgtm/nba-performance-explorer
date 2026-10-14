import type {
  RecordedStandingsRaceResponse,
  RecordedTeamSeasonResponse,
  TeamSeasonGame,
} from '@nba-performance-explorer/contracts';
import { awayTeam, homeTeam, leagueFixture } from '../wiki-archive/archive-fixtures';

// Deterministic, hand-checkable fixtures in the exact contract shape. Not NBA results.

const otherTeam = {
  id: 'nba:1610612743',
  sourceId: '1610612743',
  abbreviation: 'DEN',
  name: 'Denver Nuggets',
};

function games(): TeamSeasonGame[] {
  let wins = 0,
    losses = 0;
  return Array.from({ length: 82 }, (_, i) => {
    const quarantined = i === 4;
    // Wins on even game indexes except every tenth; game 3 is a 2-point loss (close).
    const won = i % 2 === 0 && i % 10 !== 0 && i !== 2;
    const margin = quarantined
      ? null
      : won
        ? 6 + (i % 7)
        : i === 2
          ? -2
          : -(4 + (i % 5));
    if (margin !== null) {
      if (margin > 0) wins++;
      else losses++;
    }
    const day = new Date(Date.UTC(2023, 9, 25 + i * 2));
    return {
      gameNumber: i + 1,
      id: `nba:00223${String(i + 1).padStart(5, '0')}`,
      date: day.toISOString().slice(0, 10),
      opponent: i % 3 === 0 ? otherTeam : awayTeam,
      opponentConference: i % 3 === 0 ? 'West' : 'East',
      location: i % 2 ? 'away' : 'home',
      verified: !quarantined,
      teamScore: margin === null ? null : 110 + Math.max(0, margin),
      opponentScore: margin === null ? null : 110 + Math.max(0, -margin),
      result: margin === null ? null : margin > 0 ? 'W' : 'L',
      margin,
      overtime: i === 6 ? 1 : 0,
      restDays: i === 0 ? null : 1,
      observedWins: wins,
      observedLosses: losses,
      rollingMargin: i >= 14 ? 1.5 : null,
      recapUrl: `https://www.nba.com/game/00223${String(i + 1).padStart(5, '0')}`,
    } satisfies TeamSeasonGame;
  });
}

const split = (
  key: RecordedTeamSeasonResponse['splits'][number]['key'],
  group: RecordedTeamSeasonResponse['splits'][number]['group'],
  label: string,
  wins: number,
  losses: number,
) => ({
  key,
  group,
  label,
  definition: `${label} definition.`,
  games: wins + losses,
  wins,
  losses,
  winPercentage: wins + losses ? wins / (wins + losses) : null,
  pointsFor: wins + losses ? 114.2 : null,
  pointsAgainst: wins + losses ? 113.1 : null,
  marginPerGame: wins + losses ? 1.1 : null,
  smallSample: wins + losses < 5,
});

export function teamSeasonFixture(): RecordedTeamSeasonResponse {
  const list = games();
  const last = list.at(-1)!;
  return {
    season: '2023-24',
    scope: 'regular-season',
    officialStandings: false,
    team: homeTeam,
    conference: 'West',
    chronologyKnown: true,
    games: list,
    verifiedGames: 81,
    splits: [
      split(
        'all',
        'overall',
        'All verified games',
        last.observedWins,
        last.observedLosses,
      ),
      split('home', 'venue', 'Home', 20, 20),
      split('away', 'venue', 'Away', 16, 25),
      split('back-to-back', 'rest', 'Second of a back-to-back', 2, 1),
      split('overtime', 'margin', 'Overtime games', 1, 0),
    ],
    longestWinStreak: {
      kind: 'W',
      length: 1,
      fromGame: 2,
      toGame: 2,
      from: list[1]!.date,
      to: list[1]!.date,
    },
    longestLosingStreak: {
      kind: 'L',
      length: 2,
      fromGame: 2,
      toGame: 3,
      from: list[1]!.date,
      to: list[2]!.date,
    },
    streakRuns: [],
    marginBins: [
      { from: -10, to: -5, wins: 0, losses: 12 },
      { from: -5, to: 0, wins: 0, losses: 30 },
      { from: 5, to: 10, wins: 25, losses: 0 },
      { from: 10, to: 15, wins: 14, losses: 0 },
    ],
    opponents: Array.from({ length: 29 }, (_, i) => ({
      opponent:
        i === 0
          ? otherTeam
          : {
              id: `nba:16106127${String(i).padStart(2, '0')}`,
              sourceId: `16106127${String(i).padStart(2, '0')}`,
              abbreviation: `T${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
              name: `Team ${String(i).padStart(2, '0')}`,
            },
      conference: i % 2 ? 'West' : 'East',
      scheduled: 3,
      verified: 3,
      wins: i === 0 ? 3 : 1,
      losses: i === 0 ? 0 : 2,
      pointsFor: 330,
      pointsAgainst: i === 0 ? 300 : 340,
      gameNumbers: [i + 1, i + 30, i + 52].map((n) => Math.min(82, n)),
    })),
    largestWins: [13],
    largestLosses: [9],
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    attribution: leagueFixture.attribution,
    conferenceSource: leagueFixture.attribution,
    provenance: leagueFixture.provenance,
  };
}

export function raceFixture(): RecordedStandingsRaceResponse {
  return {
    season: '2023-24',
    scope: 'regular-season',
    officialStandings: false,
    conference: 'West',
    dates: ['2023-10-24', '2023-10-25', '2023-10-27'],
    teams: [
      {
        team: homeTeam,
        conference: 'West',
        wins: [0, 1, 1],
        losses: [1, 1, 2],
        scheduled: [1, 2, 3],
        quarantinedGameIds: [],
      },
      {
        team: otherTeam,
        conference: 'West',
        wins: [1, 1, 3],
        losses: [0, 1, 1],
        scheduled: [1, 2, 5],
        quarantinedGameIds: ['nba:0022300099'],
      },
    ],
    reconciledGames: 1219,
    quarantinedGameIds: ['nba:0022300099'],
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    attributions: Array.from({ length: 30 }, () => leagueFixture.attribution),
    conferenceSource: leagueFixture.attribution,
    provenance: leagueFixture.provenance,
  };
}
