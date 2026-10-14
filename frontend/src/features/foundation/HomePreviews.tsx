import {
  ArchiveGamesResponseSchema,
  ArchiveLeagueResponseSchema,
  ShotResponseSchema,
} from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Court } from '../../charts/Court';
import { Reveal } from '../../motion/choreography';
import { Icon } from '../../ui/Icon';
import { Tape, type TapeSpec } from '../../ui/Tape';
import { fetchResearch } from '../research/api';

// Home previews read the same genuine archives their destination pages use (and share their
// query keys, so the data is already in the cache when the reader follows the link). While a
// preview loads it shows a still frame; if its archive is unavailable it says so plainly.

const WIKI: TapeSpec = {
  code: '23–24',
  source: 'Wikipedia · CC BY-SA',
  variant: 'archive',
};
const SHOTS: TapeSpec = { code: '18 PO', source: 'Kaggle · CC0', variant: 'partial' };

function PreviewCard({
  to,
  title,
  eyebrow,
  tape,
  children,
  cta,
}: {
  to: string;
  title: string;
  eyebrow: string;
  tape: TapeSpec;
  children: ReactNode;
  cta: string;
}) {
  return (
    <article className="preview">
      <div className="preview__head">
        <span className="t-eyebrow">{eyebrow}</span>
        <Tape {...tape} />
      </div>
      <h3 className="preview__title">{title}</h3>
      <div className="preview__body">{children}</div>
      <Link to={to} className="link-arrow preview__cta">
        {cta}
        <Icon name="arrowRight" size={15} />
      </Link>
    </article>
  );
}

function Still({ label }: { label: string }) {
  return (
    <div className="preview__still" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}

function Unavailable() {
  return <p className="preview__off">This archive is not reachable right now.</p>;
}

function ShotPreview() {
  const query = useQuery({
    queryKey: ['research', 'shot-events', 'players=201939'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/shots?players=201939', signal, ShotResponseSchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const shots = query.data?.shots.filter(
    (shot) => shot.x !== null && shot.y !== null && shot.y <= 417.5,
  );
  const group = query.data?.groups[0];
  return (
    <PreviewCard
      to="/lab/shots?players=201939"
      eyebrow="Shot Studio"
      title="Stephen Curry, 2018 playoffs"
      tape={SHOTS}
      cta="Open the shot chart"
    >
      {query.isPending ? (
        <Still label="Court" />
      ) : query.isError || !shots ? (
        <Unavailable />
      ) : (
        <>
          <Court side="bottom" className="preview__court">
            {(projection) =>
              shots.map((shot) => {
                const [x, y] = projection.point(shot.x as number, shot.y as number);
                return shot.made ? (
                  <circle
                    key={shot.id}
                    cx={x}
                    cy={y}
                    r={4.5}
                    fill="#f4f3f1"
                    stroke="#0a0a0b"
                    strokeWidth={1}
                    className="shot-mark"
                  />
                ) : (
                  <path
                    key={shot.id}
                    d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x - 4} ${y + 4}L${x + 4} ${y - 4}`}
                    stroke="#ef4444"
                    strokeWidth={2}
                    className="shot-mark"
                  />
                );
              })
            }
          </Court>
          {group ? (
            <p className="preview__fact">
              <b>{group.attempts}</b> recorded attempts ·{' '}
              <b>
                {group.fgPercentage === null
                  ? '—'
                  : `${(group.fgPercentage * 100).toFixed(1)}%`}
              </b>{' '}
              FG · first table page drawn
            </p>
          ) : null}
        </>
      )}
    </PreviewCard>
  );
}

function StandingsPreview() {
  const query = useQuery({
    queryKey: ['research', 'league-archive'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/standings?season=2023-24',
        signal,
        ArchiveLeagueResponseSchema.parse,
      ),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <PreviewCard
      to="/standings"
      eyebrow="Seasons"
      title="2023–24 conference leaders"
      tape={WIKI}
      cta="Open the standings"
    >
      {query.isPending ? (
        <Still label="Standings" />
      ) : query.isError || !query.data ? (
        <Unavailable />
      ) : (
        <div className="preview__ladders">
          {(['East', 'West'] as const).map((conference) => (
            <ol
              key={conference}
              className="preview__ladder"
              aria-label={`${conference} top four`}
            >
              {query.data.standings
                .filter((row) => row.conference === conference)
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 4)
                .map((row) => (
                  <li key={row.team.id}>
                    <span>{row.rank}</span>
                    <b>{row.team.abbreviation}</b>
                    <em className="num">
                      {row.wins}–{row.losses}
                    </em>
                  </li>
                ))}
            </ol>
          ))}
        </div>
      )}
    </PreviewCard>
  );
}

function FinalPreview() {
  const query = useQuery({
    queryKey: ['research', 'games-archive', 'all'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/games?season=2023-24',
        signal,
        ArchiveGamesResponseSchema.parse,
      ),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const last = query.data?.games
    .filter((game) => game.date === query.data?.lastDate)
    .at(-1);
  return (
    <PreviewCard
      to={last ? `/games/${last.id}` : '/games'}
      eyebrow="Games"
      title="Last recorded playoff final"
      tape={WIKI}
      cta="Open the game"
    >
      {query.isPending ? (
        <Still label="Final" />
      ) : query.isError || !last ? (
        <Unavailable />
      ) : (
        <div className="preview__score">
          <span className="preview__final">Final · {last.date}</span>
          {(['away', 'home'] as const).map((side) => {
            const score = side === 'away' ? last.awayScore : last.homeScore;
            const other = side === 'away' ? last.homeScore : last.awayScore;
            return (
              <span
                key={side}
                className={`preview__side ${score > other ? 'is-won' : ''}`}
              >
                <b>{last[side].abbreviation}</b>
                <em className="num">{score}</em>
              </span>
            );
          })}
        </div>
      )}
    </PreviewCard>
  );
}

export function HomePreviews() {
  return (
    <div className="previews">
      <Reveal variant="rise">
        <ShotPreview />
      </Reveal>
      <Reveal variant="rise" delay={0.08}>
        <StandingsPreview />
      </Reveal>
      <Reveal variant="rise" delay={0.16}>
        <FinalPreview />
      </Reveal>
    </div>
  );
}
