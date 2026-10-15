import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  RecordedSimilarityResponseSchema,
  type RecordedSimilarityResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
import { readSimilarityState, similarityCsv } from './similarity-config';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './SimilarityPage';

const team = (i: number) => ({
  id: `nba:${1610612737 + i}`,
  sourceId: `${1610612737 + i}`,
  abbreviation: `T${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
  name: `Team ${i}`,
});
const directory = {
  season: '2023-24',
  teams: Array.from({ length: 30 }, (_, i) => team(i)),
  players: [
    { playerId: '1', name: 'Fixture Àlpha', teams: [team(0)] },
    { playerId: '2', name: 'Fixture Bravo', teams: [team(1)] },
    { playerId: '3', name: '=Fixture Charlie', teams: [team(2)] },
  ],
  attributions: Array.from({ length: 30 }, () => leagueFixture.attribution),
  provenance: leagueFixture.provenance,
};
const metricsOf = (q: URLSearchParams) =>
  (q.get('metrics') ?? 'pointsPerGame,reboundsPerGame,assistsPerGame').split(',');
function response(q: URLSearchParams): RecordedSimilarityResponse {
  const metrics = metricsOf(q) as RecordedSimilarityResponse['metrics'];
  const minGames = Number(q.get('minGames') ?? 20);
  const base = {
    season: '2023-24' as const,
    minGames,
    metrics,
    cohort: 250,
    excluded: { belowMinimum: 100, missingMetric: 40 },
    targetName: 'Fixture Àlpha',
    targetGames: 30,
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    provenance: leagueFixture.provenance,
  };
  if (minGames > 30)
    return { ...base, target: null, targetStatus: 'below-minimum', neighbours: [] };
  const values = metrics.map((_, k) => 10 + k);
  return {
    ...base,
    target: {
      playerId: '1',
      name: 'Fixture Àlpha',
      teams: ['TAA'],
      gamesPlayed: 30,
      values,
      zScores: metrics.map(() => 1),
    },
    targetStatus: 'in-cohort',
    neighbours: [
      {
        playerId: '2',
        name: 'Fixture Bravo',
        teams: ['TAB'],
        gamesPlayed: 60,
        values: values.map((v) => v + 1),
        zScores: metrics.map(() => 1.2),
        rank: 1,
        distance: 0.25,
        differences: metrics.map((_, k) => (k === 0 ? 0.5 : 0.1)),
        closest: metrics[1]!,
        furthest: metrics[0]!,
      },
      {
        playerId: '3',
        name: '=Fixture Charlie',
        teams: ['TAC'],
        gamesPlayed: 70,
        values: values.map((v) => v - 2),
        zScores: metrics.map(() => -0.5),
        rank: 2,
        distance: 1.5,
        differences: metrics.map(() => -1.5),
        closest: metrics[0]!,
        furthest: metrics[0]!,
      },
    ],
  };
}
function routes(seen: URLSearchParams[] = []) {
  server.use(
    http.get('http://localhost/api/recorded/directory', () =>
      HttpResponse.json(directory),
    ),
    http.get('http://localhost/api/recorded/similarity', ({ request }) => {
      const q = new URL(request.url).searchParams;
      seen.push(q);
      return HttpResponse.json(response(q));
    }),
  );
}

describe('similarity finder', () => {
  it('uses contract-valid fixtures and reads only supported links', () => {
    expect(
      RecordedSimilarityResponseSchema.safeParse(response(new URLSearchParams()))
        .success,
    ).toBe(true);
    expect(
      RecordedSimilarityResponseSchema.safeParse(
        response(new URLSearchParams('minGames=40')),
      ).success,
    ).toBe(true);
    expect(readSimilarityState(new URLSearchParams())).toMatchObject({
      valid: true,
      player: null,
      metrics: ['pointsPerGame', 'reboundsPerGame', 'assistsPerGame'],
    });
    for (const bad of [
      'metrics=pointsPerGame',
      'metrics=pointsPerGame,pointsPerGame',
      'player=abc',
      'limit=99',
      'minGames=0',
      'player=1&player=2',
      'extra=1',
    ])
      expect(readSimilarityState(new URLSearchParams(bad)).valid, bad).toBe(false);
  });

  it('picks a player by name and asks for the chosen measures in a stable order', async () => {
    const seen: URLSearchParams[] = [];
    routes(seen);
    renderApp('/discover/similar');
    fireEvent.change(await screen.findByLabelText('Find seasons like'), {
      target: { value: 'alph' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Fixture Àlpha/ }));
    await waitFor(() => expect(seen.at(-1)?.get('player')).toBe('1'));
    expect(
      await screen.findByRole('list', { name: 'Nearest seasons to Fixture Àlpha' }),
    ).toBeInTheDocument();
    // Adding a measure keeps the canonical order; removing stops at two.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Minutes' }));
    await waitFor(() =>
      expect(metricsOf(seen.at(-1)!)).toEqual([
        'minutesPerGame',
        'pointsPerGame',
        'reboundsPerGame',
        'assistsPerGame',
      ]),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Minutes' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Assists' }));
    await waitFor(() =>
      expect(metricsOf(seen.at(-1)!)).toEqual(['pointsPerGame', 'reboundsPerGame']),
    );
    expect(screen.getByRole('checkbox', { name: 'Points' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Assists' })).toBeEnabled();
  });

  it('lists neighbours with distances, reasons, exact differences and a compare link', async () => {
    routes();
    renderApp('/discover/similar?player=1&metrics=pointsPerGame,fieldGoalPercentage');
    const list = await screen.findByRole('list', {
      name: 'Nearest seasons to Fixture Àlpha',
    });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Closest on FG%; furthest on Points (+0.50 SD)');
    expect(within(rows[0]!).getByRole('link', { name: 'Compare' })).toHaveAttribute(
      'href',
      '/compare/recorded?players=1,2',
    );
    expect(screen.getByText(/250 players with at least 20 games/)).toBeInTheDocument();
    const table = screen.getByRole('group', { name: 'Similarity exact values' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 1 + 2);
    // Percentages are shown as percentages; differences carry their sign.
    expect(table).toHaveTextContent('1100.0%');
    expect(table).toHaveTextContent('−1.50');
    const csv = similarityCsv(
      response(new URLSearchParams('metrics=pointsPerGame,fieldGoalPercentage')),
    );
    expect(csv).toContain('"\'=Fixture Charlie"');
    expect(csv).toContain(
      '# Cohort 250; below the games minimum 100; missing a metric 40',
    );
  });

  it('explains a player outside the cohort and offers the matching minimum', async () => {
    const seen: URLSearchParams[] = [];
    routes(seen);
    renderApp('/discover/similar?player=1&minGames=40');
    expect(
      await screen.findByText(/played 30 games, below this 40/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lower the minimum to 30' }));
    await waitFor(() => expect(seen.at(-1)?.get('minGames')).toBe('30'));
    expect(
      await screen.findByRole('list', { name: 'Nearest seasons to Fixture Àlpha' }),
    ).toBeInTheDocument();
  });

  it('rejects malformed links', async () => {
    routes();
    renderApp('/discover/similar?player=1&metrics=pointsPerGame');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});
