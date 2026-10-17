import type { HistoryResponse } from '@nba-performance-explorer/contracts';
import { motion } from 'motion/react';
import { Link } from 'react-router';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../ui/Icon';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';

type Season = HistoryResponse['seasons'][number];

const startYear = (season: string) => Number(season.slice(0, 4));

/**
 * The season index as a timeline: one row per decade, one cell per recorded season with its
 * champion statement (or a dash where the source has none). Cells link to each season's page.
 */
export function SeasonTimeline({
  seasons,
  current,
}: {
  seasons: readonly Season[];
  current?: string | undefined;
}) {
  const [selection, setSelection] = useState<number | null>(null);
  const rail = useRef<HTMLElement>(null);
  const byDecade = new Map<number, Season[]>();
  for (const season of seasons) {
    const decade = Math.floor(startYear(season.season) / 10) * 10;
    const records = byDecade.get(decade) ?? [];
    records.push(season);
    byDecade.set(decade, records);
  }
  const decades = [...byDecade.keys()].sort((a, b) => a - b);
  // Start with the most recent complete decade in this response, otherwise the
  // first available chapter. This changes only the view, never the query/data.
  const initial =
    [...decades].reverse().find((decade) => byDecade.get(decade)!.length === 10) ??
    decades[0];
  const active = selection !== null && byDecade.has(selection) ? selection : initial;
  useEffect(() => {
    const nav = rail.current;
    const button = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (nav && button)
      nav.scrollLeft = Math.max(
        0,
        button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2,
      );
  }, [active]);
  if (active === undefined) return null;
  const records = [...byDecade.get(active)!].sort(
    (a, b) => startYear(a.season) - startYear(b.season),
  );
  const index = decades.indexOf(active);
  return (
    <div className="timeline" data-chart="season-timeline">
      <nav ref={rail} className="timeline__nav" aria-label="Explore decades">
        {decades.map((decade) => (
          <button
            key={decade}
            type="button"
            aria-pressed={active === decade}
            aria-label={`${decade}s · ${byDecade.get(decade)!.length} ${byDecade.get(decade)!.length === 1 ? 'season' : 'seasons'}`}
            onClick={() => setSelection(decade)}
          >
            <span>{decade}s</span>
            <small>
              {byDecade.get(decade)!.length}{' '}
              {byDecade.get(decade)!.length === 1 ? 'season' : 'seasons'}
            </small>
          </button>
        ))}
      </nav>
      <section className="timeline__chapter" aria-labelledby="timeline-chapter">
        <div className="timeline__decade">
          <h3 id="timeline-chapter" aria-live="polite">
            {active}
            <span>s</span>
          </h3>
          <p>
            {records[0]!.season.replace('-', '–')} –{' '}
            {records.at(-1)!.season.replace('-', '–')}
          </p>
          <div className="timeline__arrows">
            <button
              type="button"
              aria-label="Previous decade"
              disabled={index === 0}
              onClick={() => setSelection(decades[index - 1]!)}
            >
              <Icon name="arrowLeft" size={20} />
            </button>
            <button
              type="button"
              aria-label="Next decade"
              disabled={index === decades.length - 1}
              onClick={() => setSelection(decades[index + 1]!)}
            >
              <Icon name="arrowRight" size={20} />
            </button>
          </div>
          <p className="timeline__note">
            Open a season to examine its recorded champion statements.
          </p>
        </div>
        <ol
          className="timeline__cells"
          style={{ '--chapter-rows': Math.ceil(records.length / 2) } as CSSProperties}
        >
          {records.map((season) => {
            const champion = season.winners.map((w) => w.label ?? w.id).join(' / ');
            return (
              <li key={season.id}>
                <Link
                  to={`/history/${season.season}`}
                  className={`timeline__cell ${current === season.season ? 'is-on' : ''} ${champion ? '' : 'is-empty'}`}
                  aria-label={`${season.season} season: ${champion || 'champion unavailable in source'}`}
                  aria-current={current === season.season ? 'page' : undefined}
                >
                  <span className="timeline__year">
                    {season.season.replace('-', '–')}
                  </span>
                  <span className="timeline__champ">
                    {champion || 'Champion unavailable'}
                  </span>
                  <Icon name="arrowUpRight" size={17} />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** A season page opener: the season in giant type and its champion statements. */
export function SeasonHero({ season }: { season: Season }) {
  const allowed = useMotionAllowed();
  return (
    <section className="seasonhero" aria-label={`${season.season} season summary`}>
      <motion.span
        className="seasonhero__year"
        aria-hidden="true"
        initial={allowed ? { opacity: 0, y: 30 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: easings.arena }}
      >
        {season.season.replace('-', '–')}
      </motion.span>
      <div className="seasonhero__champ">
        <span className="t-eyebrow">Champion statement</span>
        <b>
          {season.winners.length
            ? season.winners.map((w) => w.label ?? w.id).join(' / ')
            : 'Unavailable in source'}
        </b>
        <span className="t-meta">Wikidata · CC0 · labels may use modern names</span>
      </div>
    </section>
  );
}
