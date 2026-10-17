import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Story } from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { RESEARCH_STORAGE_KEY, researchRepository } from '../my-nba/local-research';
import { encodeShare, STORIES_STORAGE_KEY, storyRepository } from './story-store';
// Compile the subjects before assertion timers; the app still renders the actual lazy routes.
import './StoriesPage';
import './StoryEditorPage';
import './StoryReaderPage';

const stored = () =>
  JSON.parse(localStorage.getItem(STORIES_STORAGE_KEY) ?? '{"stories":[]}') as {
    stories: Story[];
  };

beforeEach(() => {
  localStorage.clear();
  storyRepository.refresh();
  researchRepository.clear();
  // No linked source answers in these tests unless a test says so: the story must say the
  // source is unavailable rather than show anything in its place.
  server.use(
    http.get('http://localhost/api/games/series/:id', () =>
      HttpResponse.json({ error: { code: 'X', message: 'down' } }, { status: 503 }),
    ),
  );
});

describe('statistical stories', () => {
  it('creates a story, writes and reorders sections, and keeps it after a reload', async () => {
    const view = renderApp('/my-nba/stories');
    fireEvent.change(await screen.findByLabelText('Story title'), {
      target: { value: 'Playoff margins' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create story' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Playoff margins' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add a text section' }));
    fireEvent.change(await screen.findByLabelText('Heading (section 1)'), {
      target: { value: 'Opening' },
    });
    fireEvent.change(screen.getByLabelText('Text (section 1)'), {
      target: { value: 'First paragraph.\n\nSecond <b>paragraph</b>.' },
    });
    fireEvent.change(screen.getByLabelText('Or paste an internal link'), {
      target: { value: 'https://evil.test/x' },
    });
    expect(screen.getByRole('button', { name: 'Add link' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Or paste an internal link'), {
      target: { value: '/games/series/r4-BOS-DAL' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(await screen.findByLabelText('Analysis title (section 2)')).toHaveValue(
      'Series film room',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move section 2 up' }));
    await waitFor(() =>
      expect(stored().stories[0]!.sections.map((s) => s.kind)).toEqual([
        'analysis',
        'text',
      ]),
    );
    // Unavailable source: said plainly, with the link kept.
    expect(
      await screen.findByText(
        /source for this analysis is unavailable/,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open in the series film room/ }),
    ).toHaveAttribute('href', '/games/series/r4-BOS-DAL');
    // A reload (fresh repository read) shows the same story.
    view.unmount();
    storyRepository.refresh();
    const id = stored().stories[0]!.id;
    renderApp(`/my-nba/stories/${id}/read`);
    const article = await screen.findByRole('article', { name: 'Playoff margins' });
    // Reader text stays text: no markup is interpreted.
    expect(within(article).getByText('Second <b>paragraph</b>.')).toBeInTheDocument();
    expect(within(article).getByText('First paragraph.')).toBeInTheDocument();
    expect(
      within(article).getByRole('button', { name: 'Print or save as PDF' }),
    ).toBeInTheDocument();
  });

  it('builds a starter only from genuine linked analyses', async () => {
    server.use(
      http.get('http://localhost/api/recorded/team-season', () =>
        HttpResponse.json({ error: { code: 'X', message: 'down' } }, { status: 503 }),
      ),
    );
    renderApp('/my-nba/stories');
    fireEvent.click(await screen.findByRole('button', { name: /Boston's 2023–24/ }));
    expect(await screen.findByLabelText('Analysis title (section 4)')).toHaveValue(
      'The Finals',
    );
    const story = stored().stories[0]!;
    expect(
      story.sections
        .filter((s) => s.kind === 'analysis')
        .map((s) => s.kind === 'analysis' && s.path),
    ).toEqual([
      '/teams/nba:1610612738/season',
      '/games/series/r3-BOS-IND',
      '/games/series/r4-BOS-DAL',
    ]);
    expect(story.dek).toMatch(/recorded regular-season results/);
  });

  it('duplicates, and deletes only after confirmation', async () => {
    const created = storyRepository.create('To remove');
    renderApp(`/my-nba/stories/${created.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete story' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be undone');
    fireEvent.click(screen.getByRole('button', { name: 'Keep story' }));
    expect(stored().stories).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate story' }));
    await waitFor(() => expect(stored().stories).toHaveLength(2));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'To remove (copy)' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() =>
      expect(stored().stories.map((s) => s.title)).toEqual(['To remove']),
    );
  });

  it('imports valid JSON alongside existing stories and rejects bad files without loss', async () => {
    researchRepository.add({
      kind: 'page',
      label: 'Kept research',
      path: '/games/bracket',
      createdAt: '2026-10-15T10:00:00.000Z',
    });
    storyRepository.create('Mine');
    renderApp('/my-nba/stories');
    const field = await screen.findByLabelText('Import stories JSON');
    fireEvent.change(field, {
      target: { value: '{"version":1,"stories":[{"id":"x"}]}' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Import and keep existing stories' }),
    );
    expect(await screen.findByText(/Import rejected/)).toBeInTheDocument();
    expect(stored().stories.map((s) => s.title)).toEqual(['Mine']);
    const incoming = {
      version: 1,
      stories: [
        {
          id: 'simported0001',
          title: 'Imported',
          dek: '',
          createdAt: '2026-10-15T10:00:00.000Z',
          updatedAt: '2026-10-15T10:00:00.000Z',
          sections: [],
        },
      ],
    };
    fireEvent.change(field, { target: { value: JSON.stringify(incoming) } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Import and keep existing stories' }),
    );
    expect(await screen.findByText(/Imported 1 story/)).toBeInTheDocument();
    expect(stored().stories.map((s) => s.title)).toEqual(['Mine', 'Imported']);
    // Saved research is untouched by stories.
    expect(localStorage.getItem(RESEARCH_STORAGE_KEY)).toContain('Kept research');
  });

  it('opens a share link read-only, saves a copy, and rejects a damaged link', async () => {
    const shared: Story = {
      id: 'sshared000001',
      title: 'Shared by a friend',
      dek: 'A short one.',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      sections: [{ id: 'sec00000001', kind: 'text', heading: 'Hi', body: 'Hello.' }],
    };
    const view = renderApp(`/my-nba/stories/shared#s=${encodeShare(shared)}`);
    expect(
      await screen.findByRole('article', { name: 'Shared by a friend' }),
    ).toBeInTheDocument();
    expect(stored().stories).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save a copy to My NBA' }));
    await waitFor(() =>
      expect(stored().stories.map((s) => s.title)).toEqual(['Shared by a friend']),
    );
    view.unmount();
    renderApp('/my-nba/stories/shared#s=AAAA');
    expect(await screen.findByRole('alert')).toHaveTextContent(/damaged|not a story/);
  });
});
