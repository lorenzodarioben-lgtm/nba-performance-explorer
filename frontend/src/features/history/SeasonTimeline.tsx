import type { HistoryResponse } from '@nba-performance-explorer/contracts';
import { motion } from 'motion/react';
import { Link } from 'react-router';

import { Stagger, StaggerItem } from '../../motion/choreography';
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
  const byDecade = new Map<number, Season[]>();
  for (const season of seasons) {
    const decade = Math.floor(startYear(season.season) / 10) * 10;
    byDecade.set(decade, [...(byDecade.get(decade) ?? []), season]);
  }
  const decades = [...byDecade.keys()].sort((a, b) => a - b);
  return (
    <Stagger className="timeline" data-chart="season-timeline" gap={0.05}>
      {decades.map((decade) => (
        <StaggerItem key={decade} className="timeline__decade">
          <span className="timeline__label">{decade}s</span>
          <ol className="timeline__cells">
            {(byDecade.get(decade) ?? [])
              .sort((a, b) => startYear(a.season) - startYear(b.season))
              .map((season) => {
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
                      <span className="timeline__champ">{champion || '—'}</span>
                    </Link>
                  </li>
                );
              })}
          </ol>
        </StaggerItem>
      ))}
    </Stagger>
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
