import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

  it('lets the reader choose reduced or full motion and remembers it on this device', async () => {
    renderApp('/my-nba');
    await screen.findByRole('heading', { name: 'My NBA', level: 1 });
    const group = screen.getByRole('group', { name: 'Motion preference' });
    expect(within(group).getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(group).getByRole('button', { name: 'Reduced' }));
    expect(within(group).getByRole('button', { name: 'Reduced' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(window.localStorage.getItem('npe.motion-preference.v1')).toBe('reduced');
    fireEvent.click(within(group).getByRole('button', { name: 'Full' }));
    expect(document.documentElement.dataset.motion).toBe('full');
    window.localStorage.removeItem('npe.motion-preference.v1');
  });
});

describe('My NBA research board', () => {
  const seed = (bookmarks: object[]) =>
    localStorage.setItem(
      RESEARCH_STORAGE_KEY,
      JSON.stringify({ version: 1, bookmarks }),
    );
  const at = (day: number) => `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`;

  it('searches by name, note and destination, filters by kind and sorts', async () => {
    localStorage.clear();
    seed([
      {
        kind: 'team',
        label: 'Celtics season',
        path: '/teams/nba:1610612738/season',
        createdAt: at(1),
      },
      {
        kind: 'analysis',
        label: 'Corner threes',
        path: '/lab/shots?zone=Left+Corner+3',
        createdAt: at(3),
        note: 'Check against Houston',
      },
      {
        kind: 'player',
        label: 'Jokic 2023-24',
        path: '/players/203999/archive',
        createdAt: at(2),
      },
    ]);
    renderApp('/my-nba');
    const search = await screen.findByLabelText('Search saved research');
    const labels = () =>
      screen.getAllByRole('listitem').flatMap((li) => {
        const link = li.querySelector('.savedcard__label');
        return link ? [link.textContent] : [];
      });
    expect(labels()).toEqual(['Corner threes', 'Jokic 2023-24', 'Celtics season']);
    expect(screen.getByText('Players · 2023–24 recorded season')).toBeInTheDocument();
    expect(screen.getByText('Teams · 2023–24 season')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'houston' } });
    expect(labels()).toEqual(['Corner threes']);
    fireEvent.change(search, { target: { value: 'shot studio' } });
    expect(labels()).toEqual(['Corner threes']);
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Order saved research'), {
      target: { value: 'name' },
    });
    expect(labels()).toEqual(['Celtics season', 'Corner threes', 'Jokic 2023-24']);
    fireEvent.click(screen.getByRole('button', { name: 'Teams 1' }));
    expect(labels()).toEqual(['Celtics season']);
  });

  it('renames and annotates an item and keeps the note through export', async () => {
    localStorage.clear();
    seed([
      {
        kind: 'team',
        label: 'Celtics',
        path: '/teams/nba:1610612738/season',
        createdAt: at(1),
      },
    ]);
    renderApp('/my-nba');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Celtics' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Celtics 64-win season' },
    });
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Look at the February streak.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByRole('link', { name: 'Celtics 64-win season' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Look at the February streak.')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)!);
    expect(stored.bookmarks[0]).toMatchObject({
      label: 'Celtics 64-win season',
      note: 'Look at the February streak.',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export preferences JSON' }));
    expect(
      (screen.getByLabelText('Exported preferences JSON') as HTMLTextAreaElement).value,
    ).toContain('Look at the February streak.');
    // Clearing the note removes the field rather than storing an empty string.
    fireEvent.click(screen.getByRole('button', { name: 'Edit Celtics 64-win season' }));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)!).bookmarks[0],
      ).not.toHaveProperty('note'),
    );
  });
  it('groups saved research into collections that filter, rename, dissolve and export', async () => {
    localStorage.clear();
    seed([
      {
        kind: 'player',
        label: 'Jokic 2023-24',
        path: '/players/203999/archive',
        createdAt: at(1),
        tags: ['bigs', 'mvp race'],
      },
      {
        kind: 'player',
        label: 'Embiid 2023-24',
        path: '/players/203954/archive',
        createdAt: at(2),
        tags: ['bigs'],
      },
      {
        kind: 'analysis',
        label: 'Curry paint',
        path: '/lab/shots?players=201939&region=-8,-6,8,8',
        createdAt: at(3),
      },
    ]);
    renderApp('/my-nba');
    const group = await screen.findByRole('group', { name: 'Collections' });
    const labels = () =>
      [...document.querySelectorAll('.savedcard__label')].map((l) => l.textContent);
    fireEvent.click(within(group).getByRole('button', { name: 'bigs 2' }));
    expect(labels()).toEqual(['Embiid 2023-24', 'Jokic 2023-24']);
    expect(screen.getByText(/Showing 2 of 3 in “bigs”/)).toBeInTheDocument();
    // Export holds only this collection, as a valid version-1 file.
    fireEvent.click(screen.getByRole('button', { name: 'Export this collection' }));
    const exported = JSON.parse(
      (screen.getByLabelText('Exported preferences JSON') as HTMLTextAreaElement).value,
    );
    expect(exported.version).toBe(1);
    expect(exported.bookmarks.map((b: { label: string }) => b.label).sort()).toEqual([
      'Embiid 2023-24',
      'Jokic 2023-24',
    ]);
    // Renaming into an existing collection is refused; a new name moves every item.
    const rename = screen.getByLabelText('Rename collection');
    fireEvent.change(rename, { target: { value: 'MVP race' } });
    expect(screen.getByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled();
    fireEvent.change(rename, { target: { value: 'Big men' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)!).bookmarks.map(
          (b: { tags?: string[] }) => b.tags ?? [],
        ),
      ).toEqual([['big men', 'mvp race'], ['big men'], []]),
    );
    // Dissolving asks first and keeps the items.
    fireEvent.click(screen.getByRole('button', { name: 'Dissolve collection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dissolve' }));
    await waitFor(() => expect(labels()).toHaveLength(3));
    const stored = JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)!);
    expect(stored.bookmarks[1]).not.toHaveProperty('tags');
    expect(stored.bookmarks[0].tags).toEqual(['mvp race']);
  });

  it('adds collections while editing and rejects malformed names', async () => {
    localStorage.clear();
    seed([
      {
        kind: 'team',
        label: 'Celtics',
        path: '/teams/nba:1610612738/season',
        createdAt: at(1),
      },
    ]);
    renderApp('/my-nba');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Celtics' }));
    const field = screen.getByLabelText('Collections');
    fireEvent.change(field, { target: { value: '<script>' } });
    expect(screen.getByRole('alert')).toHaveTextContent('not a valid collection name');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent.change(field, { target: { value: 'a,b,c,d,e,f,g' } });
    expect(screen.getByRole('alert')).toHaveTextContent('At most 6 collections');
    fireEvent.change(field, { target: { value: ' Contenders , EAST,contenders ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)!).bookmarks[0].tags,
      ).toEqual(['contenders', 'east']),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show the east collection' }));
    expect(screen.getByRole('button', { name: 'east 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
