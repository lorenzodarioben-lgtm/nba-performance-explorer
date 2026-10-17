import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { HistoryResponseSchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import {
  HistorySourceError,
  WikidataHistoryProvider,
  mapHistoricalSeasons,
} from './history-provider.js';
const uri = (id: string) => ({
  type: 'uri',
  value: `http://www.wikidata.org/entity/${id}`,
});
const literal = (value: string) => ({ type: 'literal', value });
const row = (id: string, label: string, winner?: string) => ({
  season: uri(id),
  seasonLabel: literal(label),
  ...(winner
    ? { winner: uri(winner), winnerLabel: literal('Fixture franchise modern label') }
    : {}),
});
const body = {
  results: {
    bindings: [
      row('Q1', '1999–2000 NBA season', 'Q10'),
      row('Q2', '2001-02 NBA season'),
      row('Q3', '2013 NBA Summer League'),
    ],
  },
};
describe('CC0 historical source integrity', () => {
  it('normalizes century rollover, excludes summer league and retains missing champions/source labels', () => {
    const result = mapHistoricalSeasons(body);
    expect(result.seasons.map((s) => s.season)).toEqual(['2001-02', '1999-00']);
    expect(result.seasons[0]?.winners).toEqual([]);
    expect(result.seasons[1]?.winners[0]).toMatchObject({
      id: 'wd:Q10',
      label: 'Fixture franchise modern label',
      sourceUrl: 'https://www.wikidata.org/wiki/Q10',
    });
    expect(result.coverage).toEqual({
      rawRows: 3,
      excludedRows: 1,
      missingWinners: 1,
      capped: false,
    });
  });
  it('rejects invalid year/identity/duplicate rows and ambiguous canonical seasons', () => {
    for (const rows of [
      [row('Q1', '1999–2001 NBA season')],
      [row('Q1', '2001–04 NBA season')],
      [row('Q1', '2001-02 NBA season'), row('Q2', '2001-02 NBA season')],
      [row('Q1', '2001-02 NBA season'), row('Q1', '2001-02 NBA season')],
      [
        {
          season: { type: 'uri', value: 'https://evil.invalid/Q1' },
          seasonLabel: literal('2001-02 NBA season'),
        },
      ],
    ])
      expect(() => mapHistoricalSeasons({ results: { bindings: rows } })).toThrow(
        HistorySourceError,
      );
    expect(() =>
      mapHistoricalSeasons({
        results: {
          bindings: Array.from({ length: 102 }, () => row('Q1', '2001-02 NBA season')),
        },
      }),
    ).toThrow();
  });
  it('retains multiple explicit winner statements rather than selecting one arbitrarily', () => {
    const result = mapHistoricalSeasons({
      results: {
        bindings: [
          row('Q1', '2001-02 NBA season', 'Q10'),
          row('Q1', '2001-02 NBA season', 'Q11'),
        ],
      },
    });
    expect(result.seasons[0]?.winners).toHaveLength(2);
  });
  it('deduplicates requests, caches facts for a day and uses a fixed query/contact agent', async () => {
    let now = new Date('2026-10-13T19:00:00.000Z');
    const fetcher = vi.fn().mockImplementation(async () => Response.json(body));
    const provider = new WikidataHistoryProvider(fetcher, () => now);
    const results = await Promise.all([provider.getSeasons(), provider.getSeasons()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results[0]?.retrievedAt).toBe(now.toISOString());
    const url = fetcher.mock.calls[0]![0] as URL;
    expect(url.hostname).toBe('query.wikidata.org');
    expect(url.searchParams.get('query')).toContain('LIMIT 101');
    expect(fetcher.mock.calls[0]![1].headers['User-Agent']).toContain(
      'github.com/lorenzodarioben-lgtm',
    );
    now = new Date(now.getTime() + 24 * 60 * 60_000);
    await provider.getSeasons();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('respects retry-after cooldown without retries or simulated data, then recovers', async () => {
    let time = new Date('2026-10-13T19:00:00.000Z');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
      )
      .mockImplementation(async () => Response.json(body));
    const provider = new WikidataHistoryProvider(fetcher, () => time);
    await expect(provider.getSeasons()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(provider.getSeasons()).rejects.toMatchObject({ kind: 'unavailable' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    time = new Date(time.getTime() + 120000);
    expect((await provider.getSeasons()).seasons).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects oversized/non-JSON payloads and sanitizes timeout without caching them', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('x'.repeat(250001)))
      .mockResolvedValueOnce(new Response('<html>blocked</html>'))
      .mockRejectedValueOnce(
        new DOMException('sensitive source detail', 'TimeoutError'),
      )
      .mockImplementation(async () => Response.json(body));
    const provider = new WikidataHistoryProvider(fetcher);
    await expect(provider.getSeasons()).rejects.toMatchObject({ kind: 'invalid' });
    await expect(provider.getSeasons()).rejects.toMatchObject({ kind: 'invalid' });
    await expect(provider.getSeasons()).rejects.toMatchObject({ kind: 'timeout' });
    expect((await provider.getSeasons()).seasons).toHaveLength(2);
  });
  it('serves validated filter/navigation routes with honest disabled/missing states', async () => {
    const getSeasons = vi.fn().mockResolvedValue({
      ...mapHistoricalSeasons(body),
      retrievedAt: '2026-10-13T19:00:00.000Z',
    });
    const app = createApp(undefined, {
      historyProvider: { source: 'fixture', getSeasons },
    });
    const response = await request(app).get('/api/history/seasons/1999-00');
    expect(response.status).toBe(200);
    expect(HistoryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.navigation).toEqual({ previous: null, next: '2001-02' });
    expect(response.body.provenance.source).toBe('fixture');
    const filtered = await request(app).get('/api/history/seasons?champion=wd:Q10');
    expect(filtered.body.seasons).toHaveLength(1);
    expect((await request(app).get('/api/history/seasons/2000-01')).status).toBe(404);
    const calls = getSeasons.mock.calls.length;
    for (const path of [
      '/api/history/seasons?from=2020&to=2000',
      '/api/history/seasons?champion=https://evil.invalid',
      '/api/history/seasons?from=2',
      '/api/history/seasons?extra=x',
      '/api/history/seasons/1999-01',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    expect(getSeasons).toHaveBeenCalledTimes(calls);
    expect((await request(createApp()).get('/api/history/seasons')).body.status).toBe(
      'unsupported',
    );
    getSeasons.mockRejectedValueOnce(new HistorySourceError('unavailable'));
    const error = await request(app).get('/api/history/seasons');
    expect(error.status).toBe(503);
    expect(error.body.error.code).toBe('HISTORY_SOURCE_UNAVAILABLE');
    expect((await request(app).post('/api/history/seasons')).status).toBe(405);
  });
});
