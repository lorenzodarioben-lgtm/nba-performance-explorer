import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedAnalyticsPage';
const distribution = {
  sample: 3,
  min: 1,
  max: 3,
  mean: 2,
  standardDeviation: Math.sqrt(2 / 3),
  q25: 1.5,
  median: 2,
  q75: 2.5,
  bins: [
    { from: 1, to: 2, count: 1 },
    { from: 2, to: 3, count: 2 },
  ],
};
const body = {
  season: '2023-24',
  scope: 'regular-season',
  x: 'pointsPerGame',
  y: 'reboundsPerGame',
  minGames: 20,
  weightX: 1,
  weightY: 1,
  rows: ['2544', '201939', '1641705'].map((playerId, i) => ({
    playerId,
    name: `Fixture${playerId}`,
    gamesPlayed: 40,
    x: i + 1,
    y: 3 - i,
    zX: (i - 1) * Math.sqrt(1.5),
    zY: (1 - i) * Math.sqrt(1.5),
    score: 0,
    rank: 1,
    xPercentile: ((i + 0.5) / 3) * 100,
    yPercentile: ((2 - i + 0.5) / 3) * 100,
  })),
  xDistribution: distribution,
  yDistribution: distribution,
  correlation: -1,
  target: null,
  targetAvailable: false,
  singleMetricQualifiedX: 4,
  singleMetricQualifiedY: 3,
  sourceRows: 5,
  unknownScopeRows: 1,
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  attributions: Array.from({ length: 30 }, (_, i) => ({
    ...leagueFixture.attribution,
    revision: 1234 + i,
    url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
  })),
  provenance: leagueFixture.provenance,
};
describe('recorded common-cohort analytics UI', () => {
  it('keeps scatter/table parity and exposes actual histogram counts and descriptive correlation', async () => {
    server.use(
      http.get('http://localhost/api/recorded/analytics', () =>
        HttpResponse.json(body),
      ),
    );
    const { container } = renderApp('/lab/recorded');
    await screen.findByRole('group', { name: 'Recorded analytics exact values' });
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getByText(/common paired cohort 3/)).toBeInTheDocument();
    expect(
      screen.getByText(/Correlation does not establish causation/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/median\/Q75 1.5000 \/ 2.0000 \/ 2.5000/),
    ).toBeInTheDocument();
  });
  it('persists weights/target and excludes unavailable targets without zero markers', async () => {
    let params = new URLSearchParams();
    server.use(
      http.get('http://localhost/api/recorded/analytics', ({ request }) => {
        params = new URL(request.url).searchParams;
        const target = params.get('target');
        return HttpResponse.json({
          ...body,
          weightX: Number(params.get('weightX') ?? 1),
          target,
          targetAvailable: target === '2544',
        });
      }),
    );
    renderApp('/lab/recorded?target=999');
    await screen.findByText(/No zero value or marker is imputed/);
    fireEvent.change(screen.getByLabelText('Recorded X weight'), {
      target: { value: '-1' },
    });
    await waitFor(() => expect(params.get('weightX')).toBe('-1'));
    fireEvent.change(screen.getByLabelText('Recorded target marker'), {
      target: { value: '2544' },
    });
    await waitFor(() => expect(params.get('target')).toBe('2544'));
    fireEvent.click(await screen.findByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('rejects repeated/equal metrics before fetching and keeps editable controls', async () => {
    const read = vi.fn(() => HttpResponse.json(body));
    server.use(http.get('http://localhost/api/recorded/analytics', read));
    renderApp('/lab/recorded?x=pointsPerGame&y=pointsPerGame');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Recorded Y metric')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Recorded Y metric'), {
      target: { value: 'reboundsPerGame' },
    });
    await screen.findByRole('group', { name: 'Recorded analytics exact values' });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
