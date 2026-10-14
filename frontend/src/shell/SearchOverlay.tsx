import {
  RecordedDirectorySchema,
  TeamDirectoryResponseSchema,
} from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { fetchResearch } from '../features/research/api';
import { useDebouncedSearchTerm } from '../features/player-search/useDebouncedSearchTerm';
import { usePlayerSearchQuery } from '../features/player-search/usePlayerSearchQuery';
import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';
import { Icon } from '../ui/Icon';
import { fold } from './fold';
import { SECTIONS } from './sections';

interface Option {
  key: string;
  group: 'Players' | 'Archive players' | 'Teams' | 'Sections and tools';
  /** Extra words a reader might type for this destination. */
  keywords?: string;
  title: string;
  meta: string;
  badge: string;
  to: string;
}

// Words people use for a tool that its title and blurb do not contain.
const KEYWORDS: Record<string, string> = {
  '/games/bracket': 'playoffs postseason series finals champion bracket tree',
  '/standings/race': 'standings race replay timeline ladder date season animation',
  '/lab/shots': 'shot chart heatmap hex zones court shooting map distance',
  '/games/shooting': 'box score shooting splits team field goals',
  '/lab/profiles': 'percentile radar profile cohort',
  '/lab/compare': 'compare versus vs head to head',
  '/lab/careers': 'career curve age experience aging',
  '/lab/lineups': 'lineup five-man units plus minus',
  '/history/records': 'records highs single game',
  '/history/progression': 'progression records over time trend',
  '/standings/recorded': 'rankings splits home away streak last ten',
  '/discover/recorded': 'similar players discover filter outliers',
  '/my-nba': 'saved bookmarks favourites favorites notes collections',
};

const TOOLS: Option[] = [
  ...SECTIONS.flatMap((section) => [
    {
      key: `section:${section.id}`,
      group: 'Sections and tools' as const,
      title: section.label,
      meta: section.blurb,
      badge: section.label.slice(0, 2).toUpperCase(),
      to: section.to,
    },
    ...section.pages
      .filter((page) => page.to !== section.to)
      .map((page) => ({
        key: `page:${page.to}`,
        group: 'Sections and tools' as const,
        title: page.label,
        meta: `${section.label} · ${page.blurb}`,
        badge: section.label.slice(0, 2).toUpperCase(),
        to: page.to,
        keywords: KEYWORDS[page.to],
      })),
  ]),
  {
    key: 'page:/my-nba',
    group: 'Sections and tools',
    title: 'My NBA',
    meta: 'Saved players, comparisons, links and recent history on this device.',
    badge: '★',
    to: '/my-nba',
    keywords: KEYWORDS['/my-nba'],
  },
  {
    key: 'page:/explore',
    group: 'Sections and tools',
    title: 'What’s on tape',
    meta: 'Every data source, what it covers and what it does not.',
    badge: 'SR',
    to: '/explore',
  },
];

function matches(option: Option, term: string) {
  const needle = fold(term);
  return [option.title, option.meta, option.keywords ?? ''].some((field) =>
    fold(field).includes(needle),
  );
}

/**
 * The broadcast search overlay (`/` or Ctrl/Cmd+K): players from the player search API, teams
 * from the directory and every section and tool. One combobox drives a grouped listbox, so the
 * whole thing is operable from the keyboard.
 */
export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const allowed = useMotionAllowed();
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            className="search-scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="panel"
            className="search"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={allowed ? { opacity: 0, y: -14, scale: 0.985 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={allowed ? { opacity: 0, y: -8, scale: 0.99 } : { opacity: 0 }}
            transition={{ duration: 0.26, ease: easings.arena }}
          >
            <SearchPanel onClose={onClose} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [term, setTerm] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const { debouncedTerm, normalizedTerm } = useDebouncedSearchTerm(term);
  const playerQuery = usePlayerSearchQuery(debouncedTerm);
  const teamsQuery = useQuery({
    queryKey: ['research', 'teams', ''],
    queryFn: ({ signal }) =>
      fetchResearch('/api/teams?', signal, (value) =>
        TeamDirectoryResponseSchema.parse(value),
      ),
    staleTime: 24 * 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const archiveQuery = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    enabled: normalizedTerm.length >= 3,
    staleTime: 24 * 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Focus the field on open. Closing without a choice gives focus back to whatever opened the
  // overlay; choosing a result leaves focus to the destination page (its heading takes it).
  const leaving = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      if (!leaving.current) previous?.focus?.();
    };
  }, []);

  const trimmed = normalizedTerm;
  const players: Option[] =
    debouncedTerm && debouncedTerm === trimmed
      ? (playerQuery.data?.players ?? []).slice(0, 6).map((player) => ({
          key: `player:${player.id}`,
          group: 'Players',
          title: player.fullName,
          meta: [player.team?.abbreviation ?? 'No current team', player.position]
            .filter(Boolean)
            .join(' · '),
          badge: player.fullName
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          to: `/players/${player.id}`,
        }))
      : [];
  const matchedTeams =
    trimmed.length >= 2
      ? (teamsQuery.data?.teams ?? [])
          .filter(
            (team) =>
              fold(team.name).includes(fold(trimmed)) ||
              team.abbreviation.toLowerCase() === trimmed.toLowerCase(),
          )
          .slice(0, 4)
      : [];
  const teams: Option[] = matchedTeams.flatMap((team, index) => [
    {
      key: `team:${team.id}`,
      group: 'Teams' as const,
      title: team.name,
      meta: `${team.abbreviation} · Team hub`,
      badge: team.abbreviation,
      to: `/teams/${team.id}`,
    },
    // The closest matches also offer the recorded season room directly.
    ...(index < 2
      ? [
          {
            key: `team-season:${team.id}`,
            group: 'Teams' as const,
            title: `${team.name} · 2023–24 season`,
            meta: 'Recorded games, streaks, splits and season series',
            badge: team.abbreviation,
            to: `/teams/${team.id}/season`,
          },
        ]
      : []),
  ]);
  // Players listed on the recorded 2023-24 team pages: name search that works without NBA.com.
  const playerIds = new Set(players.map((p) => p.key.slice('player:'.length)));
  const archivePlayers: Option[] =
    trimmed.length >= 3
      ? (archiveQuery.data?.players ?? [])
          .filter(
            (p) => !playerIds.has(p.playerId) && fold(p.name).includes(fold(trimmed)),
          )
          .slice(0, 5)
          .map((p) => ({
            key: `archive-player:${p.playerId}`,
            group: 'Archive players' as const,
            title: p.name,
            meta: `${p.teams.map((t) => t.abbreviation).join(' / ')} · 2023–24 recorded season`,
            badge: p.name
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            to: `/players/${p.playerId}/archive`,
          }))
      : [];
  const tools = trimmed
    ? TOOLS.filter((option) => matches(option, trimmed)).slice(0, 8)
    : TOOLS.filter(
        (option) => option.key.startsWith('section:') || option.key === 'page:/my-nba',
      );
  const options = [...players, ...archivePlayers, ...teams, ...tools];
  const groups = (
    ['Players', 'Archive players', 'Teams', 'Sections and tools'] as const
  )
    .map((group) => ({
      group,
      items: options.filter((option) => option.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.key === highlight),
  );
  const active = options[activeIndex];
  const optionId = (option: Option) =>
    `${listId}-${option.key.replace(/[^a-z0-9-]/gi, '_')}`;

  const go = (option: Option | undefined) => {
    if (!option) return;
    leaving.current = true;
    onClose();
    void navigate(option.to);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!options.length) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = options[(activeIndex + delta + options.length) % options.length];
      if (next) setHighlight(next.key);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(active);
    } else if (event.key === 'Tab') {
      // The field is the dialog's only stop; results are reached with the arrow keys.
      event.preventDefault();
    }
  };

  const searching =
    trimmed.length >= 2 && (debouncedTerm !== trimmed || playerQuery.isFetching);

  return (
    <>
      <div className="search__head">
        <Icon name="search" size={20} />
        <input
          ref={inputRef}
          className="search__input"
          type="search"
          role="combobox"
          aria-label="Search players, teams and tools"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active) : undefined}
          placeholder="Player, team or tool"
          autoComplete="off"
          spellCheck={false}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setHighlight(null);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="btn btn--sm btn--quiet" onClick={onClose}>
          Esc
          <span className="sr-only">: close search</span>
        </button>
      </div>
      <div className="search__body">
        <div id={listId} role="listbox" aria-label="Search results">
          {groups.map(({ group, items }) => (
            <div key={group} role="group" aria-label={group} className="search__group">
              <div className="search__label" aria-hidden="true">
                {trimmed ? group : 'Jump to'}
              </div>
              {items.map((option) => (
                <div
                  key={option.key}
                  id={optionId(option)}
                  role="option"
                  aria-selected={option === active}
                  className="search__opt"
                  onPointerMove={() => {
                    if (highlight !== option.key) setHighlight(option.key);
                  }}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => go(option)}
                >
                  <span className="search__badge" aria-hidden="true">
                    {option.badge}
                  </span>
                  <span>
                    <span className="search__title">{option.title}</span>
                    <span className="search__meta">{option.meta}</span>
                  </span>
                  <span className="search__go" aria-hidden="true">
                    Open ↵
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="search__status" role="status" aria-live="polite">
          {searching
            ? 'Searching players…'
            : playerQuery.isError && debouncedTerm
              ? 'Player search is unavailable right now; teams and tools still work.'
              : trimmed.length >= 2 && !options.length
                ? `Nothing matches “${trimmed}”.`
                : trimmed.length === 1
                  ? 'Type at least 2 characters to search players.'
                  : ''}
        </p>
      </div>
      <div className="search__foot" aria-hidden="true">
        <span>↑ ↓ move</span>
        <span>↵ open</span>
        <span>Esc close</span>
      </div>
    </>
  );
}
