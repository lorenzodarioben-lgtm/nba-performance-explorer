import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  MAX_STORIES,
  MAX_STORIES_JSON_CHARS,
} from '@nba-performance-explorer/contracts';

import { ResearchShell } from '../research/ResearchShell';
import { Slate } from '../../ui/Slate';
import { parseStoriesJson, storyRepository } from './story-store';
import { STARTERS, useStories } from './use-stories';

export function StoriesPage() {
  const { data, warning } = useStories();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const create = (name: string, starter?: (typeof STARTERS)[number]) => {
    try {
      const story = storyRepository.create(name, starter?.sections() ?? []);
      if (starter)
        storyRepository.update(story.id, (s) => ({ ...s, dek: starter.dek }));
      navigate(`/my-nba/stories/${story.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not create the story.',
      );
    }
  };
  return (
    <ResearchShell
      title="Statistical stories"
      lede={
        <p>
          Bring your findings together: your own words between linked analyses from the
          film room, comparison studio, similarity finder, workbench, Shot Studio and
          team seasons. Every chart is re-read from the tool when the story opens.
          Stories stay in this browser; nothing is uploaded.
        </p>
      }
    >
      <nav className="intel-links" aria-label="My NBA">
        <Link to="/my-nba">Saved research and collections</Link>
      </nav>
      {warning ? <p role="status">{warning}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <section className="pmod" aria-labelledby="story-new">
        <Slate
          id="story-new"
          title="Start a story"
          meta={[`${data.stories.length} of ${MAX_STORIES}`]}
        />
        <form
          className="story-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create(title.trim());
          }}
        >
          <label>
            Story title
            <input
              value={title}
              maxLength={120}
              placeholder="e.g. How Denver's bigs shaped 2023–24"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button type="submit" className="btn" disabled={!title.trim()}>
            Create story
          </button>
        </form>
        <h3 className="fr-sub">Or start from an example</h3>
        <ul className="story-starters">
          {STARTERS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                className="reset story-starter"
                onClick={() => create(s.title, s)}
              >
                <b>{s.title}</b>
                <span>{s.dek}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="pmod" aria-labelledby="story-list">
        <Slate id="story-list" title="Your stories" />
        {data.stories.length ? (
          <ul className="story-list">
            {data.stories.map((s) => (
              <li key={s.id} className="story-card">
                <Link to={`/my-nba/stories/${s.id}`} className="story-card__title">
                  {s.title}
                </Link>
                {s.dek ? <p className="story-card__dek">{s.dek}</p> : null}
                <span className="story-card__meta">
                  {s.sections.length} sections · updated{' '}
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
                <span className="savedcard__actions">
                  <Link
                    className="btn btn--sm btn--quiet"
                    to={`/my-nba/stories/${s.id}/read`}
                  >
                    Read
                  </Link>
                  <button
                    type="button"
                    className="btn btn--sm btn--quiet"
                    aria-label={`Duplicate ${s.title}`}
                    onClick={() => {
                      try {
                        storyRepository.duplicate(s.id);
                        setMessage(`Duplicated “${s.title}”.`);
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : 'Could not duplicate.',
                        );
                      }
                    }}
                  >
                    Duplicate
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="savedboard__empty">No stories yet. Start one above.</p>
        )}
      </section>
      <section className="pmod" aria-labelledby="story-io">
        <Slate id="story-io" title="Import and export" />
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setExportText(JSON.stringify(data, null, 2));
            setMessage('Export prepared. Copy the JSON below to a file.');
          }}
        >
          Export all stories JSON
        </button>
        {exportText ? (
          <label>
            Exported stories JSON
            <textarea
              readOnly
              rows={6}
              value={exportText}
              onFocus={(e) => e.target.select()}
            />
          </label>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const file = parseStoriesJson(importText);
              const result = storyRepository.importFile(file);
              setMessage(
                result.warning ??
                  `Imported ${file.stories.length} ${file.stories.length === 1 ? 'story' : 'stories'}; your existing stories are unchanged.`,
              );
              setImportText('');
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? `Import rejected. ${error.message}`
                  : 'Import rejected; your stories are unchanged.',
              );
            }
          }}
        >
          <label>
            Import stories JSON
            <textarea
              rows={5}
              value={importText}
              maxLength={MAX_STORIES_JSON_CHARS}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--sm" disabled={!importText.trim()}>
            Import and keep existing stories
          </button>
        </form>
      </section>
    </ResearchShell>
  );
}
