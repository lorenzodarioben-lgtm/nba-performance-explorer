import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { LeagueTeamResponseSchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive, value } from './league-archive.js';
import { LeagueService, sumLines } from './league-service.js';
import { LeagueTeams } from './league-teams.js';

const service = new LeagueService(new LeagueArchive());
const teams = new LeagueTeams(service);
const app = createApp(undefined, { leagueService: service });

describe('franchise identity across relocations and renames', () => {
  it('keeps Charlotte’s 1988-2002 Hornets with the Charlotte franchise and starts New Orleans in 2002', () => {
    const cha = LeagueTeamResponseSchema.parse(teams.team('nba:1610612766', '1997-98'));
    expect(
      cha.franchise!.identities.map(
        (i) => `${i.name} ${i.firstSeason}-${i.lastSeason}`,
      ),
    ).toEqual([
      'Hornets 1988-89-2001-02',
      'Bobcats 2004-05-2013-14',
      'Hornets 2014-15-2025-26',
    ]);
    // The season's own code and name, not today's.
    expect(cha.season!.team).toMatchObject({
      abbreviation: 'CHH',
      name: 'Charlotte Hornets',
    });
    const nop = teams.team('nba:1610612740', undefined);
    expect(nop.franchise!.identities[0]).toMatchObject({
      city: 'New Orleans',
      name: 'Hornets',
      firstSeason: '2002-03',
    });
    expect(nop.seasons[0]).toBe('2002-03');
    expect(nop.franchise!.identities.map((i) => i.city)).toContain(
      'New Orleans/Oklahoma City',
    );
  });

  it('carries Seattle into Oklahoma City and New Jersey into Brooklyn under one ID each', () => {
    const okc = teams.team('nba:1610612760', '1995-96');
    expect(okc.season!.team.name).toBe('Seattle SuperSonics');
    expect(okc.franchise!.identities.map((i) => i.city)).toEqual([
      'Seattle',
      'Oklahoma City',
    ]);
    const bkn = teams.team('nba:1610612751', '2005-06');
    expect(bkn.season!.team.name).toBe('New Jersey Nets');
    expect(bkn.team.name).toBe('Brooklyn Nets');
  });
});

describe('team season', () => {
  it('reconciles record, splits, box totals and leaders with the archived games', () => {
    const r = LeagueTeamResponseSchema.parse(teams.team('nba:1610612738', '2023-24'));
    const s = r.season!;
    expect(s.record.overall).toEqual({ wins: 64, losses: 18 });
    expect(
      s.record.home.wins +
        s.record.home.losses +
        s.record.road.wins +
        s.record.road.losses,
    ).toBe(82);
    expect(s.standing).toMatchObject({ conference: 'East', rank: 1 });
    expect(s.playoffs).toMatchObject({ wins: 16, losses: 3 });
    // Team totals equal the sum of every player's line for the team.
    const reg = service.archive.summary('2023-24').scopes['regular-season'];
    const stints = reg.players.filter((p) => p.teamId === 1610612738);
    const pts = s.totals.team.find((t) => t.key === 'pts')!;
    expect(pts.total).toBe(value(sumLines(stints.map((p) => p.totals)), 'pts'));
    expect(s.shooting.team.fieldGoal).toBeCloseTo(
      s.totals.team.find((t) => t.key === 'fgm')!.total! /
        s.totals.team.find((t) => t.key === 'fga')!.total!,
      10,
    );
    expect(s.leaders.find((l) => l.key === 'pts')!.rows[0]!.name).toBe('Jayson Tatum');
    expect(s.ratings).not.toBeNull();
  });

  it('counts neutral-site games apart from home and road', () => {
    const r = teams.team('nba:1610612754', '2024-25'); // Indiana played two games in Paris.
    expect(r.season!.record.neutral.wins + r.season!.record.neutral.losses).toBe(2);
    const { home, road, neutral, overall } = r.season!.record;
    expect(home.wins + road.wins + neutral.wins).toBe(overall.wins);
  });

  it('withholds ratings where NBA.com publishes none rather than estimating them', () => {
    const r = teams.team('nba:1610612738', '1990-91');
    expect(r.season!.ratings).toBeNull();
    expect(r.season!.ratingsNote).toMatch(/does not estimate possessions/);
  });

  it('validates the team route', async () => {
    expect(
      (await request(app).get('/api/league/teams/nba:1610612738?season=2023-24'))
        .status,
    ).toBe(200);
    expect((await request(app).get('/api/league/teams/BOS')).status).toBe(400);
    expect(
      (await request(app).get('/api/league/teams/nba:1610612738?season=1950-51'))
        .status,
    ).toBe(404);
    expect(
      (await request(app).get('/api/league/teams/nba:1610612740?season=1997-98'))
        .status,
    ).toBe(404);
    expect((await request(app).get('/api/league/teams/nba:999')).status).toBe(404);
  });
});
