import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

import { PlayerCombobox } from '../features/player-search/PlayerCombobox';
import { getPlayerImage } from '../features/players/playerImages';
import { KineticHeadline, Reveal, Stagger, StaggerItem } from '../motion/choreography';
import { Icon } from '../ui/Icon';
import { Tape, type TapeSpec } from '../ui/Tape';

// Players with licensed editorial photography (ids verified in playerImages.ts). This is a
// doorway, not a ranking: the board makes no claim about who is best or most searched.
const ON_THE_BOARD = [
  { id: '201939', name: 'Stephen Curry' },
  { id: '2544', name: 'LeBron James' },
  { id: '203999', name: 'Nikola Jokic' },
  { id: '1641705', name: 'Victor Wembanyama' },
  { id: '1628983', name: 'Shai Gilgeous-Alexander' },
  { id: '203507', name: 'Giannis Antetokounmpo' },
  { id: '1629029', name: 'Luka Doncic' },
  { id: '201142', name: 'Kevin Durant' },
  { id: '203954', name: 'Joel Embiid' },
  { id: '1630169', name: 'Tyrese Haliburton' },
  { id: '1628378', name: 'Donovan Mitchell' },
  { id: '201935', name: 'James Harden' },
  { id: '202695', name: 'Kawhi Leonard' },
  { id: '1630595', name: 'Cade Cunningham' },
] as const;

const QUERIED: TapeSpec = { code: 'NBA.com', source: 'Queried', variant: 'queried' };

const HUB_ROOMS: readonly {
  name: string;
  blurb: string;
  tapes: readonly TapeSpec[];
}[] = [
  {
    name: 'Overview',
    blurb: 'Identity, the season stat sheet, career trends and the latest game log.',
    tapes: [QUERIED],
  },
  {
    name: 'Form',
    blurb: 'Rolling averages, splits and season totals for one season at a time.',
    tapes: [QUERIED, { code: 'Rolling', variant: 'derived' }],
  },
  {
    name: 'Game research',
    blurb: 'Every game in a season: filter, sort and read single-game highs.',
    tapes: [QUERIED],
  },
  {
    name: 'Career',
    blurb: 'Season-by-season career as reported, with peaks and totals.',
    tapes: [QUERIED],
  },
  {
    name: 'Shooting',
    blurb: 'Shooting counts by zone and distance; archived 2018 playoff shot maps.',
    tapes: [QUERIED, { code: '18 PO', source: 'Kaggle · CC0', variant: 'partial' }],
  },
];

export function PlayersLanding() {
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="landing">
      <section className="landing__hero wrap">
        <p className="t-eyebrow is-red">Players</p>
        <KineticHeadline
          lines={['Every player.', 'One hub.']}
          className="landing__title"
          headingRef={heading}
          tabIndex={-1}
        />
        <Reveal delay={0.35} className="landing__lede">
          <p>
            Search any player NBA.com lists. Each hub opens on an overview and carries
            form, game research, career and shooting. Figures are queried when you ask
            for them; nothing here is a live feed.
          </p>
        </Reveal>
        <Reveal delay={0.45} className="landing__search">
          <PlayerCombobox
            label="Find a player"
            tone="dark"
            onSelect={(player) => {
              void navigate(`/players/${player.id}`);
            }}
          />
        </Reveal>
      </section>

      <section className="wrap landing__section" aria-labelledby="board-title">
        <div className="landing__sechead">
          <h2 id="board-title" className="t-section">
            On the board
          </h2>
          <p className="t-meta">Players with editorial photography · not a ranking</p>
        </div>
        <Stagger as="ul" className="board" gap={0.04}>
          {ON_THE_BOARD.map((player, index) => {
            const image = getPlayerImage(player.id);
            return (
              <StaggerItem as="li" key={player.id} className="board__item">
                <Link to={`/players/${player.id}`} className="board__card">
                  {image ? (
                    <img
                      src={image.src}
                      alt=""
                      width={image.width}
                      height={image.height}
                      loading={index < 6 ? 'eager' : 'lazy'}
                      decoding="async"
                      style={{ objectPosition: image.objectPosition }}
                    />
                  ) : null}
                  <span className="board__shade" aria-hidden="true" />
                  <span className="board__name">{player.name}</span>
                  <span className="board__go" aria-hidden="true">
                    Open hub <Icon name="arrowRight" size={14} />
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section className="wrap landing__section" aria-labelledby="rooms-title">
        <div className="landing__sechead">
          <h2 id="rooms-title" className="t-section">
            Inside a player hub
          </h2>
          <p className="t-meta">Five rooms · every module names its tape</p>
        </div>
        <Stagger as="ol" className="rooms">
          {HUB_ROOMS.map((room, index) => (
            <StaggerItem as="li" key={room.name} className="rooms__item">
              <span className="rooms__num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="t-module">{room.name}</h3>
              <p>{room.blurb}</p>
              <span className="rooms__tapes">
                {room.tapes.map((tape) => (
                  <Tape key={tape.code} {...tape} />
                ))}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </main>
  );
}
