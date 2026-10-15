import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PlayoffBracketResponseSchema } from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { Reveal, Stagger, StaggerItem } from '../../motion/choreography';

/**
 * The homepage band for the newest rooms: large typographic tiles in the rundown's idiom. One
 * live fact (the champion's playoff record) comes from the cached bracket query; if that source
 * is unavailable the tile simply keeps its description.
 */
export function NewRooms() {
  const bracket = useQuery({
    queryKey: ['research', 'playoff-bracket'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/games/bracket', signal, PlayoffBracketResponseSchema.parse),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const champion = bracket.data?.champion;
  const record = champion
    ? bracket.data!.series.reduce(
        (sum, s) => {
          for (const g of s.games)
            if (g.game.home.id === champion.id || g.game.away.id === champion.id) {
              if (g.winner.id === champion.id) sum.wins++;
              else sum.losses++;
            }
          return sum;
        },
        { wins: 0, losses: 0 },
      )
    : null;
  const tiles = [
    {
      to: '/games/series/r4-BOS-DAL',
      kicker: 'Games',
      title: 'Series film room',
      figure: record ? `${record.wins}–${record.losses}` : '15',
      unit: record ? `${champion!.abbreviation} title run` : 'series',
      blurb:
        'Any 2024 series game by game: the tape, the line scores, the swing quarters.',
    },
    {
      to: '/my-nba/stories',
      kicker: 'My NBA',
      title: 'Statistical stories',
      figure: '6',
      unit: 'tools to embed',
      blurb:
        'Write up a finding with live charts between your notes; print or share it.',
    },
    {
      to: '/lab/workbench',
      kicker: 'Labs',
      title: 'Research workbench',
      figure: '639',
      unit: 'player rows',
      blurb: 'Rank, distribute or relate any recorded metric, with the cohort stated.',
    },
    {
      to: '/compare/recorded?players=203999,203507',
      kicker: 'Compare',
      title: 'Comparison studio',
      figure: '4',
      unit: 'players at once',
      blurb: 'One shared scale, the widest gaps first, and plain statements.',
    },
    {
      to: '/lab/shots?players=201939&view=density&region=-8,-6,8,8',
      kicker: 'Labs',
      title: 'Shot Studio regions',
      figure: '13,470',
      unit: 'real attempts',
      blurb: 'Drag a box on the court; every summary follows it.',
    },
    {
      to: '/games/bracket',
      kicker: 'Games',
      title: 'Playoff bracket',
      figure: '82',
      unit: 'games',
      blurb: 'The 2024 playoffs as series, seeds and a bracket.',
    },
  ];
  return (
    <section className="newrooms wrap" aria-labelledby="newrooms-title">
      <div className="ontape__head">
        <Reveal variant="mask">
          <h2 id="newrooms-title" className="rundown__title">
            New in the film room
          </h2>
        </Reveal>
        <Reveal variant="fade" delay={0.15}>
          <p className="ontape__note">
            Built on the recorded archives: the same sources, more ways in. Historical,
            never live.{' '}
            <Link to="/tour" className="newrooms__tour">
              Take the five-minute tour →
            </Link>
          </p>
        </Reveal>
      </div>
      <Stagger as="ul" className="newrooms__grid" gap={0.06}>
        {tiles.map((tile) => (
          <StaggerItem as="li" key={tile.to}>
            <Link to={tile.to} className="newroom">
              <span className="newroom__kicker">{tile.kicker}</span>
              <span className="newroom__figure" aria-hidden="true">
                {tile.figure}
                <small>{tile.unit}</small>
              </span>
              <b className="newroom__title">{tile.title}</b>
              <span className="newroom__blurb">{tile.blurb}</span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
