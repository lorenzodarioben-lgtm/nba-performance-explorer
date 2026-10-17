import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { LeagueHonoursResponseSchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive } from './league-archive.js';
import { LeagueHonours } from './league-honours.js';
import { LeagueService } from './league-service.js';

const service = new LeagueService(new LeagueArchive());
const honours = new LeagueHonours(service).honours();
const champ = (season: string) => honours.champions.find((c) => c.season === season)!;
const winners = (award: string, season: string) =>
  honours.awards
    .find((a) => a.id === award)!
    .winners.filter((w) => w.season === season)
    .map((w) => `${w.playerId} ${w.name}`);

describe('champions from the archived Finals', () => {
  it('derives each champion and series result from the games themselves', () => {
    expect(LeagueHonoursResponseSchema.safeParse(honours).success).toBe(true);
    expect(champ('1984-85')).toMatchObject({
      champion: { abbreviation: 'LAL' },
      runnerUp: { abbreviation: 'BOS' },
      wins: 4,
      losses: 2,
    });
    expect(champ('1997-98')).toMatchObject({
      champion: { abbreviation: 'CHI' },
      runnerUp: { abbreviation: 'UTA' },
      losses: 2,
      finalsMvp: { playerId: '893' },
    });
    expect(champ('2015-16')).toMatchObject({
      champion: { abbreviation: 'CLE' },
      runnerUp: { abbreviation: 'GSW' },
      losses: 3,
      finalsMvp: { playerId: '2544' },
    });
    // The franchise ID carries through a relocation: the 1978-79 title is outside the
    // archive, so the Thunder appear only for their own 2024-25 title.
    expect(champ('2024-25').champion.abbreviation).toBe('OKC');
    expect(honours.champions.map((c) => c.season)).toEqual(
      [...honours.champions.map((c) => c.season)].sort().reverse(),
    );
  });

  it('checks every champion against NBA.com’s franchise records and Wikipedia', () => {
    for (const c of honours.champions)
      for (const check of Object.values(c.checks)) expect(check.agrees).not.toBe(false);
    expect(champ('2015-16').checks.franchiseTitles.detail).toContain(
      'against the Golden State Warriors',
    );
  });
});

describe('award winners agreed by two sources', () => {
  it('lists each award with its real winners, including ties', () => {
    expect(winners('mvp', '2022-23')).toEqual(['203954 Joel Embiid']);
    expect(winners('clutch', '2022-23')).toEqual(["1628368 De'Aaron Fox"]);
    expect(winners('roy', '1994-95').sort()).toEqual([
      '255 Grant Hill',
      '467 Jason Kidd',
    ]);
    expect(winners('roy', '1999-00').sort()).toEqual([
      '1882 Elton Brand',
      '1883 Steve Francis',
    ]);
    expect(winners('finals-mvp', '2019-20')).toEqual(['2544 LeBron James']);
    // The Clutch award started in 2022-23; nothing earlier is invented.
    expect(
      honours.awards
        .find((a) => a.id === 'clutch')!
        .winners.every((w) => w.season >= '2022-23'),
    ).toBe(true);
  });

  it('serves the honours with no parameters and refuses any', async () => {
    const app = createApp(undefined, { leagueService: service });
    const res = await request(app).get('/api/league/honours').expect(200);
    expect(res.body.champions.length).toBe(honours.champions.length);
    expect(res.body.provenance.mode).toBe('committed-snapshot');
    await request(app).get('/api/league/honours?season=2015-16').expect(400);
    await request(app).post('/api/league/honours').expect(405);
  });

  it('says so when the honours file is not installed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'honours-'));
    writeFileSync(join(dir, 'placeholder.txt'), '');
    const missing = new LeagueHonours(service, undefined, pathToFileURL(`${dir}/`));
    expect(() => missing.honours()).toThrow(/not installed/);
  });
});
