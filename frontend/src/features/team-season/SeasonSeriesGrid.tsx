import { useState } from 'react';
import { Link } from 'react-router';
import type { RecordedTeamSeasonResponse } from '@nba-performance-explorer/contracts';

import { Stagger, StaggerItem } from '../../motion/choreography';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { signed } from './team-season-format';

type Sort = 'conference' | 'record' | 'points';

/** The season series against all 29 opponents: one plate each, one pip per scheduled meeting. */
export function SeasonSeriesGrid({ data }: { data: RecordedTeamSeasonResponse }) {
  const [sort, setSort] = useState<Sort>('conference');
  const rows = [...data.opponents].sort((a, b) => {
    if (sort === 'record')
      return (
        b.wins - b.losses - (a.wins - a.losses) ||
        a.opponent.name.localeCompare(b.opponent.name)
      );
    if (sort === 'points')
      return (
        b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
        a.opponent.name.localeCompare(b.opponent.name)
      );
    return (
      a.conference.localeCompare(b.conference) ||
      a.opponent.name.localeCompare(b.opponent.name)
    );
  });
  const swept = data.opponents.filter((o) => o.losses === 0 && o.wins >= 2).length;
  const sweptBy = data.opponents.filter((o) => o.wins === 0 && o.losses >= 2).length;
  return (
    <section className="pmod" aria-labelledby="season-series">
      <Slate
        id="season-series"
        title="Season series"
        tapes={[{ code: 'FROM AGREED FINALS', variant: 'derived' }]}
        meta={[
          '29 opponents',
          `Won every verified meeting (2+): ${swept}`,
          `Lost every verified meeting (2+): ${sweptBy}`,
        ]}
      />
      <div className="pmod__controls">
        <Segmented
          label="Order the season series by"
          options={[
            { value: 'conference', label: 'Conference' },
            { value: 'record', label: 'Record' },
            { value: 'points', label: 'Point difference' },
          ]}
          value={sort}
          onChange={setSort}
        />
      </div>
      <Stagger as="ul" className="seriesgrid" gap={0.015} key={sort}>
        {rows.map((row) => {
          const games = row.gameNumbers.map((n) => data.games[n - 1]!);
          const diff = row.pointsFor - row.pointsAgainst;
          return (
            <StaggerItem as="li" key={row.opponent.id}>
              <Link
                to={`/teams/${row.opponent.id}/season`}
                className={`seriesplate ${row.wins > row.losses ? 'is-up' : row.wins < row.losses ? 'is-down' : ''}`}
                aria-label={`${row.opponent.name}: ${row.wins}–${row.losses} in ${row.verified} verified of ${row.scheduled} meetings, point difference ${signed(diff, 0)}`}
              >
                <span className="seriesplate__abbr">{row.opponent.abbreviation}</span>
                <span className="seriesplate__conf">{row.conference}</span>
                <span className="seriesplate__wl num">
                  {row.wins}–{row.losses}
                </span>
                <span className="seriesplate__pips" aria-hidden="true">
                  {games.map((g) => (
                    <i
                      key={g.id}
                      className={`pip ${g.result === 'W' ? 'pip--w' : g.result === 'L' ? 'pip--l' : 'pip--x'}`}
                      title={`G${g.gameNumber} ${g.date}`}
                    />
                  ))}
                </span>
                <span className="seriesplate__diff num">{signed(diff, 0)}</span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
      <p className="lchart__note">
        Pips run in date order: filled red is a win, outlined a loss, hatched a
        quarantined meeting. Point difference sums verified meetings only. Each plate
        opens that opponent&apos;s season.
      </p>
    </section>
  );
}
