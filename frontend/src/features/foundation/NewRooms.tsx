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
      to: '/standings/race',
      kicker: 'Seasons',
      title: 'The standings race',
      figure: '30',
      unit: 'teams racing',
      blurb: 'Replay 2023–24 date by date: the ladder reorders, the bump chart climbs.',
    },
    {
      to: '/games/bracket',
      kicker: 'Games',
      title: 'Playoff bracket',
      figure: record ? `${record.wins}–${record.losses}` : '15',
      unit: record ? `${champion!.abbreviation} run` : 'series',
      blurb: 'All 82 games of the 2024 playoffs as series, seeds and a bracket.',
    },
    {
      to: '/teams',
      kicker: 'Teams',
      title: 'Team seasons',
      figure: '82',
      unit: 'games each',
      blurb: 'Streaks, rest, close games and the season series against every opponent.',
    },
    {
      to: '/lab/shots?view=zones',
      kicker: 'Labs',
      title: 'Shot Studio, deeper',
      figure: '11',
      unit: 'distance bins',
      blurb: 'Distance profiles, clickable zones and two-player shot diets.',
    },
    {
      to: '/lab/formulas',
      kicker: 'Labs',
      title: 'Formula lab',
      figure: 'ƒ',
      unit: 'every formula',
      blurb: 'Every derived number written out, with a worked example.',
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
            never live.
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
