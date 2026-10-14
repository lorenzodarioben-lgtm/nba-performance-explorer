import { readFileSync } from 'node:fs';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ShotQuerySchema,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { parseShotCsv } from './shot-parser.js';
import {
  createShotArchiveProvider,
  summarizeShots,
  ShotArchiveProvider,
} from './shot-provider.js';
let provider: ShotArchiveProvider, teams: readonly DirectoryTeam[];
const csv = readFileSync(new URL('./shot-events.csv', import.meta.url), 'utf8');
const [header, row] = csv.split(/\r?\n/);
describe('genuine recorded CC0 shot archive', () => {
  beforeAll(async () => {
    provider = await createShotArchiveProvider();
    teams = await staticTeamDirectoryProvider.listTeams();
  });
  it('verifies source hash, all distances, coverage, unique events and offensive corner signs', () => {
    expect(provider.shots).toHaveLength(13470);
    expect(provider.directory.players).toHaveLength(203);
    expect(provider.directory.games).toHaveLength(80);
    expect(provider.directory.teams).toHaveLength(16);
    expect(new Set(provider.shots.map((r) => r.id)).size).toBe(13470);
    expect(
      provider.shots.every(
        (r) => Math.floor(Math.hypot(r.x!, r.y!) / 10) === r.distanceFeet,
      ),
    ).toBe(true);
    expect(
      provider.shots.filter((r) => r.zone === 'Left Corner 3').every((r) => r.x! < 0),
    ).toBe(true);
    expect(provider.shots.some((r) => r.y! > 417.5)).toBe(true);
    expect(provider.analyze(ShotQuerySchema.parse({}))).toMatchObject({
      sourceFrom: '2018-04-14',
      sourceTo: '2018-06-03',
      sourceGames: 80,
      filteredAttempts: 13470,
    });
  });
  it('keeps every filtered denominator before pagination and separate two-player scopes', () => {
    const q = ShotQuerySchema.parse({
        players: '2544,201939',
        pageSize: '1',
        minAttempts: '1',
      }),
      data = provider.analyze(q);
    expect(data.shots).toHaveLength(1);
    expect(data.groups).toHaveLength(2);
    expect(data.filteredAttempts).toBe(data.groups.reduce((s, g) => s + g.attempts, 0));
    for (const g of data.groups) {
      expect(g.attempts).toBe(g.zones.reduce((s, z) => s + z.attempts, 0));
      expect(g.attempts).toBe(g.cells.reduce((s, c) => s + c.attempts, 0));
      expect(g.fgPercentage).toBe(g.makes / g.attempts);
    }
    const game = provider.directory.games[0]!;
    const filtered = provider.analyze(
      ShotQuerySchema.parse({
        game: game.id,
        team: game.home.id,
        type: '3PT',
        result: 'made',
        minAttempts: '1000',
      }),
    );
    expect(
      filtered.shots.every(
        (r) =>
          r.gameId === game.id &&
          r.team.id === game.home.id &&
          r.type === '3PT' &&
          r.made,
      ),
    ).toBe(true);
    expect(filtered.groups[0]?.fgPercentage).toBeNull();
  });
  it('rejects duplicate/conflicting/corrupt events, malformed quotes and unsupported identity columns', () => {
    const one = `${header}\n${row}\n`;
    expect(() => parseShotCsv(`${one}${row}\n`, teams)).toThrow('Duplicate');
    expect(() =>
      parseShotCsv(one.replace(',26,-168,206,', ',26,-168,600,'), teams),
    ).toThrow('scale');
    expect(() => parseShotCsv(one.replace('Missed Shot', 'Made Shot'), teams)).toThrow(
      'Invalid',
    );
    expect(() =>
      parseShotCsv(one.replace('LeBron James', '"Unclosed Fixture Name'), teams),
    ).toThrow();
    expect(() => parseShotCsv(one.replace('GRID_TYPE', 'BAD_COLUMN'), teams)).toThrow(
      'columns',
    );
    const fields = row!.split(',');
    fields[2] = '150';
    fields[21] = '20180416';
    expect(() => parseShotCsv(`${one}${fields.join(',')}\n`, teams)).toThrow(
      'Conflicting',
    );
  });
  it('preserves nullable geometry and quoted commas without inventing event locations', () => {
    const fields = row!.split(',');
    fields[4] = '"Fixture, Player"';
    fields[17] = '';
    fields[18] = '';
    const shots = parseShotCsv(`${header}\n${fields.join(',')}\n`, teams);
    expect(shots[0]).toMatchObject({ playerName: 'Fixture, Player', x: null, y: null });
    expect(
      new ShotArchiveProvider(shots, teams).analyze(
        ShotQuerySchema.parse({ minAttempts: '1' }),
      ).groups[0],
    ).toMatchObject({ attempts: 1, missingCoordinates: 1, cells: [] });
    expect(summarizeShots([], 1)).toMatchObject({
      attempts: 0,
      fgPercentage: null,
      efgPercentage: null,
      pointsPerAttempt: null,
    });
  });
  it('uses made/attempted denominators and reconciles actual weighted scoring', () => {
    const rows = provider.shots.filter((r) => r.playerId === '201939');
    const d = summarizeShots(rows, 1),
      points = rows.reduce((s, r) => s + (r.made ? (r.type === '3PT' ? 3 : 2) : 0), 0);
    expect(d.pointsPerAttempt).toBe(points / rows.length);
    expect(d.efgPercentage).toBe(points / (2 * rows.length));
    expect(summarizeShots(rows, 1000).pointsPerAttempt).toBeNull();
  });
  it('exposes strict archive routes without fallback or repeated/unsupported state', async () => {
    const app = createApp(undefined, { shotArchiveProvider: provider });
    for (const query of [
      'season=2023-24',
      'scope=regular-season',
      'players=2544,2544',
      'players=2544&players=201939',
      'minDistance=30&maxDistance=2',
      'from=2018-05-01&to=2018-04-01',
      'pageSize=201',
      'zone=fake',
    ])
      expect((await request(app).get(`/api/shots?${query}`)).status).toBe(400);
    expect((await request(app).get('/api/shots?players=999')).status).toBe(404);
    expect((await request(createApp()).get('/api/shots')).status).toBe(503);
    expect((await request(app).post('/api/shots')).status).toBe(405);
    expect((await request(app).get('/api/shots/directory')).body.players).toHaveLength(
      203,
    );
    const r = await request(app).get('/api/shots?players=201939&type=3PT&pageSize=5');
    expect(r.status).toBe(200);
    expect(r.body.provenance.source).toBe('kaggle-cc0');
    expect(r.body.shots).toHaveLength(5);
  });
});
