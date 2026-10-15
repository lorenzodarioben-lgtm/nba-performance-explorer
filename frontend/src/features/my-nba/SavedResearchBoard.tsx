import { useState } from 'react';
import { Link } from 'react-router';
import type {
  LocalResearch,
  ResearchBookmark,
} from '@nba-performance-explorer/contracts';

import { pageForPath, sectionForPath } from '../../shell/sections';
import { fold } from '../../shell/fold';
import { Segmented } from '../../ui/Segmented';
import { parseTags } from './local-research';

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

/** Rebuilds an item field by field, so cleared optional fields leave no empty key behind. */
function withFields(
  item: ResearchBookmark,
  fields: { label?: string; note?: string; tags?: string[] },
): ResearchBookmark {
  const label = fields.label ?? item.label;
  const note = 'note' in fields ? fields.note : item.note;
  const tags = 'tags' in fields ? fields.tags : item.tags;
  return {
    kind: item.kind,
    label,
    path: item.path,
    createdAt: item.createdAt,
    ...(note ? { note } : {}),
    ...(tags?.length ? { tags } : {}),
  };
}

/**
 * The saved-research board: search, filter by kind or collection, sort, per-item rename, note,
 * collections and remove, and whole-collection rename, dissolve and export. Every change is
 * written through `onSave`, which validates and stores locally.
 */
export function SavedResearchBoard({
  data,
  onSave,
  onExport,
}: {
  data: LocalResearch;
  onSave: (next: LocalResearch, message: string) => void;
  /** Prepares a version-1 file holding just these items for the reader to copy. */
  onExport?: (subset: LocalResearch, name: string) => void;
}) {
  const [term, setTerm] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [editing, setEditing] = useState<string | null>(null);
  const [collection, setCollection] = useState<string | null>(null);
  const items = data.bookmarks;
  const counts = new Map<Kind, number>([['all', items.length]]);
  for (const b of items) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  const collections = new Map<string, number>();
  for (const b of items)
    for (const t of b.tags ?? []) collections.set(t, (collections.get(t) ?? 0) + 1);
  const names = [...collections.keys()].sort((a, b) => a.localeCompare(b));
  const active = collection && collections.has(collection) ? collection : null;
  const needle = fold(term.trim());
  const shown = items
    .filter((b) => kind === 'all' || b.kind === kind)
    .filter((b) => !active || (b.tags ?? []).includes(active))
    .filter(
      (b) =>
        !needle ||
        [b.label, b.path, b.note ?? '', destinationOf(b.path), ...(b.tags ?? [])].some(
          (f) => fold(f).includes(needle),
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
  const retag = (from: string, to: string | null, message: string) => {
    onSave(
      {
        version: 1,
        bookmarks: items.map((b) =>
          (b.tags ?? []).includes(from)
            ? withFields(b, {
                tags: [
                  ...new Set(
                    (b.tags ?? []).flatMap((t) =>
                      t === from ? (to ? [to] : []) : [t],
                    ),
                  ),
                ],
              })
            : b,
        ),
      },
      message,
    );
    setCollection(to);
  };
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
            placeholder="Name, note, collection or destination"
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
      {names.length ? (
        <div className="savedboard__collections" role="group" aria-label="Collections">
          <button
            type="button"
            className="chip"
            aria-pressed={!active}
            onClick={() => setCollection(null)}
          >
            Every collection
          </button>
          {names.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              aria-pressed={active === name}
              onClick={() => setCollection(active === name ? null : name)}
            >
              {name} <span className="savedboard__n">{collections.get(name)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {active ? (
        <CollectionTools
          key={active}
          name={active}
          size={collections.get(active)!}
          taken={names}
          onRename={(to) =>
            retag(active, to, `Collection “${active}” renamed to “${to}”.`)
          }
          onDissolve={() =>
            retag(
              active,
              null,
              `Collection “${active}” dissolved; its items are still saved.`,
            )
          }
          onExport={
            onExport
              ? () =>
                  onExport(
                    {
                      version: 1,
                      bookmarks: items.filter((b) => (b.tags ?? []).includes(active)),
                    },
                    active,
                  )
              : undefined
          }
        />
      ) : null}
      <p className="savedboard__count">
        Showing {shown.length} of {items.length}
        {active ? ` in “${active}”` : ''}
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
                    onDone={(label, note, tags) => {
                      setEditing(null);
                      replace(
                        item,
                        withFields(item, { label, note, tags }),
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
                    {item.tags?.length ? (
                      <span className="savedcard__tags">
                        {item.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="reset savedcard__tag"
                            aria-label={`Show the ${t} collection`}
                            onClick={() => setCollection(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </span>
                    ) : null}
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

function CollectionTools({
  name,
  size,
  taken,
  onRename,
  onDissolve,
  onExport,
}: {
  name: string;
  size: number;
  taken: readonly string[];
  onRename: (to: string) => void;
  onDissolve: () => void;
  onExport: (() => void) | undefined;
}) {
  const [draft, setDraft] = useState(name);
  const [confirm, setConfirm] = useState(false);
  const parsed = parseTags(draft);
  const next = parsed.tags?.length === 1 ? parsed.tags[0]! : null;
  const error =
    parsed.error ??
    (parsed.tags.length !== 1
      ? 'Give the collection one name.'
      : next !== name && taken.includes(next!)
        ? `“${next}” already exists; dissolve one collection first.`
        : null);
  return (
    <section className="savedboard__tools" aria-label={`Collection ${name}`}>
      <h3>
        {name} <span className="savedboard__n">{size} saved</span>
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!error && next && next !== name) onRename(next);
        }}
      >
        <label>
          Rename collection
          <input
            value={draft}
            maxLength={24}
            onChange={(e) => setDraft(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        <button
          type="submit"
          className="btn btn--sm"
          disabled={Boolean(error) || next === name}
        >
          Rename
        </button>
      </form>
      {error && draft.trim() !== name ? <p role="alert">{error}</p> : null}
      <span className="savedcard__actions">
        {onExport ? (
          <button type="button" className="btn btn--sm btn--quiet" onClick={onExport}>
            Export this collection
          </button>
        ) : null}
        {confirm ? (
          <>
            <button type="button" className="btn btn--sm" onClick={onDissolve}>
              Confirm dissolve
            </button>
            <button
              type="button"
              className="btn btn--sm btn--quiet"
              onClick={() => setConfirm(false)}
            >
              Keep collection
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--sm btn--quiet"
            onClick={() => setConfirm(true)}
          >
            Dissolve collection
          </button>
        )}
      </span>
    </section>
  );
}

function EditForm({
  item,
  onCancel,
  onDone,
}: {
  item: ResearchBookmark;
  onCancel: () => void;
  onDone: (label: string, note: string, tags: string[]) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [note, setNote] = useState(item.note ?? '');
  const [tags, setTags] = useState((item.tags ?? []).join(', '));
  const parsed = parseTags(tags);
  return (
    <form
      className="savedcard__edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() && parsed.tags) onDone(label.trim(), note.trim(), parsed.tags);
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
      <label>
        Collections
        <input
          value={tags}
          maxLength={200}
          placeholder="e.g. playoff scorers, bigs"
          aria-invalid={Boolean(parsed.error)}
          onChange={(e) => setTags(e.target.value)}
        />
      </label>
      {parsed.error ? <p role="alert">{parsed.error}</p> : null}
      <span className="savedcard__actions">
        <button type="submit" className="btn btn--sm" disabled={Boolean(parsed.error)}>
          Save changes
        </button>
        <button type="button" className="btn btn--sm btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </span>
    </form>
  );
}
