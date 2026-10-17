import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import type { Story } from '@nba-performance-explorer/contracts';

import { ResearchShell } from '../research/ResearchShell';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { decodeShare, storyRepository } from './story-store';
import { embedPlan } from './embed-plan';
import { StoryEmbed } from './StoryEmbed';
import { useStories } from './use-stories';

/** Reader-authored text, shown as plain paragraphs (never parsed as markup). */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

export function StoryReaderPage() {
  const { storyId = '' } = useParams();
  const { data } = useStories();
  const story = data.stories.find((s) => s.id === storyId) ?? null;
  if (!story)
    return (
      <ResearchShell title="Story not found">
        <p role="alert">
          No story with this link is saved in this browser.{' '}
          <Link to="/my-nba/stories">All stories</Link>.
        </p>
      </ResearchShell>
    );
  return (
    <ResearchShell title={story.title}>
      <nav className="intel-links story-noprint" aria-label="Story">
        <Link to={`/my-nba/stories/${story.id}`}>Edit this story</Link>
        <Link to="/my-nba/stories">All stories</Link>
      </nav>
      <StoryBody story={story} />
    </ResearchShell>
  );
}

export function SharedStoryPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  let story: Story | null = null;
  let error: string | null = null;
  try {
    if (!hash.startsWith('#s=')) throw new Error('This page needs a story share link.');
    story = decodeShare(hash.slice(3));
  } catch (e) {
    error = e instanceof Error ? e.message : 'This story link could not be read.';
  }
  if (!story)
    return (
      <ResearchShell title="Shared story">
        <p role="alert">
          {error} <Link to="/my-nba/stories">Your stories</Link>.
        </p>
      </ResearchShell>
    );
  const shared = story;
  return (
    <ResearchShell title={shared.title}>
      <div className="story-shared story-noprint" role="note">
        <p>
          A story shared by link. It is not saved in this browser until you keep a copy;
          its analyses are read live from this site.
        </p>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            try {
              const copy = storyRepository.create(shared.title, shared.sections);
              storyRepository.update(copy.id, (s) => ({ ...s, dek: shared.dek }));
              navigate(`/my-nba/stories/${copy.id}`);
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Could not save a copy.');
            }
          }}
        >
          Save a copy to My NBA
        </button>
        {message ? <p role="status">{message}</p> : null}
      </div>
      <StoryBody story={shared} />
    </ResearchShell>
  );
}

function StoryBody({ story }: { story: Story }) {
  const tools = [
    ...new Set(
      story.sections.flatMap((s) =>
        s.kind === 'analysis' ? [embedPlan(s.path).tool] : [],
      ),
    ),
  ];
  return (
    <article className="story" aria-label={story.title}>
      <header className="story__head">
        <span className="story__kicker">
          A statistical story · NBA Performance Explorer
        </span>
        {story.dek ? <p className="story__dek">{story.dek}</p> : null}
        <span className="story__meta">
          Updated {new Date(story.updatedAt).toLocaleDateString()} ·{' '}
          {story.sections.length} sections
          <button
            type="button"
            className="btn btn--sm btn--quiet story-noprint"
            onClick={() => window.print()}
          >
            Print or save as PDF
          </button>
        </span>
      </header>
      <Stagger as="div" className="story__body" gap={0.06}>
        {story.sections.map((s, i) => (
          <StaggerItem as="section" key={s.id} className="story__section">
            <span className="story__chapter">{String(i + 1).padStart(2, '0')}</span>
            {s.kind === 'text' ? (
              <>
                {s.heading ? <h3 className="story__h">{s.heading}</h3> : null}
                <div className="story__prose">
                  <Paragraphs text={s.body} />
                </div>
              </>
            ) : (
              <>
                <h3 className="story__h">{s.title}</h3>
                {s.note ? (
                  <div className="story__prose">
                    <Paragraphs text={s.note} />
                  </div>
                ) : null}
                <StoryEmbed path={s.path} />
              </>
            )}
          </StaggerItem>
        ))}
      </Stagger>
      <footer className="story__sources">
        <h3 className="story__h">Data and scope</h3>
        <p>
          Every figure above is read live from{' '}
          {tools.length ? tools.join(', ') : 'this site'} when the story opens; the
          story stores only its text and links. Sources: recorded 2023–24 Wikipedia team
          pages and 2024 playoff tables (CC BY-SA 4.0), Wikidata identifiers (CC0), and
          a partial 2018 playoff shot archive (Kaggle, CC0) where shots appear.
          Historical records only; no live or complete league data.
        </p>
        <p className="story__url">{window.location.origin}</p>
      </footer>
    </article>
  );
}
