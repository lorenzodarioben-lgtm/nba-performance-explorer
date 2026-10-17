import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';

describe('bounded research source work', () => {
  it('rejects excess requests and releases slots after completion', async () => {
    let release!: () => void;
    let started!: () => void;
    let count = 0;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const allStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const provider = Object.create(
      fixturePlayerProvider,
    ) as typeof fixturePlayerProvider;
    provider.getPlayerById = vi.fn(async (id: string) => {
      count++;
      if (count === 3) started();
      await barrier;
      return fixturePlayerProvider.getPlayerById(id);
    });
    const app = createApp(provider);
    const pending = ['2544', '201939', '1641705'].map((id) =>
      request(app)
        .get(`/api/players/${id}/insights`)
        .then((r) => r),
    );
    await allStarted;
    const busy = await request(app).get('/api/players/2544/totals?season=2023-24');
    expect(busy.status).toBe(503);
    expect(busy.body.error.code).toBe('RESEARCH_BUSY');
    expect(provider.getPlayerById).toHaveBeenCalledTimes(3);
    release();
    expect((await Promise.all(pending)).every((r) => r.status === 200)).toBe(true);
    expect((await request(app).get('/api/players/2544/insights')).status).toBe(200);
  });
});
