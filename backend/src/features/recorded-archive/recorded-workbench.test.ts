import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  WorkbenchQuerySchema,
  WorkbenchResponseSchema,
} from '@nba-performance-explorer/contracts';
import {
  buildWorkbench,
  histogram,
  quantile,
  rankAndPercentile,
  relationship,
  summarize,
  type EntityValue,
} from './recorded-workbench.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
const q = (raw: Record<string, string>) => WorkbenchQuerySchema.parse(raw);

describe('workbench statistics', () => {
  it('hand-checks summary, quantiles, bins, ranks and the least-squares line', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
    expect(quantile([], 0.5)).toBeNull();
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s).toMatchObject({ n: 8, mean: 5, sd: 2, min: 2, max: 9, median: 4.5 });
    expect(summarize([])).toMatchObject({ n: 0, mean: null, sd: null });
    const bins = histogram([0, 1, 2, 3, 12], 4);
    // Width 3: [0,3) holds 0,1,2; [3,6) holds 3; the last bin includes its edge, 12.
    expect(bins.map((b) => b.count)).toEqual([3, 1, 0, 1]);
    expect(bins.at(-1)!.to).toBe(12);
    expect(histogram([5, 5, 5])).toEqual([{ from: 5, to: 5, count: 3 }]);
    expect(rankAndPercentile([10, 20, 20, 30], 'desc').map((r) => r.rank)).toEqual([
      4, 2, 2, 1,
    ]);
    expect(rankAndPercentile([10, 20, 20, 30], 'asc').map((r) => r.rank)).toEqual([
      1, 2, 2, 4,
    ]);
    expect(rankAndPercentile([10, 20, 20, 30], 'desc')[1]!.percentile).toBe(50);
    const line = relationship([
      [1, 3],
      [2, 5],
      [3, 7],
    ])!;
    expect(line).toMatchObject({ n: 3, pearson: 1, slope: 2, intercept: 1 });
    expect(
      relationship([
        [1, 1],
        [2, 1],
        [3, 1],
      ])!.pearson,
    ).toBeNull();
    expect(
      relationship([
        [1, 1],
        [2, 2],
      ]),
    ).toBeNull();
  });

  it('applies the sample minimum and the second-metric rule, counting every exclusion', () => {
    const e = (id: string, sample: number, value: number | null): EntityValue => ({
      id,
      label: id,
      teams: ['AAA'],
      href: `/players/${id}`,
      sample,
      value,
    });
    const built = buildWorkbench(
      { order: 'desc', view: 'relationship' },
      10,
      [e('1', 20, 5), e('2', 5, 9), e('3', 30, null), e('4', 40, 7), e('5', 12, 6)],
      [e('1', 20, 1), e('4', 40, 2), e('5', 12, null)],
    );
    expect(built.rows.map((r) => r.id)).toEqual(['4', '1']);
    expect(built.excluded).toEqual([
      { reason: 'Fewer than 10 games behind the value', count: 1 },
      { reason: 'No value for this metric in the source', count: 1 },
      { reason: 'No value for the second metric', count: 1 },
    ]);
    expect(built.rows[0]).toMatchObject({ rank: 1, x: 7, y: 2, percentile: 75 });
  });
});

describe('genuine recorded workbench', () => {
  it('accounts for every recorded player identity in or out of the cohort', () => {
    const r = WorkbenchResponseSchema.parse(
      p.workbench(q({ metric: 'pointsPerGame' })),
    );
    const identities = new Set(
      p.dataset.snapshots.flatMap((s) =>
        s.statistics['regular-season'].flatMap((row) =>
          row.nbaPlayerId ? [row.nbaPlayerId] : [],
        ),
      ),
    );
    const outByReason = Object.fromEntries(r.excluded.map((e) => [e.reason, e.count]));
    // Identity-less rows are rows, not players; everyone with an identity is a row or excluded.
    expect(
      r.rows.length +
        (outByReason['No value for this metric in the source'] ?? 0) +
        (outByReason['Fewer than 20 games behind the value'] ?? 0),
    ).toBe(identities.size);
    expect(r.rows[0]).toMatchObject({ label: 'Joel Embiid', x: 34.7, rank: 1 });
    expect(r.summary.n).toBe(r.rows.length);
    // The cohort matches the percentile profiles' 20-game population for this metric.
    expect(r.rows.length).toBe(363);
  });

  it('reconciles a team-filtered cohort with that team page', () => {
    const r = p.workbench(q({ metric: 'fieldGoalPercentage', team: 'nba:1610612738' }));
    const listed = p.dataset.snapshots.find((s) => s.team.id === 'nba:1610612738')!
      .statistics['regular-season'];
    const excluded = r.excluded.reduce((s, e) => s + e.count, 0);
    expect(r.rows.length + excluded).toBe(listed.length);
    expect(r.rows.every((row) => row.teams.includes('BOS'))).toBe(true);
  });

  it('builds team cohorts from the same team seasons the season pages use', () => {
    const r = p.workbench(q({ entity: 'teams', metric: 'winPercentage' }));
    expect(r.rows).toHaveLength(30);
    const bos = r.rows.find((row) => row.id === 'nba:1610612738')!;
    expect(bos).toMatchObject({ rank: 1, sample: 81 });
    expect(bos.x).toBeCloseTo(63 / 81);
    const season = p.teamSeason({ season: '2023-24', team: 'nba:1610612738' })!;
    const close = p.workbench(q({ entity: 'teams', metric: 'closeWinPercentage' }));
    const closeSplit = season.splits.find((s) => s.key === 'close')!;
    expect(close.rows.find((row) => row.id === bos.id)).toMatchObject({
      sample: closeSplit.games,
      x: closeSplit.winPercentage,
    });
    const east = p.workbench(
      q({
        entity: 'teams',
        metric: 'marginPerGame',
        view: 'relationship',
        y: 'winPercentage',
        conference: 'East',
      }),
    );
    expect(east.rows).toHaveLength(15);
    expect(east.relationship!.pearson!).toBeGreaterThan(0.9);
    // Raising the minimum above every back-to-back sample empties the cohort with a reason.
    const strict = p.workbench(
      q({ entity: 'teams', metric: 'backToBackWinPercentage', minGames: '30' }),
    );
    expect(strict.rows).toHaveLength(0);
    expect(strict.excluded[0]).toMatchObject({ count: 30 });
    expect(strict.summary).toMatchObject({ n: 0, mean: null });
  });

  it('serves validated responses and rejects mismatched or malformed queries', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get(
      '/api/recorded/workbench?entity=players&view=distribution&metric=reboundsPerGame&minGames=40',
    );
    expect(ok.status).toBe(200);
    expect(WorkbenchResponseSchema.parse(ok.body).bins.length).toBeGreaterThan(0);
    for (const bad of [
      'entity=teams&metric=pointsPerGame',
      'entity=players&metric=winPercentage',
      'view=relationship&metric=pointsPerGame',
      'view=relationship&metric=pointsPerGame&y=pointsPerGame',
      'entity=teams&metric=winPercentage&team=nba:1610612738',
      'entity=players&conference=East',
      'minGames=0',
      'minGames=83',
      'season=2022-23',
      'metric=pointsPerGame&metric=assistsPerGame',
      'extra=1',
    ])
      expect(
        (await request(app).get(`/api/recorded/workbench?${bad}`)).status,
        bad,
      ).toBe(400);
    expect(
      (await request(app).get('/api/recorded/workbench?team=nba:1610612999')).status,
    ).toBe(404);
    expect((await request(app).post('/api/recorded/workbench')).status).toBe(405);
  });
});
