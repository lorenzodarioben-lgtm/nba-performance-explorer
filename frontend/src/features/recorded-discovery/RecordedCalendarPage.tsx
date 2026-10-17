import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedCalendarQuerySchema,
  RecordedCalendarResponseSchema,
  RecordedDirectorySchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
export function RecordedCalendarPage() {
  const [today] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [params, setParams] = useSearchParams(),
    resolved = new URLSearchParams(params);
  if (!resolved.has('day')) resolved.set('day', today);
  const valid =
    RecordedCalendarQuerySchema.safeParse(Object.fromEntries(resolved)).success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const query = useQuery({
    queryKey: ['research', 'recorded-calendar', resolved.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/calendar?${resolved}`,
        signal,
        RecordedCalendarResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined,
    share = new URLSearchParams(resolved);
  share.set('season', '2023-24');
  const update = (k: string, v: string) => {
    const q = new URLSearchParams(resolved);
    if (v) q.set(k, v);
    else q.delete(k);
    setParams(q);
  };
  return (
    <ResearchShell title="Recorded games on this calendar day">
      <p>
        Look up calendar-month/day matches inside the source-agreed 2023–24
        regular-season archive. Local today defaults to {today}; shared/saved links
        freeze the resolved day. This is not an all-time archive or a live daily
        scoreboard. Game dates remain source calendar labels.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid calendar filters. Use a valid MM-DD and supported recorded source
          season/team.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      <label>
        Calendar month and day (MM-DD)
        <input
          value={params.get('day') ?? today}
          maxLength={5}
          placeholder="MM-DD"
          onChange={(e) => update('day', e.target.value)}
        />
      </label>
      <button onClick={() => update('day', today)}>Use local today</button>
      <label>
        Calendar source team
        <select
          value={params.get('team') ?? ''}
          onChange={(e) => update('team', e.target.value)}
        >
          <option value="">All recorded teams</option>
          {directory.data?.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {data.games.length} recorded matches for {data.day}; {data.reconciledGames}{' '}
            source-agreed games in total; {data.quarantinedGameIds.length}{' '}
            conflicting/unpaired IDs globally quarantined. Snapshot{' '}
            {data.snapshotCreatedAt}.
          </p>
          <label>
            Shareable calendar URL
            <input
              readOnly
              value={`${window.location.origin}/history/calendar?${share}`}
            />
          </label>
          <SaveResearchButton
            kind="page"
            label={`Recorded calendar games ${data.day}`}
            path={`/history/calendar?${share}`}
          />
          {!data.games.length ? (
            <p role="status">
              No source-agreed games match this calendar label/team. No unseen
              historical events are inferred.
            </p>
          ) : (
            <>
              <ul className="scorecards">
                {data.games.map((g) => {
                  const awayWon = g.awayScore > g.homeScore;
                  return (
                    <li key={g.id}>
                      <a
                        className="scorecard"
                        href={g.recapUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${g.away.name} ${g.awayScore}, ${g.home.name} ${g.homeScore}, final, ${g.date}, recap`}
                      >
                        <span className="scorecard__status">
                          Final
                          <span>{g.date} · recap ↗</span>
                        </span>
                        <span className={`scorecard__team ${awayWon ? 'is-won' : ''}`}>
                          <b>{g.away.abbreviation}</b>
                          <span>{g.away.name}</span>
                          <em className="num">{g.awayScore}</em>
                        </span>
                        <span className={`scorecard__team ${awayWon ? '' : 'is-won'}`}>
                          <b>{g.home.abbreviation}</b>
                          <span>{g.home.name}</span>
                          <em className="num">{g.homeScore}</em>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <ResearchTable label="Recorded calendar game results">
                <table>
                  <caption>Final scores agreed by both source team pages</caption>
                  <thead>
                    <tr>
                      {[
                        'Date',
                        'Game ID',
                        'Away',
                        'Away score',
                        'Home',
                        'Home score',
                        'Source revisions',
                      ].map((s) => (
                        <th scope="col" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.games.map((g) => (
                      <tr key={g.id}>
                        <th scope="row">{g.date}</th>
                        <td>
                          <a href={g.recapUrl}>{g.id}</a>
                        </td>
                        <td>
                          <Link to={`/teams/${g.away.id}`}>{g.away.name}</Link>
                        </td>
                        <td>{g.awayScore}</td>
                        <td>
                          <Link to={`/teams/${g.home.id}`}>{g.home.name}</Link>
                        </td>
                        <td>{g.homeScore}</td>
                        <td>
                          {g.sources.map((a) => (
                            <a key={a.revision} href={a.url}>
                              {a.revision}{' '}
                            </a>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
            </>
          )}
          <details>
            <summary>Calendar source revisions and licences</summary>
            {data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
        </>
      )}
    </ResearchShell>
  );
}
