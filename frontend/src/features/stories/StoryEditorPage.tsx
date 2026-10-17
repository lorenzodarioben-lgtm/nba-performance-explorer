import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  InternalResearchPathSchema,
  MAX_STORY_SECTIONS,
  StorySchema,
  type Story,
  type StorySection,
} from '@nba-performance-explorer/contracts';

import { ResearchShell } from '../research/ResearchShell';
import { researchRepository } from '../my-nba/local-research';
import { Slate } from '../../ui/Slate';
import { encodeShare, newId, storyRepository } from './story-store';
import { embedPlan } from './embed-plan';
import { StoryEmbed } from './StoryEmbed';
import { useStories } from './use-stories';

export function StoryEditorPage() {
  const { storyId = '' } = useParams();
  const { data, warning } = useStories();
  const story = data.stories.find((s) => s.id === storyId) ?? null;
  if (!story)
    return (
      <ResearchShell title="Story not found">
        <p role="alert">
          No story with this link is saved in this browser. Stories are local to the
          device; import the story&rsquo;s JSON or open its share link.{' '}
          <Link to="/my-nba/stories">All stories</Link>.
        </p>
      </ResearchShell>
    );
  return <Editor key={story.id} story={story} warning={warning} />;
}

function Editor({ story, warning }: { story: Story; warning: string | null }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [share, setShare] = useState<string | null>(null);
  const moveRefs = useRef(new Map<string, HTMLButtonElement | null>());
  /** Every edit goes through the contract; an invalid draft is reported, never stored. */
  const commit = (change: (s: Story) => Story, note?: string) => {
    const next = change(story);
    const check = StorySchema.safeParse({
      ...next,
      updatedAt: new Date().toISOString(),
    });
    if (!check.success) {
      setMessage(check.error.issues[0]?.message ?? 'That change is not valid.');
      return false;
    }
    try {
      storyRepository.update(story.id, () => next);
      if (note) setMessage(note);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save.');
      return false;
    }
  };
  const setSection = (id: string, patch: Partial<StorySection>) =>
    commit((s) => ({
      ...s,
      sections: s.sections.map((x) =>
        x.id === id ? ({ ...x, ...patch } as StorySection) : x,
      ),
    }));
  const move = (index: number, by: -1 | 1) => {
    const id = story.sections[index]!.id;
    commit(
      (s) => {
        const sections = [...s.sections];
        [sections[index], sections[index + by]] = [
          sections[index + by]!,
          sections[index]!,
        ];
        return { ...s, sections };
      },
      `Moved section ${index + 1} ${by < 0 ? 'up' : 'down'}.`,
    );
    // Keep the keyboard on the section that moved.
    requestAnimationFrame(
      () =>
        moveRefs.current.get(`${id}:${by < 0 ? 'up' : 'down'}`)?.focus() ??
        moveRefs.current.get(`${id}:${by < 0 ? 'down' : 'up'}`)?.focus(),
    );
  };
  const full = story.sections.length >= MAX_STORY_SECTIONS;
  return (
    <ResearchShell title={story.title || 'Untitled story'}>
      <nav className="intel-links" aria-label="Story">
        <Link to="/my-nba/stories">All stories</Link>
        <Link to={`/my-nba/stories/${story.id}/read`}>Read and print</Link>
      </nav>
      {warning ? <p role="status">{warning}</p> : null}
      <p role="status" className="story-status">
        {message || 'Changes save automatically in this browser.'}
      </p>
      <section className="pmod story-meta" aria-labelledby="story-meta">
        <Slate id="story-meta" title="Title and summary" />
        <TitleField story={story} onCommit={commit} />
        <label>
          One-line summary
          <textarea
            rows={2}
            maxLength={300}
            value={story.dek}
            onChange={(e) => commit((s) => ({ ...s, dek: e.target.value }))}
          />
        </label>
      </section>
      <section className="pmod" aria-labelledby="story-sections">
        <Slate
          id="story-sections"
          title="Sections"
          meta={[`${story.sections.length} of ${MAX_STORY_SECTIONS}`]}
        />
        {story.sections.length ? null : (
          <p className="savedboard__empty">
            No sections yet: add your own text or a saved analysis below.
          </p>
        )}
        <ol className="story-sections">
          {story.sections.map((section, i) => (
            <li key={section.id} className="story-section" data-kind={section.kind}>
              <div className="story-section__bar">
                <span className="story-section__no">
                  {i + 1} ·{' '}
                  {section.kind === 'text' ? 'Text' : embedPlan(section.path).tool}
                </span>
                <span className="savedcard__actions">
                  <button
                    ref={(n) => {
                      moveRefs.current.set(`${section.id}:up`, n);
                    }}
                    type="button"
                    className="btn btn--sm btn--quiet"
                    disabled={i === 0}
                    aria-label={`Move section ${i + 1} up`}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    ref={(n) => {
                      moveRefs.current.set(`${section.id}:down`, n);
                    }}
                    type="button"
                    className="btn btn--sm btn--quiet"
                    disabled={i === story.sections.length - 1}
                    aria-label={`Move section ${i + 1} down`}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--quiet"
                    aria-label={`Remove section ${i + 1}`}
                    onClick={() =>
                      commit(
                        (s) => ({
                          ...s,
                          sections: s.sections.filter((x) => x.id !== section.id),
                        }),
                        `Section ${i + 1} removed.`,
                      )
                    }
                  >
                    Remove
                  </button>
                </span>
              </div>
              {section.kind === 'text' ? (
                <>
                  <label>
                    Heading (section {i + 1})
                    <input
                      value={section.heading}
                      maxLength={120}
                      onChange={(e) =>
                        setSection(section.id, { heading: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Text (section {i + 1})
                    <textarea
                      rows={5}
                      maxLength={4000}
                      value={section.body}
                      placeholder="What you noticed, what it does and does not show…"
                      onChange={(e) => setSection(section.id, { body: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Analysis title (section {i + 1})
                    <input
                      value={section.title}
                      maxLength={120}
                      onChange={(e) =>
                        setSection(section.id, { title: e.target.value })
                      }
                    />
                  </label>
                  <StoryEmbed path={section.path} />
                  <label>
                    Your note (section {i + 1})
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={section.note}
                      placeholder="Why this analysis belongs in the story…"
                      onChange={(e) => setSection(section.id, { note: e.target.value })}
                    />
                  </label>
                </>
              )}
            </li>
          ))}
        </ol>
        <AddSection
          disabled={full}
          onAdd={(section) =>
            commit(
              (s) => ({ ...s, sections: [...s.sections, section] }),
              `Added section ${story.sections.length + 1}.`,
            )
          }
        />
      </section>
      <section className="pmod" aria-labelledby="story-share">
        <Slate id="story-share" title="Share, copy or delete" />
        <span className="savedcard__actions">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              const fragment = encodeShare(story);
              if (!fragment) {
                setShare(null);
                setMessage(
                  'This story is too long for a link. Export it as JSON from All stories.',
                );
                return;
              }
              setShare(`${window.location.origin}/my-nba/stories/shared#s=${fragment}`);
              setMessage(
                'Share link ready. It carries the story text and links only, never data.',
              );
            }}
          >
            Make a share link
          </button>
          <button
            type="button"
            className="btn btn--sm btn--quiet"
            onClick={() => {
              try {
                const copy = storyRepository.duplicate(story.id);
                navigate(`/my-nba/stories/${copy.id}`);
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : 'Could not duplicate.',
                );
              }
            }}
          >
            Duplicate story
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  storyRepository.remove(story.id);
                  navigate('/my-nba/stories');
                }}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="btn btn--sm btn--quiet"
                onClick={() => setConfirmDelete(false)}
              >
                Keep story
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--sm btn--quiet"
              onClick={() => setConfirmDelete(true)}
            >
              Delete story
            </button>
          )}
        </span>
        {confirmDelete ? (
          <p role="alert">
            Delete “{story.title}” from this browser? This cannot be undone.
          </p>
        ) : null}
        {share ? (
          <label>
            Share link
            <input readOnly value={share} onFocus={(e) => e.target.select()} />
          </label>
        ) : null}
      </section>
    </ResearchShell>
  );
}

function TitleField({
  story,
  onCommit,
}: {
  story: Story;
  onCommit: (change: (s: Story) => Story) => boolean;
}) {
  // A local draft so the field can be empty while typing; only a valid title is stored.
  const [draft, setDraft] = useState(story.title);
  return (
    <label>
      Story title
      <input
        value={draft}
        maxLength={120}
        aria-invalid={!draft.trim()}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value.trim()) onCommit((s) => ({ ...s, title: e.target.value }));
        }}
      />
      {!draft.trim() ? (
        <span role="alert">A story needs a title; the last one is kept.</span>
      ) : null}
    </label>
  );
}

function AddSection({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (section: StorySection) => void;
}) {
  const saved = researchRepository.load().data.bookmarks;
  const [choice, setChoice] = useState('');
  const [path, setPath] = useState('');
  const pathCheck = InternalResearchPathSchema.safeParse(path.trim());
  const addAnalysis = (p: string, title: string) =>
    onAdd({
      id: newId(),
      kind: 'analysis',
      title: title.slice(0, 120),
      path: p,
      note: '',
    });
  return (
    <div className="story-add">
      <button
        type="button"
        className="btn btn--sm"
        disabled={disabled}
        onClick={() => onAdd({ id: newId(), kind: 'text', heading: '', body: '' })}
      >
        Add a text section
      </button>
      <div className="story-add__row">
        <label>
          Add a saved analysis
          <select
            value={choice}
            disabled={disabled || !saved.length}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">
              {saved.length ? 'Choose from My NBA…' : 'Nothing saved yet in My NBA'}
            </option>
            {saved.map((b) => (
              <option key={`${b.kind}:${b.path}`} value={`${b.kind}:${b.path}`}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={disabled || !choice}
          onClick={() => {
            const b = saved.find((x) => `${x.kind}:${x.path}` === choice);
            if (b) addAnalysis(b.path, b.label);
            setChoice('');
          }}
        >
          Add analysis
        </button>
      </div>
      <div className="story-add__row">
        <label>
          Or paste an internal link
          <input
            value={path}
            maxLength={1500}
            placeholder="/games/series/r4-BOS-DAL"
            aria-invalid={Boolean(path.trim()) && !pathCheck.success}
            onChange={(e) => setPath(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={disabled || !pathCheck.success}
          onClick={() => {
            addAnalysis(path.trim(), embedPlan(path.trim()).tool);
            setPath('');
          }}
        >
          Add link
        </button>
      </div>
      {path.trim() && !pathCheck.success ? (
        <p role="alert">
          Use a link to one of this site&rsquo;s research pages, starting with /.
        </p>
      ) : null}
      <p className="fr-note">
        Use &ldquo;Save to My NBA&rdquo; on any tool to make it available here.
      </p>
    </div>
  );
}
