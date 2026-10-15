import { useId, useState } from 'react';
import { Link } from 'react-router';

import { researchRepository } from './local-research';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';

/**
 * Named views of one research tool: the current URL state saved under a reader's own name in
 * the browser's local My NBA store (never uploaded), listed here to reopen or delete.
 */
export function SavedViews({
  path,
  prefix,
  title,
  placeholder,
}: {
  /** The exact internal path of the current view. */
  path: string;
  /** The tool's route; saved views are the bookmarks under it. */
  prefix: string;
  title: string;
  placeholder: string;
}) {
  const headingId = useId();
  const [version, setVersion] = useState(0);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const toast = useToast();
  const { data, warning } = researchRepository.load();
  const views = data.bookmarks.filter(
    (b) => b.path === prefix || b.path.startsWith(`${prefix}?`),
  );
  const current = views.find((v) => v.path === path);
  const save = () => {
    const label = name.trim();
    if (!label) {
      setMessage('Name the view first.');
      return;
    }
    try {
      const result = researchRepository.add({
        kind: 'analysis',
        label: label.slice(0, 100),
        path,
        createdAt: new Date().toISOString(),
      });
      setMessage(result.warning ?? `Saved “${label}” on this device.`);
      if (!result.warning) toast('View saved to My NBA');
      setName('');
      setVersion((v) => v + 1);
    } catch {
      setMessage(
        'Could not save: this exact view is already saved, or the limit is reached.',
      );
    }
  };
  const remove = (target: string) => {
    researchRepository.save({
      ...data,
      bookmarks: data.bookmarks.filter(
        (b) => b.path !== target || b.kind !== 'analysis',
      ),
    });
    setMessage('View deleted.');
    setVersion((v) => v + 1);
  };
  return (
    <section className="studioviews" aria-labelledby={headingId} data-version={version}>
      <h2 id={headingId} className="studioviews__title">
        {title}
      </h2>
      <form
        className="studioviews__form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label>
          Name this view
          <input
            value={name}
            maxLength={100}
            placeholder={current ? `Saved as “${current.label}”` : placeholder}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--sm" disabled={Boolean(current)}>
          <Icon name="star" size={14} />
          {current ? 'Already saved' : 'Save view'}
        </button>
      </form>
      <p role="status" aria-live="polite" className="studioviews__msg">
        {message || warning || ''}
      </p>
      {views.length ? (
        <ul className="studioviews__list">
          {views.map((view) => (
            <li
              key={view.path}
              className={view.path === path ? 'is-current' : undefined}
            >
              <Link to={view.path}>{view.label}</Link>
              <span>{new Date(view.createdAt).toLocaleDateString()}</span>
              <button
                type="button"
                className="btn btn--sm btn--quiet"
                aria-label={`Delete saved view ${view.label}`}
                onClick={() => remove(view.path)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="studioviews__empty">
          No saved views yet. Saved views live only in this browser and also appear in
          My NBA.
        </p>
      )}
    </section>
  );
}
