import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { AREAS, FORMULAS } from './formula-registry';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './FormulaLabPage';

describe('formula lab', () => {
  it('keeps a complete, well-formed registry', () => {
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(FORMULAS.length);
    for (const f of FORMULAS) {
      expect(AREAS).toContain(f.area);
      expect(f.usedIn.length).toBeGreaterThan(0);
      expect(f.implementedIn).toMatch(/^(backend|frontend)\/src\/.+\.ts$/);
    }
  });

  it('lists every formula and filters by area and search, kept in the URL', async () => {
    renderApp('/lab/formulas');
    await screen.findByRole('heading', { level: 1, name: 'Formula lab' });
    expect(screen.getAllByRole('article')).toHaveLength(FORMULAS.length);
    fireEvent.click(screen.getByRole('button', { name: /^Playoffs \d/ }));
    await waitFor(() =>
      expect(screen.getAllByRole('article')).toHaveLength(
        FORMULAS.filter((f) => f.area === 'Playoffs').length,
      ),
    );
    const series = screen.getByRole('article', { name: 'Series winner and round' });
    expect(within(series).getByText('New in 3.0')).toBeInTheDocument();
    expect(
      within(series).getByRole('link', { name: 'Playoff bracket' }),
    ).toHaveAttribute('href', '/games/bracket');
    fireEvent.click(screen.getByRole('button', { name: /^All \d/ }));
    fireEvent.change(screen.getByLabelText('Search formulas'), {
      target: { value: 'back-to-back' },
    });
    await waitFor(() =>
      expect(screen.getAllByRole('article').map((a) => a.id)).toEqual(['rest-days']),
    );
    fireEvent.change(screen.getByLabelText('Search formulas'), {
      target: { value: 'zzzz' },
    });
    expect(await screen.findByText(/No formula matches/)).toBeInTheDocument();
  });

  it('opens with an area from a shared link', async () => {
    renderApp('/lab/formulas?area=Shots');
    await screen.findByRole('heading', { level: 1, name: 'Formula lab' });
    expect(screen.getAllByRole('article')).toHaveLength(
      FORMULAS.filter((f) => f.area === 'Shots').length,
    );
  });
});
