import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { RESEARCH_STORAGE_KEY, researchRepository } from './local-research';
import { RECENT_STORAGE_KEY, recentHistoryRepository } from './recent-history';

beforeEach(() => {
  localStorage.clear();
  researchRepository.clear();
});

describe('My NBA preferences journey', () => {
  it('requires local history opt-in and clears all history/consent with confirmed local reset', async () => {
    renderApp('/my-nba');
    const toggle = await screen.findByLabelText(
      'Record recently viewed research pages on this device',
    );
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(RECENT_STORAGE_KEY)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    recentHistoryRepository.record({
      path: '/history/1999-00',
      label: 'Season1999',
      visitedAt: '2026-10-13T20:00:00.000Z',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all local research' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear all' }));
    expect(
      screen.getByLabelText('Record recently viewed research pages on this device'),
    ).not.toBeChecked();
    expect(recentHistoryRepository.load().data.visits).toEqual([]);
  });
  it('saves favorites, survives remount, and exports validated JSON', async () => {
    const view = renderApp('/my-nba');
    await screen.findByRole('heading', { name: 'My NBA', level: 1 });
    fireEvent.change(screen.getByLabelText('Bookmark name'), {
      target: { value: 'Curry favorite' },
    });
    fireEvent.change(screen.getByLabelText('Internal research path'), {
      target: { value: '/players/201939' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));
    expect(screen.getByRole('link', { name: 'Curry favorite' })).toHaveAttribute(
      'href',
      '/players/201939',
    );
    view.unmount();
    renderApp('/my-nba');
    await screen.findByRole('link', { name: 'Curry favorite' });
    fireEvent.click(screen.getByRole('button', { name: 'Export preferences JSON' }));
    const value = (
      screen.getByLabelText('Exported preferences JSON') as HTMLTextAreaElement
    ).value;
    expect(JSON.parse(value)).toMatchObject({
      version: 1,
      bookmarks: [{ label: 'Curry favorite' }],
    });
  });
  it('rejects malformed and external-link imports without losing research', async () => {
    researchRepository.add({
      kind: 'comparison',
      label: 'Saved comparison',
      path: '/lab/compare?players=2544,201939&seasons=2023-24,2023-24',
      createdAt: '2026-10-13T16:00:00.000Z',
    });
    renderApp('/my-nba');
    await screen.findByRole('link', { name: 'Saved comparison' });
    fireEvent.change(screen.getByLabelText('Import preferences JSON'), {
      target: {
        value:
          '{"version":1,"bookmarks":[{"kind":"page","path":"https://evil.example","label":"Unsafe","createdAt":"2026-10-13T16:00:00.000Z"}]}',
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Import JSON and keep existing research' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Import rejected');
    expect(screen.getByRole('link', { name: 'Saved comparison' })).toBeInTheDocument();
  });
  it('merges valid imported preferences and can restore their internal URL', async () => {
    renderApp('/my-nba');
    await screen.findByRole('heading', { name: 'My NBA', level: 1 });
    const imported = {
      version: 1,
      bookmarks: [
        {
          kind: 'analysis',
          label: 'Curry home form',
          path: '/players/201939/insights?location=home&window=10',
          createdAt: '2026-10-13T16:00:00.000Z',
        },
      ],
    };
    fireEvent.change(screen.getByLabelText('Import preferences JSON'), {
      target: { value: JSON.stringify(imported) },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Import JSON and keep existing research' }),
    );
    expect(screen.getByRole('link', { name: 'Curry home form' })).toHaveAttribute(
      'href',
      imported.bookmarks[0]!.path,
    );
    expect(localStorage.getItem(RESEARCH_STORAGE_KEY)).toContain('Curry home form');
  });
  it('requires explicit clear confirmation and supports cancellation', async () => {
    researchRepository.add({
      kind: 'page',
      label: 'Explorer bookmark',
      path: '/explore',
      createdAt: '2026-10-13T16:00:00.000Z',
    });
    renderApp('/my-nba');
    await screen.findByRole('link', { name: 'Explorer bookmark' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all local research' }));
    expect(screen.getByRole('link', { name: 'Explorer bookmark' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel clear' }));
    expect(
      screen.queryByRole('button', { name: 'Confirm clear all' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all local research' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear all' }));
    expect(screen.getByText('No saved research yet.')).toBeInTheDocument();
  });
  it('recovers corrupt storage with an explicit valid import', async () => {
    localStorage.setItem(RESEARCH_STORAGE_KEY, '{bad');
    renderApp('/my-nba');
    await screen.findByText(/Stored research could not be read/);
    expect(localStorage.getItem(RESEARCH_STORAGE_KEY)).toBe('{bad');
    fireEvent.change(screen.getByLabelText('Import preferences JSON'), {
      target: { value: '{"version":1,"bookmarks":[]}' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Import JSON and keep existing research' }),
    );
    expect(localStorage.getItem(RESEARCH_STORAGE_KEY)).toBe(
      '{"version":1,"bookmarks":[]}',
    );
  });
});
