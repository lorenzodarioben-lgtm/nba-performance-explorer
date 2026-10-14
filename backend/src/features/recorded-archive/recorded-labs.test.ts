import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
const provider = new RecordedArchiveProvider();
const lal = ['2544', '203076', '1630559', '1626156', '1629060'];
describe('recorded team and hypothetical identity labs', () => {
  it('provides real namespaced directory identities without guessed current roster or fixture fallback', () => {
    const d = provider.directory();
    expect(d.teams).toHaveLength(30);
    expect(new Set(d.players.map((p) => p.playerId)).size).toBe(d.players.length);
    expect(d.players.some((p) => p.playerId === '2544')).toBe(true);
    expect(d.attributions).toHaveLength(30);
    expect(d.provenance.isLive).toBe(false);
  });
  it('keeps five independent sourced summaries and never invents joint performance or raw totals', () => {
    const g = provider.hypothetical(lal, 'regular-season');
    expect(g.kind).toBe('hypothetical');
    expect(g.observedLineup).toBe(false);
    expect(g.jointPerformance).toBeNull();
    expect(g.members).toHaveLength(5);
    expect(g.availableMembers).toBe(5);
    expect(g.sumOfIndividualRecordedPoints).toBeNull();
    expect(
      g.members.every((m) => m.gamesPlayed !== null && m.pointsPerGame !== null),
    ).toBe(true);
    const missing = provider.hypothetical(['999', ...lal.slice(1)], 'playoffs');
    expect(missing.members[0]).toMatchObject({
      name: null,
      status: 'identity-unavailable',
      gamesPlayed: null,
      pointsPerGame: null,
    });
    expect(missing.jointPerformance).toBeNull();
  });
  it('compares matching source-agreed cohorts and exact reconciled head-to-head IDs', () => {
    const t = provider.compareTeams(['nba:1610612747', 'nba:1610612738']);
    expect(t.rows).toHaveLength(2);
    expect(t.headToHead).toHaveLength(2);
    expect(t.quarantinedGameIds).toHaveLength(11);
    for (const r of t.rows) {
      expect(r.wins + r.losses).toBe(r.observedGames);
      expect(r.winPercentage).toBe(r.wins / r.observedGames);
      expect(r.finalMarginPerGame).toBeCloseTo(
        r.pointsPerGame! - r.opponentPointsPerGame!,
        10,
      );
    }
    expect(t.headToHead.every((g) => !t.quarantinedGameIds.includes(g.id))).toBe(true);
    expect(t.headToHead.map((g) => g.id)).toContain('nba:0022300684');
  });
  it('validates cardinality, duplicates, scopes and identities before producing lab data', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: provider });
    for (const path of [
      '/api/recorded/hypothetical?players=2544,203076',
      '/api/recorded/hypothetical?players=2544,2544,203076,1630559,1626156',
      '/api/recorded/team-comparison?teams=nba:1610612747,nba:1610612747',
      '/api/recorded/directory?current=1',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    const group = await request(app).get(
      `/api/recorded/hypothetical?players=${lal.join(',')}`,
    );
    expect(group.status).toBe(200);
    expect(group.body.jointPerformance).toBeNull();
    expect(
      (
        await request(app).get(
          '/api/recorded/team-comparison?teams=nba:999,nba:1610612747',
        )
      ).status,
    ).toBe(404);
    expect((await request(app).post('/api/recorded/hypothetical')).status).toBe(405);
  });
});
