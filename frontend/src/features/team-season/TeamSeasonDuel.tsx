import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  RecordedTeamSeasonResponseSchema,
  type RecordedTeamSeasonResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable } from '../research/ResearchShell';
import { LineChart } from '../../charts/LineChart';
import { MirrorBars } from '../../charts/MirrorBars';
import { Slate } from '../../ui/Slate';
import { percent, signed } from './team-season-format';

/**
 * Two recorded 2023-24 seasons side by side: both records game by game on one chart, and every
 * split both teams share on one 0–100% scale. Same definitions, same verified-games rule.
 */
export function TeamSeasonDuel({ teams }: { teams: readonly [string, string] }) {
  const results = useQueries({
    queries: teams.map((team) => ({
      // Shares the cache entry with the team season page.
      queryKey: ['research', 'recorded-team-season', team],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchResearch(
          `/api/recorded/team-season?team=${encodeURIComponent(team)}`,
          signal,
          RecordedTeamSeasonResponseSchema.parse,
        ),
      retry: false,
      staleTime: 60 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const [a, b] = results.map((r) => r.data);
  return (
    <section className="pmod duel" aria-labelledby="season-duel">
      <Slate
        id="season-duel"
        title="Two seasons, game by game"
        tapes={[
          { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' },
          { code: 'FROM AGREED FINALS', variant: 'derived' },
        ]}
        meta={['Same definitions for both teams', 'Verified games only']}
      />
      <QueryFeedback
        pending={results.some((r) => r.isPending)}
        failed={results.some((r) => r.isError)}
      />
      {a && b ? <DuelBody a={a} b={b} /> : null}
    </section>
  );
}

function DuelBody({
  a,
  b,
}: {
  a: RecordedTeamSeasonResponse;
  b: RecordedTeamSeasonResponse;
}) {
  const shared = a.splits.filter((s) => b.splits.some((t) => t.key === s.key));
  const other = (key: string) => b.splits.find((s) => s.key === key)!;
  const wl = (s: { wins: number; losses: number }) => `${s.wins}–${s.losses}`;
  return (
    <>
      <figure className="pmod__figure">
        <figcaption className="pmod__caption">
          Games above .500 after each game number (observed records)
        </figcaption>
        <LineChart
          categories={a.games.map((g) => `G${g.gameNumber}`)}
          series={[a, b].map((t, i) => ({
            id: t.team.id,
            label: t.team.name,
            color: i === 0 ? 'var(--s1)' : 'var(--s2)',
            shape: i === 0 ? 'circle' : 'square',
            dash: i === 0 ? undefined : '6 4',
            values: t.games.map((g) => g.observedWins - g.observedLosses),
          }))}
          label={`${a.team.name} and ${b.team.name}: wins minus losses after each game`}
          format={(v) => signed(v, 0)}
          height={280}
          zero={0}
        />
      </figure>
      <MirrorBars
        nameA={a.team.name}
        nameB={b.team.name}
        sharedMax={1}
        rows={shared.map((s) => ({
          label: s.label,
          a: s.winPercentage,
          b: other(s.key).winPercentage,
          displayA: wl(s),
          displayB: wl(other(s.key)),
        }))}
      />
      <p className="lchart__note">
        Bars are win percentage on one 0–100% scale with each record printed; small
        samples (under five verified games) are marked in the table. Game numbers follow
        each team&apos;s own schedule, so the same game number can fall on different
        dates.
      </p>
      <ResearchTable label="Split comparison">
        <table>
          <caption>Every split both teams share, from verified games</caption>
          <thead>
            <tr>
              <th scope="col">Split</th>
              <th scope="col">{a.team.abbreviation} W–L</th>
              <th scope="col">{a.team.abbreviation} win %</th>
              <th scope="col">{b.team.abbreviation} W–L</th>
              <th scope="col">{b.team.abbreviation} win %</th>
              <th scope="col">
                Margin {a.team.abbreviation} / {b.team.abbreviation}
              </th>
            </tr>
          </thead>
          <tbody>
            {shared.map((s) => {
              const t = other(s.key);
              return (
                <tr key={s.key}>
                  <th scope="row" title={s.definition}>
                    {s.label}
                    {s.smallSample || t.smallSample ? ' (small sample)' : ''}
                  </th>
                  <td>{wl(s)}</td>
                  <td>{percent(s.winPercentage)}</td>
                  <td>{wl(t)}</td>
                  <td>{percent(t.winPercentage)}</td>
                  <td>
                    {signed(s.marginPerGame, 1)} / {signed(t.marginPerGame, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResearchTable>
      <p className="intel-game__links">
        <Link to={`/teams/${a.team.id}/season`}>
          {a.team.abbreviation} season in full
        </Link>
        <Link to={`/teams/${b.team.id}/season`}>
          {b.team.abbreviation} season in full
        </Link>
      </p>
    </>
  );
}
