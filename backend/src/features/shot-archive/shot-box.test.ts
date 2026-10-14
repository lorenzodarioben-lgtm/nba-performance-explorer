import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import {
  createShotArchiveProvider,
  type ShotArchiveProvider,
} from './shot-provider.js';
let provider: ShotArchiveProvider;
describe('observed shooting-only game tables', () => {
  beforeAll(async () => {
    provider = await createShotArchiveProvider();
  });
  it('reconciles every source game team/player field-goal count and weighted field-goal points', () => {
    for (const g of provider.directory.games) {
      const d = provider.shootingBox(g.id, 1);
      expect(d.observedAttempts).toBe(d.players.reduce((s, p) => s + p.attempts, 0));
      expect(d.observedAttempts).toBe(d.teams.reduce((s, t) => s + t.attempts, 0));
      for (const t of d.teams) {
        const rows = d.players.filter((p) => p.team.id === t.team.id);
        expect(t.makes).toBe(rows.reduce((s, p) => s + p.makes, 0));
        expect(t.fieldGoalPoints).toBe(rows.reduce((s, p) => s + p.fieldGoalPoints, 0));
        expect(t.fieldGoalPoints).toBe(2 * t.twoMakes + 3 * t.threeMakes);
        expect(t.totalPoints).toBeNull();
        expect(t.freeThrows).toBeNull();
      }
      expect(
        d.players.every(
          (p) => p.minutes === null && p.rebounds === null && p.assists === null,
        ),
      ).toBe(true);
    }
  });
  it('suppresses only unqualified ratios while keeping actual raw attempts and made-shot contributions', () => {
    const g = provider.directory.games.at(-1)!,
      d = provider.shootingBox(g.id, 1000);
    expect(
      d.players.every(
        (p) =>
          p.fgPercentage === null &&
          p.threePercentage === null &&
          p.efgPercentage === null &&
          p.attempts > 0,
      ),
    ).toBe(true);
    expect(d.players.some((p) => p.fieldGoalPoints > 0)).toBe(true);
  });
  it('rejects unsupported/duplicate IDs and disabled source without inventing full box scores', async () => {
    const app = createApp(undefined, { shotArchiveProvider: provider });
    for (const q of [
      'game=nba:0021700001',
      'game=nba:0041700402&game=nba:0041700401',
      'game=nba:0041700402&minAttempts=0',
      'game=nba:0041700402&season=2023-24',
    ])
      expect((await request(app).get('/api/shots/box?' + q)).status).toBe(400);
    expect((await request(app).get('/api/shots/box?game=nba:0041799999')).status).toBe(
      404,
    );
    expect(
      (await request(createApp()).get('/api/shots/box?game=nba:0041700402')).status,
    ).toBe(503);
    expect((await request(app).post('/api/shots/box')).status).toBe(405);
    const r = await request(app).get('/api/shots/box?game=nba:0041700402');
    expect(r.status).toBe(200);
    expect(r.body.source.licence).toBe('CC0: Public Domain');
    expect(r.body.teams[0].totalPoints).toBeNull();
  });
});
