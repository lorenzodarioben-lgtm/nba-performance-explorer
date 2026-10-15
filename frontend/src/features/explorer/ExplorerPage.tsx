import {
  CapabilityResponseSchema,
  type CapabilityResponse,
} from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  KineticHeadline,
  Reveal,
  Stagger,
  StaggerItem,
} from '../../motion/choreography';
import { Icon } from '../../ui/Icon';
import { Tape, TAPE_MEANING, type TapeSpec, type TapeVariant } from '../../ui/Tape';
import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { fetchResearch } from '../research/api';
import { QueryFeedback } from '../research/ResearchShell';

// "What's on tape": the coverage page. It names every source the explorer is cut from, what
// each one covers and what it does not, and relays the service's own capability report as-is.

interface SourceTape {
  key: string;
  tape: TapeSpec;
  name: string;
  licence: string;
  covers: readonly string[];
  gaps: readonly string[];
  usedIn: readonly { to: string; label: string }[];
}

const SOURCES: readonly SourceTape[] = [
  {
    key: 'nba',
    tape: { code: 'NBA.com', source: 'Queried', variant: 'queried' },
    name: 'NBA.com, on request',
    licence: 'NBA.com · requested when a page opens',
    covers: [
      'Player directory and biographical facts',
      'Season statistics by season type',
      'Game logs with points, rebounds and assists',
    ],
    gaps: [
      'Fetched when you open a page; not a live feed',
      'No standings, shot locations or play-by-play from this tape',
    ],
    usedIn: [
      { to: '/players', label: 'Players' },
      { to: '/compare', label: 'Compare' },
      { to: '/discover', label: 'Discover' },
      { to: '/lab/analytics', label: 'Analytics' },
    ],
  },
  {
    key: 'wikipedia',
    tape: { code: '23–24', source: 'Wikipedia · CC BY-SA', variant: 'archive' },
    name: '2023–24 season archive',
    licence: 'CC BY-SA 4.0 · structured facts adapted from fixed article revisions',
    covers: [
      'League table and published category leaders',
      'Recorded 2024 playoff finals with period scores',
      'Thirty team-season pages: rosters, regular-season finals, participant summaries',
    ],
    gaps: [
      'No current season and no full player box scores',
      'Games where two sources disagree are quarantined, never guessed',
    ],
    usedIn: [
      { to: '/standings', label: 'Standings' },
      { to: '/leaders', label: 'Leaders' },
      { to: '/games', label: 'Games' },
      { to: '/teams', label: 'Teams' },
    ],
  },
  {
    key: 'wikidata',
    tape: { code: 'WD', source: 'Wikidata · CC0', variant: 'archive' },
    name: 'Season facts and identities',
    licence: 'CC0 · community-maintained statements',
    covers: [
      'Season and champion statements',
      'Exact identity links that join players across sources',
    ],
    gaps: [
      'Not an official complete archive; some statements are missing',
      'Some labels use modern team names',
    ],
    usedIn: [{ to: '/history', label: 'Seasons' }],
  },
  {
    key: 'shots',
    tape: { code: '18 PO', source: 'Kaggle · CC0', variant: 'partial' },
    name: '2018 playoff shots',
    licence: 'CC0 · Boon P, version 1',
    covers: [
      'Field-goal events with court coordinates reconciled to the basket',
      'Source shot zones, players and teams as recorded',
    ],
    gaps: [
      'Playoffs only; coverage ends June 3, before the playoffs finished',
      'Not a full-season or league-average sample',
    ],
    usedIn: [
      { to: '/lab/shots', label: 'Shot Studio' },
      { to: '/games/shooting', label: 'Game shooting' },
    ],
  },
  {
    key: 'lineups',
    tape: { code: '17–18', source: 'Dataverse · Etalab 2.0', variant: 'archive' },
    name: '2017–18 lineup study',
    licence: 'Etalab Open Licence 2.0 · Arnaud Odet',
    covers: [
      'Researcher-reconstructed five-player groups',
      'Shared minutes and signed plus-minus by group',
    ],
    gaps: [
      'No possessions, official event replay or on/off ratings',
      'One game with a missing overtime period is quarantined',
    ],
    usedIn: [{ to: '/lab/lineups', label: 'Lineups' }],
  },
  {
    key: 'ids',
    tape: { code: 'IDs', source: 'nba_api static · MIT', variant: 'archive' },
    name: 'Team identities',
    licence: 'MIT · static identity list',
    covers: ['Thirty team identities with namespaced IDs'],
    gaps: ['Identity only; no rosters or results from this tape'],
    usedIn: [{ to: '/teams', label: 'Teams' }],
  },
];

const LEGEND: readonly { variant: TapeVariant; tape: TapeSpec }[] = [
  { variant: 'archive', tape: { code: 'Archive', variant: 'archive' } },
  { variant: 'queried', tape: { code: 'NBA.com', variant: 'queried' } },
  { variant: 'partial', tape: { code: '18 PO', variant: 'partial' } },
  { variant: 'derived', tape: { code: 'Calc', variant: 'derived' } },
  { variant: 'hypothetical', tape: { code: 'Group', variant: 'hypothetical' } },
  { variant: 'unlinked', tape: { code: 'Name only', variant: 'unlinked' } },
  { variant: 'demo', tape: { code: 'Demo', variant: 'demo' } },
];

const NOT_ON_TAPE = [
  'Live or current-season scores, standings, schedules and rosters',
  'Official possession-based lineups, on/off ratings and play-by-play',
  'League-wide percentiles or rankings from an official player population',
  'Full player box scores for archived games',
  'Shot locations outside the partial 2018 playoffs',
] as const;

// Reader-facing names and destinations for the capability IDs the service reports. An ID the
// page does not know is still listed, by its ID alone.
const CAPABILITY: Readonly<Record<string, { name: string; to?: string }>> = {
  'recorded-historical-research': {
    name: 'Recorded 2023–24 research',
    to: '/leaders/recorded',
  },
  'research-lineup-reports': { name: 'Lineup reports', to: '/lab/lineups' },
  'historical-team-roster-results': { name: 'Team seasons', to: '/teams' },
  'historical-season-facts': { name: 'Season facts', to: '/history' },
  'raw-game-research': { name: 'Raw game research' },
  'team-directory': { name: 'Team directory', to: '/teams' },
  'player-insights': { name: 'Player insights', to: '/players' },
  comparison: { name: 'Comparison', to: '/compare' },
  'selected-cohort-analytics': {
    name: 'Selected-player analytics',
    to: '/lab/analytics',
  },
  'raw-shooting-efficiency': { name: 'Raw shooting totals' },
  'local-research': { name: 'Saved on this device', to: '/my-nba' },
  'games-standings-leaders': { name: 'Games, standings and leaders', to: '/games' },
  'shots-lineups-history': { name: 'Shot events', to: '/lab/shots' },
  'league-analytics': { name: 'League-wide analytics' },
};

const LANES = [
  { status: 'available', title: 'Available' },
  { status: 'conditional', title: 'Conditional' },
  { status: 'blocked', title: 'Blocked' },
] as const;

const REPORT_TIME = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function SourceCard({ source }: { source: SourceTape }) {
  return (
    <article className="srctape" aria-labelledby={`src-${source.key}`}>
      <div className="srctape__head">
        <Tape {...source.tape} />
        <span className="t-meta">{source.licence}</span>
      </div>
      <h3 id={`src-${source.key}`} className="srctape__name">
        {source.name}
      </h3>
      <div className="srctape__cols">
        <div>
          <p className="srctape__k">On tape</p>
          <ul className="srctape__list">
            {source.covers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="srctape__k">Not on this tape</p>
          <ul className="srctape__list srctape__list--gaps">
            {source.gaps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="srctape__used">
        <span className="srctape__k">Used in</span>
        {source.usedIn.map((place) => (
          <Link key={place.to} to={place.to} className="srctape__link">
            {place.label}
          </Link>
        ))}
      </p>
    </article>
  );
}

function CapabilityReport({ report }: { report: CapabilityResponse }) {
  const checked = new Date(report.checkedAt);
  return (
    <>
      <div className="covmode">
        <Tape
          {...(report.playerSource === 'fixture'
            ? { code: 'Demo', source: 'Fixtures', variant: 'demo' as const }
            : { code: report.playerSource, variant: 'queried' as const })}
        />
        <strong>
          {report.playerSource === 'fixture'
            ? 'DEMO MODE: player results are deterministic fixtures.'
            : `Configured player source: ${report.playerSource}`}
        </strong>
      </div>
      <p className="t-meta covmode__note">
        Configuration report only; source freshness and deployment-host reachability are
        unverified. Report generated {REPORT_TIME.format(checked)} UTC.
      </p>
      <div className="caplanes">
        {LANES.map((lane) => {
          const items = report.capabilities.filter((c) => c.status === lane.status);
          return (
            <section
              key={lane.status}
              className={`caplane caplane--${lane.status}`}
              aria-labelledby={`lane-${lane.status}`}
            >
              <h3 id={`lane-${lane.status}`} className="caplane__title">
                <i aria-hidden="true" className="caplane__pip" />
                {lane.title} <span className="caplane__count num">{items.length}</span>
              </h3>
              {items.length ? (
                <ul className="caplane__list">
                  {items.map((capability) => {
                    const known = CAPABILITY[capability.id];
                    return (
                      <li key={capability.id} className="cap">
                        {known ? <span className="cap__name">{known.name}</span> : null}
                        <code className="cap__id">
                          {capability.id}: {capability.status}
                        </code>
                        <span className="cap__reason">{capability.reason}</span>
                        {known?.to && capability.status !== 'blocked' ? (
                          <Link to={known.to} className="cap__go">
                            Open <span className="sr-only">{known.name}</span>
                            <Icon name="arrowRight" size={13} />
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="t-meta caplane__empty">None reported.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function ExplorerPage() {
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const query = useQuery({
    queryKey: ['research', 'capabilities'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/data-sources/status', signal, (v) =>
        CapabilityResponseSchema.parse(v),
      ),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <main className="landing coverage">
      <section className="landing__hero wrap">
        <p className="t-eyebrow is-red">Sources</p>
        <KineticHeadline
          lines={['What’s', 'on tape.']}
          className="landing__title"
          headingRef={heading}
          tabIndex={-1}
        />
        <Reveal delay={0.35} className="landing__lede">
          <p>
            Every number in the explorer is cut from a named source. This is the full
            list: what each tape covers, what it leaves out, and what the data service
            reports about itself right now. Nothing here is a live feed.
          </p>
        </Reveal>
        <Reveal delay={0.45} className="landing__search">
          <PlayerCombobox
            label="Find a player for insights"
            tone="dark"
            onSelect={(player) => {
              void navigate(`/players/${player.id}/insights`);
            }}
          />
        </Reveal>
      </section>

      <section className="wrap landing__section" aria-labelledby="cov-tapes">
        <div className="landing__sechead">
          <h2 id="cov-tapes" className="t-section">
            The tapes
          </h2>
          <p className="t-meta">
            Six sources, each credited where it is used.{' '}
            <Link to="/explore/coverage">Counts, fields and retrieval dates →</Link>
          </p>
        </div>
        <Stagger as="ul" className="srctapes">
          {SOURCES.map((source) => (
            <StaggerItem as="li" key={source.key}>
              <SourceCard source={source} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="wrap landing__section" aria-labelledby="cov-report">
        <div className="landing__sechead">
          <h2 id="cov-report" className="t-section">
            Data capabilities
          </h2>
          <p className="t-meta">As reported by the data service, unedited.</p>
        </div>
        <QueryFeedback pending={query.isPending} failed={query.isError} />
        {query.data ? <CapabilityReport report={query.data} /> : null}
      </section>

      <section className="wrap landing__section" aria-labelledby="cov-legend">
        <div className="landing__sechead">
          <h2 id="cov-legend" className="t-section">
            Reading a tape
          </h2>
          <p className="t-meta">The label beside every module says how it was made.</p>
        </div>
        <Reveal>
          <dl className="tapekey">
            {LEGEND.map((entry) => (
              <div key={entry.variant} className="tapekey__row">
                <dt>
                  <Tape {...entry.tape} />
                </dt>
                <dd>{TAPE_MEANING[entry.variant]}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <section className="wrap landing__section" aria-labelledby="cov-off">
        <div className="landing__sechead">
          <h2 id="cov-off" className="t-section">
            Not on tape
          </h2>
          <p className="t-meta">No page in the explorer claims these.</p>
        </div>
        <Reveal>
          <ul className="offtape">
            {NOT_ON_TAPE.map((item) => (
              <li key={item}>
                <Icon name="close" size={14} />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </main>
  );
}
