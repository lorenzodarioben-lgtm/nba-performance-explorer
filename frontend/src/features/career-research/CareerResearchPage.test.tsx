import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const metrics = {
  trueShooting: 0.6,
  effectiveFieldGoal: 0.55,
  assistTurnover: 2,
  pointsPer36: 24,
  fieldGoalPercentage: 0.5,
  threePointPercentage: 0.4,
  freeThrowPercentage: 0.8,
};
const totals = {
  playerId: '2544',
  season: '2023-24',
  gamesPlayed: 40,
  minutes: 1200,
  points: 800,
  rebounds: 200,
  assists: 160,
  turnovers: 80,
  fieldGoalsMade: 300,
  fieldGoalsAttempted: 600,
  threesMade: 100,
  threesAttempted: 240,
  freeThrowsMade: 100,
  freeThrowsAttempted: 120,
};
const body = {
  milestones: [],
  player: { id: '2544', fullName: 'Fixture career player' },
  status: 'available',
  seasons: [
    { totals, metrics, pointsPerGame: 20, reboundsPerGame: 5, assistsPerGame: 4 },
  ],
  aggregate: {
    ...Object.fromEntries(
      Object.entries(totals).filter(([k]) => k !== 'playerId' && k !== 'season'),
    ),
    seasonsReported: 1,
    metrics,
  },
  peak: {
    metric: 'pointsPerGame',
    minGames: 20,
    qualifiedSeasons: 1,
    excludedSeasons: 0,
    value: 20,
    seasons: ['2023-24'],
  },
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T16:00:00.000Z',
    retrievedAt: '2026-10-13T15:00:00.000Z',
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Reported test rows only.',
    warnings: ['DEMO FIXTURES'],
  },
};
describe('career research', () => {
  it('restores multi-career selections, preserves missing slots and breaks curves across years', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost/api/analytics/careers', () => {
        calls++;
        return HttpResponse.json({
          rows: [
            {
              playerId: '2544',
              status: 'available',
              data: {
                ...body,
                seasons: [
                  { ...body.seasons[0], totals: { ...totals, season: '2021-22' } },
                  body.seasons[0],
                ],
              },
            },
            { playerId: '201939', status: 'source-unavailable', data: null },
          ],
        });
      }),
    );
    renderApp(
      '/lab/careers?players=2544,201939&metric=pointsPerGame&minGames=20&axis=calendar',
    );
    expect(
      await screen.findByRole('table', { name: /Fixture career player/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unavailable (source-unavailable)')).toBeInTheDocument();
    expect(document.querySelectorAll('main svg path')).toHaveLength(1); // Only axes: no fabricated line across missing 2022-23.
    expect(screen.getByLabelText('Shareable career URL')).toHaveValue(
      'http://localhost:3000/lab/careers?players=2544%2C201939&metric=pointsPerGame&minGames=20&axis=calendar',
    );
    fireEvent.change(screen.getByLabelText('Career axis'), {
      target: { value: 'reported' },
    });
    await waitFor(() =>
      expect(
        screen.getByLabelText('Shareable career URL').getAttribute('value'),
      ).toContain('axis=reported'),
    );
    expect(calls).toBe(1);
    expect(document.querySelectorAll('main svg path')).toHaveLength(1);
  });
  it('restores criteria, shows raw/weighted values and saves the explicit criterion', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/career', ({ request }) => {
        const params = new URL(request.url).searchParams;
        return HttpResponse.json({
          ...body,
          peak: {
            ...body.peak,
            metric: params.get('metric'),
            minGames: Number(params.get('minGames')),
          },
        });
      }),
    );
    renderApp('/players/2544/career?metric=pointsPer36&minGames=40');
    await screen.findByRole('table', { name: /Chronological reported/ });
    expect(screen.getByLabelText('Peak criterion')).toHaveValue('pointsPer36');
    expect(screen.getByLabelText('Minimum games in season')).toHaveValue(40);
    expect(screen.getByText(/Attempt-weighted career TS/)).toHaveTextContent('60.00%');
    expect(screen.getByRole('link', { name: '2023-24 insights' })).toHaveAttribute(
      'href',
      '/players/2544/insights?season=2023-24',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('validates direct URLs before fetching and keeps unavailable records honest', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost/api/players/2544/career', () => {
        calls++;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/players/2544/career?minGames=0');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid career URL');
    expect(calls).toBe(0);
  });
  it('loads peak selection on demand and changes only the selected slot season', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost/api/players/:id', ({ params }) =>
        HttpResponse.json({
          player: { id: String(params.id), fullName: `Fixture ${params.id}` },
        }),
      ),
      http.get('http://localhost/api/players/:id/seasons', () =>
        HttpResponse.json({ seasons: [{ season: '2023-24' }, { season: '2022-23' }] }),
      ),
      http.get('http://localhost/api/players/2544/career', () => {
        calls++;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/lab/compare?players=2544,201939&seasons=,2022-23');
    const summary = await screen.findByText(
      'Choose a qualified peak season for NBA player 2544',
    );
    expect(calls).toBe(0);
    const details = summary.closest('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use 2023-24 for NBA player 2544' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Season for NBA player 2544')).toHaveValue(
        '2023-24',
      ),
    );
    expect(screen.getByLabelText('Season for NBA player 201939')).toHaveValue(
      '2022-23',
    );
  });
});
