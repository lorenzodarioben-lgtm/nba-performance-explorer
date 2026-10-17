import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { KineticHeadline, Reveal, Stagger, StaggerItem } from '../motion/choreography';
import { Icon } from '../ui/Icon';
import { Tape, type TapeSpec } from '../ui/Tape';

const QUERIED: TapeSpec = { code: 'NBA.com', source: 'Queried', variant: 'queried' };
const SHOTS: TapeSpec = { code: '18 PO', source: 'Kaggle · CC0', variant: 'partial' };
const RECORDED: TapeSpec = {
  code: '23–24',
  source: 'Wikipedia · CC BY-SA',
  variant: 'archive',
};
const LINEUPS: TapeSpec = {
  code: '17–18',
  source: 'Dataverse · Etalab 2.0',
  variant: 'archive',
};

const BENCHES: readonly {
  title: string;
  blurb: string;
  tools: readonly {
    to: string;
    name: string;
    blurb: string;
    tapes: readonly TapeSpec[];
  }[];
}[] = [
  {
    title: 'Shooting',
    blurb: 'Archived playoff shot events, drawn on an accurate court.',
    tools: [
      {
        to: '/lab/shots',
        name: 'Shot Studio',
        blurb:
          'Dots, density and zones for one or two players, with a linked shot table.',
        tapes: [SHOTS],
      },
      {
        to: '/games/shooting',
        name: 'Game shooting',
        blurb: 'Team shooting by zone for one archived playoff game.',
        tapes: [SHOTS],
      },
    ],
  },
  {
    title: 'Lineups and groups',
    blurb: 'Five-player units and the hypothetical groups you build.',
    tools: [
      {
        to: '/lab/lineups',
        name: 'Lineups',
        blurb: 'Researcher-derived unit minutes and plus-minus from the 2017–18 study.',
        tapes: [LINEUPS],
      },
      {
        to: '/lab/groups',
        name: 'Hypothetical five',
        blurb:
          'Combine recorded player seasons into a group that never played together.',
        tapes: [RECORDED, { code: 'Built by you', variant: 'hypothetical' }],
      },
    ],
  },
  {
    title: 'Distributions',
    blurb: 'Where a player sits within a group, and how statistics move together.',
    tools: [
      {
        to: '/lab/analytics',
        name: 'Analytics',
        blurb: 'Player-season distributions, relationships and outliers.',
        tapes: [QUERIED],
      },
      {
        to: '/lab/recorded',
        name: 'Group analytics',
        blurb: 'Distributions and correlations inside a recorded group.',
        tapes: [RECORDED],
      },
    ],
  },
  {
    title: 'Discovery',
    blurb: 'Find the seasons that match what you are looking for.',
    tools: [
      {
        to: '/discover',
        name: 'Discover',
        blurb: 'Filter player-seasons by any statistic and threshold.',
        tapes: [QUERIED],
      },
      {
        to: '/discover/recorded',
        name: 'Group discovery',
        blurb: 'Filter a recorded group of players and open the evidence.',
        tapes: [RECORDED],
      },
    ],
  },
];

export function LabsLanding() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="landing">
      <section className="landing__hero wrap">
        <p className="t-eyebrow is-red">Labs</p>
        <KineticHeadline
          lines={['Study', 'the tape.']}
          className="landing__title"
          headingRef={heading}
          tabIndex={-1}
        />
        <Reveal delay={0.35} className="landing__lede">
          <p>
            The research benches. Each one says which tape it was cut from and what that
            tape does not cover. Comparison tools live under{' '}
            <Link className="link" to="/compare">
              Compare
            </Link>
            .
          </p>
        </Reveal>
      </section>

      {BENCHES.map((bench) => (
        <section
          key={bench.title}
          className="wrap landing__section"
          aria-labelledby={`bench-${bench.title}`}
        >
          <div className="landing__sechead">
            <h2 id={`bench-${bench.title}`} className="t-section">
              {bench.title}
            </h2>
            <p className="t-meta">{bench.blurb}</p>
          </div>
          <Stagger as="ul" className="tools">
            {bench.tools.map((tool) => (
              <StaggerItem as="li" key={tool.to}>
                <Link to={tool.to} className="tool">
                  <span className="tool__tapes">
                    {tool.tapes.map((tape) => (
                      <Tape key={tape.code} {...tape} />
                    ))}
                  </span>
                  <span className="tool__name">{tool.name}</span>
                  <span className="tool__blurb">{tool.blurb}</span>
                  <span className="tool__go" aria-hidden="true">
                    Open <Icon name="arrowRight" size={14} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ))}
    </main>
  );
}
