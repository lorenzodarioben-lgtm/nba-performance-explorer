import { useState } from 'react';
import { Link } from 'react-router';
import type {
  LocalResearch,
  ResearchBookmark,
} from '@nba-performance-explorer/contracts';

import { pageForPath, sectionForPath } from '../../shell/sections';
import { fold } from '../../shell/fold';
import { Segmented } from '../../ui/Segmented';

type Kind = ResearchBookmark['kind'] | 'all';
type Sort = 'newest' | 'oldest' | 'name';

const KIND_PLURAL: Record<ResearchBookmark['kind'], string> = {
  player: 'Players',
  team: 'Teams',
  comparison: 'Comparisons',
  analysis: 'Analyses',
  page: 'Pages',
};
const KIND_LABEL: Record<ResearchBookmark['kind'], string> = {
  player: 'Player',
  team: 'Team',
  comparison: 'Comparison',
  analysis: 'Analysis',
  page: 'Page',
};

/** Where a saved link leads, in the site's own words (section · page). */
function destinationOf(path: string) {
  const pathname = path.split('?')[0]!;
  const section = sectionForPath(pathname);
  const page = pageForPath(pathname);
  if (/^\/players\/\d+\/archive$/.test(pathname))
    return 'Players · 2023–24 recorded season';
  if (/^\/teams\/nba:\d+\/season$/.test(pathname)) return 'Teams · 2023–24 season';
  const parts = [
    section?.label,
    page && page.label !== section?.label ? page.label : null,
  ];
  return parts.filter(Boolean).join(' · ') || 'My NBA';
}

/**
 * The saved-research board: search, filter by kind, sort, and per-item rename, note and remove.
 * Every change is written through `onSave`, which validates and stores locally.
 */
export function SavedResearchBoard({
  data,
  onSave,
}: {
  data: LocalResearch;
  onSave: (next: LocalResearch, message: string) => void;
}) {
  const [term, setTerm] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [editing, setEditing] = useState<string | null>(null);
  const items = data.bookmarks;
  const counts = new Map<Kind, number>([['all', items.length]]);
  for (const b of items) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  const needle = fold(term.trim());
  const shown = items
    .filter((b) => kind === 'all' || b.kind === kind)
    .filter(
      (b) =>
        !needle ||
        [b.label, b.path, b.note ?? '', destinationOf(b.path)].some((f) =>
          fold(f).includes(needle),
        ),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.label.localeCompare(b.label)
        : sort === 'oldest'
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
  const keyOf = (b: ResearchBookmark) => `${b.kind}:${b.path}`;
  const replace = (
    target: ResearchBookmark,
    next: ResearchBookmark | null,
    message: string,
  ) =>
    onSave(
      {
        version: 1,
        bookmarks: items.flatMap((b) =>
          keyOf(b) === keyOf(target) ? (next ? [next] : []) : [b],
        ),
      },
      message,
    );
  const kinds = (
    ['all', 'player', 'team', 'comparison', 'analysis', 'page'] as const
  ).filter((k) => k === 'all' || counts.get(k));
  return (
    <div className="savedboard">
      <div className="savedboard__bar">
        <label className="savedboard__search">
          Search saved research
          <input
            type="search"
            value={term}
            maxLength={100}
            placeholder="Name, note or destination"
            onChange={(e) => setTerm(e.target.value)}
          />
        </label>
        <label>
          Order saved research
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">By name</option>
          </select>
        </label>
      </div>
      {kinds.length > 2 ? (
        <Segmented
          label="Show saved research of kind"
          options={kinds.map((k) => ({
            value: k,
            label: `${k === 'all' ? 'All' : KIND_PLURAL[k]} ${counts.get(k) ?? 0}`,
          }))}
          value={kinds.includes(kind as (typeof kinds)[number]) ? kind : 'all'}
          onChange={setKind}
        />
      ) : null}
      <p className="savedboard__count">
        Showing {shown.length} of {items.length}
        {needle ? ` matching “${term.trim()}”` : ''}
      </p>
      {shown.length ? (
        <ul className="savedboard__grid">
          {shown.map((item) => {
            const key = keyOf(item);
            return (
              <li key={key} className="savedcard" data-kind={item.kind}>
                <span className="savedcard__kind">{KIND_LABEL[item.kind]}</span>
                {editing === key ? (
                  <EditForm
                    item={item}
                    onCancel={() => setEditing(null)}
                    onDone={(label, note) => {
                      setEditing(null);
                      // Built field by field so a cleared note leaves no empty key behind.
                      replace(
                        item,
                        {
                          kind: item.kind,
                          label,
                          path: item.path,
                          createdAt: item.createdAt,
                          ...(note ? { note } : {}),
                        },
                        'Saved research updated.',
                      );
                    }}
                  />
                ) : (
                  <>
                    <Link to={item.path} className="savedcard__label">
                      {item.label}
                    </Link>
                    <span className="savedcard__dest">{destinationOf(item.path)}</span>
                    {item.note ? <p className="savedcard__note">{item.note}</p> : null}
                    <span className="savedcard__date">
                      Saved {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="savedcard__actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--quiet"
                        aria-label={`Edit ${item.label}`}
                        onClick={() => setEditing(key)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--quiet"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => replace(item, null, 'Bookmark removed.')}
                      >
                        Remove
                      </button>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="savedboard__empty">
          {items.length
            ? 'Nothing saved matches this search.'
            : 'No saved research yet.'}
        </p>
      )}
    </div>
  );
}

function EditForm({
  item,
  onCancel,
  onDone,
}: {
  item: ResearchBookmark;
  onCancel: () => void;
  onDone: (label: string, note: string) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [note, setNote] = useState(item.note ?? '');
  return (
    <form
      className="savedcard__edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim()) onDone(label.trim(), note.trim());
      }}
    >
      <label>
        Name
        <input
          value={label}
          required
          maxLength={100}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <label>
        Note
        <textarea
          value={note}
          maxLength={500}
          rows={3}
          placeholder="What you were investigating, what to check next…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <span className="savedcard__actions">
        <button type="submit" className="btn btn--sm">
          Save changes
        </button>
        <button type="button" className="btn btn--sm btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </span>
    </form>
  );
}
