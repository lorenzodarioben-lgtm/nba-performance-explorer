import { useSyncExternalStore } from 'react';
import type { StorySection } from '@nba-performance-explorer/contracts';

import { newId, storyRepository } from './story-store';

export function useStories() {
  return useSyncExternalStore(
    storyRepository.subscribe,
    storyRepository.read,
    storyRepository.read,
  );
}

/** Starters made only of genuine linked analyses and neutral prompts for the reader's text. */
export const STARTERS: readonly {
  key: string;
  title: string;
  dek: string;
  sections: () => StorySection[];
}[] = [
  {
    key: 'boston',
    title: "Boston's 2023–24: from the regular season to the title",
    dek: 'A season traced through the recorded regular-season results and the 2024 playoff series.',
    sections: () => [
      {
        id: newId(),
        kind: 'text',
        heading: 'The question',
        body: 'This story follows the Boston Celtics from the 2023–24 regular season to the 2024 Finals. Each analysis below is read live from the recorded data; write what you notice between them.',
      },
      {
        id: newId(),
        kind: 'analysis',
        title: 'The regular season',
        path: '/teams/nba:1610612738/season',
        note: '',
      },
      {
        id: newId(),
        kind: 'analysis',
        title: 'Conference finals',
        path: '/games/series/r3-BOS-IND',
        note: '',
      },
      {
        id: newId(),
        kind: 'analysis',
        title: 'The Finals',
        path: '/games/series/r4-BOS-DAL',
        note: '',
      },
      { id: newId(), kind: 'text', heading: 'What the record shows', body: '' },
    ],
  },
  {
    key: 'bigs',
    title: 'Jokić and Antetokounmpo in the recorded 2023–24 numbers',
    dek: 'Two MVP-calibre bigs compared inside one stated cohort, then their nearest statistical neighbours.',
    sections: () => [
      {
        id: newId(),
        kind: 'analysis',
        title: 'Side by side',
        path: '/compare/recorded?players=203999,203507',
        note: '',
      },
      {
        id: newId(),
        kind: 'analysis',
        title: 'Seasons most like Jokić',
        path: '/discover/similar?player=203999&metrics=pointsPerGame,reboundsPerGame,assistsPerGame,fieldGoalPercentage',
        note: '',
      },
      { id: newId(), kind: 'text', heading: 'Reading the gaps', body: '' },
    ],
  },
  {
    key: 'curry',
    title: "Stephen Curry's archived 2018 playoff shots",
    dek: 'Where the recorded attempts came from, and how the paint compares with everything else.',
    sections: () => [
      {
        id: newId(),
        kind: 'analysis',
        title: 'Every recorded attempt',
        path: '/lab/shots?players=201939&view=zones',
        note: '',
      },
      {
        id: newId(),
        kind: 'analysis',
        title: 'Inside the paint box',
        path: '/lab/shots?players=201939&view=density&region=-8,-6,8,8',
        note: '',
      },
      {
        id: newId(),
        kind: 'text',
        heading: 'Scope',
        body: 'These are attempts from part of the 2018 playoffs only (the archive ends on June 3, before the playoffs finished). They describe this sample, not a full season.',
      },
    ],
  },
];
