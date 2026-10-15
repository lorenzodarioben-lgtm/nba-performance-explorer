import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  ShotBoxResponseSchema,
  type ObservedShootingCounts,
  ShotDirectorySchema,
  ShotResponseSchema,
  ShotSourceSchema,
  ShotZoneSchema,
  type ShotAttempt,
  type ShotQuery,
  type DirectoryTeam,
  type ShotDirectory,
} from '@nba-performance-explorer/contracts';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { parseShotCsv } from './shot-parser.js';
export const shotSource = ShotSourceSchema.parse({
  title: 'NBA Playoff Shots 2018',
  creator: 'Boon P',
  version: 1,
  url: 'https://www.kaggle.com/datasets/boonpalipatana/nba-playoff-shots-2018',
  licence: 'CC0: Public Domain',
  licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceUpdatedAt: '2018-06-06T22:04:48.633Z',
  retrievedAt: '2026-10-14T07:43:50.166Z',
  sha256: '1e97afe9574d133e3f2e5db20130604605c10a6763b0516a58051aab78274cf6',
  originalSource:
    'stats.nba.com; downloaded from public Kaggle dataset, no new NBA requests',
});
export function summarizeShots(shots: readonly ShotAttempt[], minAttempts: number) {
  const attempts = shots.length,
    makes = shots.filter((r) => r.made).length,
    threeMakes = shots.filter((r) => r.made && r.type === '3PT').length;
  return {
    attempts,
    makes,
    fgPercentage: attempts >= minAttempts ? makes / attempts : null,
    efgPercentage:
      attempts >= minAttempts ? (makes + 0.5 * threeMakes) / attempts : null,
    pointsPerAttempt:
      attempts >= minAttempts ? (2 * makes + threeMakes) / attempts : null,
  };
}
/** Distance bins in whole source feet: [0, 2], [3, 5] … [27, 29], then 30 and beyond. */
export const SHOT_DISTANCE_BIN_FEET = 3;
export function distanceProfile(shots: readonly ShotAttempt[], minAttempts: number) {
  return Array.from({ length: 11 }, (_, i) => {
    const fromFeet = i * SHOT_DISTANCE_BIN_FEET;
    const toFeet = i === 10 ? null : fromFeet + SHOT_DISTANCE_BIN_FEET - 1;
    const rows = shots.filter(
      (r) =>
        r.distanceFeet >= fromFeet && (toFeet === null || r.distanceFeet <= toFeet),
    );
    return {
      fromFeet,
      toFeet,
      ...summarizeShots(rows, minAttempts),
      threePointAttempts: rows.filter((r) => r.type === '3PT').length,
    };
  });
}
export class ShotArchiveProvider {
  readonly directory: ShotDirectory;
  constructor(
    readonly shots: readonly ShotAttempt[],
    teams: readonly DirectoryTeam[],
  ) {
    const players = new Map<string, { id: string; name: string; attempts: number }>(),
      games = new Map<string, ShotDirectory['games'][number]>();
    for (const r of shots) {
      const p = players.get(r.playerId) ?? {
        id: r.playerId,
        name: r.playerName,
        attempts: 0,
      };
      if (p.name !== r.playerName) throw new Error('Conflicting source player name.');
      p.attempts++;
      players.set(p.id, p);
      const g = games.get(r.gameId) ?? {
        id: r.gameId,
        date: r.date,
        home: r.home,
        away: r.away,
        attempts: 0,
      };
      g.attempts++;
      games.set(g.id, g);
    }
    this.directory = ShotDirectorySchema.parse({
      players: [...players.values()].sort((a, b) => a.name.localeCompare(b.name)),
      teams: teams.filter((t) => shots.some((r) => r.team.id === t.id)),
      games: [...games.values()].sort(
        (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      ),
      source: shotSource,
    });
  }
  analyze(q: ShotQuery) {
    const filtered = this.shots
      .filter(
        (r) =>
          (!q.players || q.players.includes(r.playerId)) &&
          (!q.team || r.team.id === q.team) &&
          (!q.opponent ||
            (r.team.id === r.home.id ? r.away.abbreviation : r.home.abbreviation) ===
              q.opponent) &&
          (!q.game || r.gameId === q.game) &&
          (!q.from || r.date >= q.from) &&
          (!q.to || r.date <= q.to) &&
          (!q.period || r.period === q.period) &&
          (!q.type || r.type === q.type) &&
          (!q.zone || r.zone === q.zone) &&
          (!q.result || r.made === (q.result === 'made')) &&
          r.distanceFeet >= q.minDistance &&
          r.distanceFeet <= q.maxDistance,
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.gameId.localeCompare(b.gameId) ||
          b.period - a.period ||
          a.minutesRemaining - b.minutesRemaining ||
          a.secondsRemaining - b.secondsRemaining ||
          b.eventId - a.eventId,
      );
    const groups = (q.players ?? [null]).map((playerId) => {
      const rows = playerId
        ? filtered.filter((r) => r.playerId === playerId)
        : filtered;
      const cells = new Map<
        string,
        {
          x: number;
          y: number;
          attempts: number;
          makes: number;
          threeMakes: number;
          fgPercentage: number | null;
        }
      >();
      for (const r of rows)
        if (r.x !== null && r.y !== null) {
          const x = Math.floor(r.x / 50) * 5,
            y = Math.floor(r.y / 50) * 5,
            key = `${x}:${y}`,
            cell = cells.get(key) ?? {
              x,
              y,
              attempts: 0,
              makes: 0,
              threeMakes: 0,
              fgPercentage: null,
            };
          cell.attempts++;
          if (r.made) cell.makes++;
          if (r.made && r.type === '3PT') cell.threeMakes++;
          cells.set(key, cell);
        }
      return {
        playerId,
        label: playerId
          ? (this.directory.players.find((p) => p.id === playerId)?.name ?? playerId)
          : 'All filtered source events',
        ...summarizeShots(rows, q.minAttempts),
        missingCoordinates: rows.filter((r) => r.x === null || r.y === null).length,
        zones: ShotZoneSchema.options.map((zone) => ({
          zone,
          ...summarizeShots(
            rows.filter((r) => r.zone === zone),
            q.minAttempts,
          ),
        })),
        meanDistanceFeet: rows.length
          ? rows.reduce((sum, r) => sum + r.distanceFeet, 0) / rows.length
          : null,
        distances: distanceProfile(rows, q.minAttempts),
        cells: [...cells.values()].map(({ threeMakes, ...c }) => ({
          ...c,
          fgPercentage: c.attempts >= q.minAttempts ? c.makes / c.attempts : null,
          pointsPerAttempt:
            c.attempts >= q.minAttempts
              ? (2 * c.makes + threeMakes) / c.attempts
              : null,
        })),
      };
    });
    return ShotResponseSchema.parse({
      season: q.season,
      scope: q.scope,
      source: shotSource,
      provenance: {
        source: 'kaggle-cc0',
        servedAt: new Date().toISOString(),
        retrievedAt: shotSource.retrievedAt,
        asOf: shotSource.sourceUpdatedAt,
        isLive: false,
        scope: 'playoffs',
        coverage:
          'Recorded subset of 2018 playoffs: 13,470 field-goal attempts/80 games/203 players/16 teams, 2018-04-14 through 06-03. Incomplete playoffs; no free throws, full box scores or current league claim.',
        warnings: [
          'Original publisher declares CC0; unofficial historical data, not NBA endorsement.',
          'All summaries/density cells use filtered events before pagination; dot/table page is bounded.',
          'Ratios below explicit minimum attempts stay unavailable. Source zones are retained, not reassigned geometrically.',
          'Long heaves and negative near-basket Y coordinates are retained; basket-relative frame has no home/away or period flips.',
        ],
      },
      sourceAttempts: this.shots.length,
      sourceGames: this.directory.games.length,
      sourcePlayers: this.directory.players.length,
      sourceTeams: this.directory.teams.length,
      sourceFrom: this.directory.games[0]!.date,
      sourceTo: this.directory.games.at(-1)!.date,
      filteredAttempts: filtered.length,
      filteredGames: new Set(filtered.map((r) => r.gameId)).size,
      minAttempts: q.minAttempts,
      page: q.page,
      pageSize: q.pageSize,
      shots: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      groups,
      coordinateSystem:
        'basket-origin; x left-to-right, y toward opposite end; 10 source units/foot; no home/away or period flips',
      coordinateEvidence:
        '13,470/13,470 source distances match floor(hypot(LOC_X,LOC_Y)/10); left/right corner X signs agree. Basket-origin orientation corroborated by nbadb primary guide. No fabricated coordinates.',
    });
  }
  shootingBox(gameId: string, minAttempts: number) {
    const game = this.directory.games.find((g) => g.id === gameId)!,
      shots = this.shots.filter((r) => r.gameId === gameId);
    const counts = (rows: readonly ShotAttempt[]): ObservedShootingCounts => {
      const attempts = rows.length,
        makes = rows.filter((r) => r.made).length,
        threeAttempts = rows.filter((r) => r.type === '3PT').length,
        threeMakes = rows.filter((r) => r.type === '3PT' && r.made).length,
        twoAttempts = attempts - threeAttempts,
        twoMakes = makes - threeMakes;
      return {
        attempts,
        makes,
        twoAttempts,
        twoMakes,
        threeAttempts,
        threeMakes,
        fgPercentage: attempts >= minAttempts ? makes / attempts : null,
        threePercentage:
          threeAttempts >= minAttempts ? threeMakes / threeAttempts : null,
        efgPercentage:
          attempts >= minAttempts ? (makes + 0.5 * threeMakes) / attempts : null,
        fieldGoalPoints: 2 * twoMakes + 3 * threeMakes,
        freeThrows: null,
        totalPoints: null,
        minutes: null,
        rebounds: null,
        assists: null,
      };
    };
    const byPlayer = new Map<string, ShotAttempt[]>();
    for (const r of shots)
      byPlayer.set(r.playerId, [...(byPlayer.get(r.playerId) ?? []), r]);
    const players = [...byPlayer.values()]
      .map((rows) => ({
        ...counts(rows),
        playerId: rows[0]!.playerId,
        name: rows[0]!.playerName,
        team: rows[0]!.team,
      }))
      .sort(
        (a, b) =>
          b.fieldGoalPoints - a.fieldGoalPoints || a.playerId.localeCompare(b.playerId),
      );
    return ShotBoxResponseSchema.parse({
      gameId: game.id,
      date: game.date,
      home: game.home,
      away: game.away,
      minAttempts,
      observedAttempts: shots.length,
      players,
      teams: [game.away, game.home].map((team) => ({
        ...counts(shots.filter((r) => r.team.id === team.id)),
        team,
      })),
      source: shotSource,
      provenance: {
        source: 'kaggle-cc0',
        servedAt: new Date().toISOString(),
        retrievedAt: shotSource.retrievedAt,
        asOf: null,
        isLive: false,
        scope: 'playoffs',
        coverage:
          'Shooting-only observed 2018 playoff game table from recorded shot events. Includes players with source attempts only; no full box score/final-score/bench participation claim.',
        warnings: [
          'Field-goal points=2*made2s+3*made3s; excludes unknown free throws and is not total player/team points.',
          'FG/eFG and 3P ratios use actual observed attempts, with explicit minimum. No game-average-to-total multiplication.',
          'FT/minutes/REB/AST and final scores unavailable, not zero. Players without source shot records are not inferred as DNP or zero-attempt participants.',
          'Original CC0 publisher/partial 2018 playoff dataset/version/hash retained; no live/current or independently complete game-event claim.',
        ],
      },
    });
  }
}
export async function createShotArchiveProvider() {
  const bytes = readFileSync(new URL('./shot-events.csv', import.meta.url));
  if (
    bytes.length !== 2_751_496 ||
    createHash('sha256').update(bytes).digest('hex') !== shotSource.sha256
  )
    throw new Error('Recorded shot source integrity mismatch.');
  const teams = await staticTeamDirectoryProvider.listTeams(),
    shots = parseShotCsv(bytes.toString('utf8'), teams);
  if (shots.length !== 13_470)
    throw new Error('Unexpected recorded shot source coverage.');
  return new ShotArchiveProvider(shots, teams);
}
