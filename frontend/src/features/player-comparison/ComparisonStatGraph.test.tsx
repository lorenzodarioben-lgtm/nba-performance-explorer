import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { ComparisonStatGraph } from './ComparisonStatGraph';

function stats(overrides: Partial<PlayerSeasonStats> = {}): PlayerSeasonStats {
  return {
    season: '2023-24',
    gamesPlayed: 71,
    minutesPerGame: 35.3,
    pointsPerGame: 25.7,
    reboundsPerGame: 7.3,
    assistsPerGame: 8.3,
    stealsPerGame: 1.3,
    blocksPerGame: 0.5,
    turnoversPerGame: 3.5,
    fieldGoalPercentage: 0.54,
    threePointPercentage: 0.41,
    freeThrowPercentage: 0.75,
    ...overrides,
  };
}

const playerA = { fullName: 'LeBron James', stats: stats({ pointsPerGame: 25.7 }) };
const playerB = {
  fullName: 'Stephen Curry',
  stats: stats({ pointsPerGame: 26.4, fieldGoalPercentage: 0.45 }),
};

describe('comparison stat graph', () => {
  it('shows a heading, the independent-scale note, and both player names', () => {
    render(
      <ComparisonStatGraph season="2023-24" playerA={playerA} playerB={playerB} />,
    );

    expect(
      screen.getByRole('heading', { name: 'Statistical matchup' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Each metric uses its own scale/)).toBeInTheDocument();
    expect(
      screen.getByText(/Compare players within a row, not across rows/),
    ).toBeInTheDocument();
    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('Stephen Curry')).toBeInTheDocument();
  });

  it('prints the same formatted values the comparison table uses', () => {
    render(
      <ComparisonStatGraph season="2023-24" playerA={playerA} playerB={playerB} />,
    );

    // Per-game values to one decimal; percentages as NN.N%. These match the table's formatters.
    expect(screen.getByText('25.7')).toBeInTheDocument();
    expect(screen.getByText('26.4')).toBeInTheDocument();
    expect(screen.getByText('54.0%')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('renders the bar graphic as aria-hidden so the table stays authoritative', () => {
    const { container } = render(
      <ComparisonStatGraph season="2023-24" playerA={playerA} playerB={playerB} />,
    );

    const graphic = container.querySelector('[aria-hidden="true"]');
    expect(graphic).not.toBeNull();
    // The metric bars and labels live inside the hidden graphic.
    expect(
      within(graphic as HTMLElement).getAllByText('Points per game').length,
    ).toBeGreaterThan(0);
  });

  it('sets every bar to its final width so reduced motion leaves it fully visible', () => {
    const { container } = render(
      <ComparisonStatGraph season="2023-24" playerA={playerA} playerB={playerB} />,
    );

    const bars = [...container.querySelectorAll('.stat-bar-in')] as HTMLElement[];
    expect(bars.length).toBe(22); // 11 metrics x 2 players
    // The reveal only animates transform; each bar carries its final resting width inline.
    for (const bar of bars) {
      expect(bar.style.width).toMatch(/%$/);
    }
  });

  it('introduces no winner or better/worse labelling', () => {
    render(
      <ComparisonStatGraph season="2023-24" playerA={playerA} playerB={playerB} />,
    );

    expect(
      screen.queryByText(/winner|better|worse|leads|wins|advantage/i),
    ).not.toBeInTheDocument();
  });

  it('handles equal and zero values without error', () => {
    const a = {
      fullName: 'Player A',
      stats: stats({ blocksPerGame: 0, pointsPerGame: 20 }),
    };
    const b = {
      fullName: 'Player B',
      stats: stats({ blocksPerGame: 0, pointsPerGame: 20 }),
    };
    const { container } = render(
      <ComparisonStatGraph season="2023-24" playerA={a} playerB={b} />,
    );

    const bars = [...container.querySelectorAll('.stat-bar-in')] as HTMLElement[];
    // Both blocks are zero, so both bars are empty; the raw value is still printed.
    expect(bars.some((bar) => bar.style.width === '0%')).toBe(true);
    // Equal points render as equal (full) bars, and both values are shown.
    expect(screen.getAllByText('20.0').length).toBeGreaterThanOrEqual(2);
  });
});
