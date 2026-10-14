import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ShotBoxQuerySchema,
  ShotBoxResponseSchema,
  ShotDirectorySchema,
  type ShotBoxResponse,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { MirrorBars } from '../../charts/MirrorBars';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
const percent = (v: number | null) =>
  v === null ? 'Unavailable' : `${(100 * v).toFixed(1)}%`;
function Cells({ row }: { row: ShotBoxResponse['teams'][number] }) {
  return (
    <>
      <td>
        {row.makes}/{row.attempts}
      </td>
      <td>
        {row.twoMakes}/{row.twoAttempts}
      </td>
      <td>
        {row.threeMakes}/{row.threeAttempts}
      </td>
      <td>{percent(row.fgPercentage)}</td>
      <td>{percent(row.threePercentage)}</td>
      <td>{percent(row.efgPercentage)}</td>
      <td>{row.fieldGoalPoints}</td>
    </>
  );
}
export function ShotBoxPage() {
  const [params, setParams] = useSearchParams(),
    valid =
      ShotBoxQuerySchema.safeParse(Object.fromEntries(params)).success &&
      [...params.keys()].every((k) => params.getAll(k).length === 1);
  const directory = useQuery({
    queryKey: ['research', 'shot-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/shots/directory', signal, ShotDirectorySchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const query = useQuery({
    queryKey: ['research', 'shooting-box', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/shots/box?${params}`, signal, ShotBoxResponseSchema.parse),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined,
    update = (k: string, v: string) => {
      const p = new URLSearchParams(params);
      if (v) p.set(k, v);
      else p.delete(k);
      setParams(p);
    };
  const headings = [
    'FGM/FGA',
    '2PM/2PA',
    '3PM/3PA',
    'FG',
    '3P',
    'eFG',
    'Field-goal points',
  ];
  return (
    <ResearchShell title="Recorded game shooting table">
      <p>
        Observed field-goal counts for one recorded2018 playoff game. Field-goal points
        exclude unknown free throws and are not final scores or full player point
        totals. Minutes, rebounds, assists, FT and non-shooting participants remain
        unavailable.
      </p>
      <label>
        Recorded shooting game
        <select
          value={params.get('game') ?? ''}
          onChange={(e) => update('game', e.target.value)}
        >
          <option value="">Choose recorded source game</option>
          {directory.data?.games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.date} {g.away.abbreviation} at {g.home.abbreviation} · {g.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Shooting box minimum attempts
        <input
          type="number"
          min={1}
          max={1000}
          value={params.get('minAttempts') ?? '1'}
          onChange={(e) => update('minAttempts', e.target.value)}
        />
      </label>
      {!params.get('game') ? (
        <>
          <QueryFeedback pending={directory.isPending} failed={directory.isError} />
          {!directory.isError && (
            <p role="status">
              Choose a recorded game to inspect its observed shooting.
            </p>
          )}
        </>
      ) : !valid ? (
        <p role="alert">
          Invalid shooting table filters. Choose source game and supported attempt
          minimum.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending || directory.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {data.away.name} at {data.home.name}, {data.date}, {data.gameId};{' '}
            {data.observedAttempts} observed attempts and {data.players.length}{' '}
            source-listed shooters. Ratios require {data.minAttempts} observed attempts,
            independently for FG and 3P.
          </p>
          <Link to={`/lab/shots?game=${data.gameId}`}>
            Inspect exact source shot events
          </Link>
          <label>
            Shareable shooting table URL
            <input
              readOnly
              value={`${window.location.origin}/games/shooting?${params}`}
            />
          </label>
          <SaveResearchButton
            kind="page"
            label={`Recorded shooting ${data.gameId}`}
            path={`/games/shooting?${params}`}
          />
          {data.teams[0] && data.teams[1] ? (
            <MirrorBars
              nameA={data.teams[0].team.name}
              nameB={data.teams[1].team.name}
              rows={(
                [
                  ['FGA', 'attempts'],
                  ['FGM', 'makes'],
                  ['2PA', 'twoAttempts'],
                  ['2PM', 'twoMakes'],
                  ['3PA', 'threeAttempts'],
                  ['3PM', 'threeMakes'],
                  ['FG points', 'fieldGoalPoints'],
                ] as const
              ).map(([label, key]) => ({
                label,
                a: data.teams[0]![key],
                b: data.teams[1]![key],
                displayA: String(data.teams[0]![key]),
                displayB: String(data.teams[1]![key]),
              }))}
            />
          ) : null}
          <ResearchTable label="Observed team shooting">
            <table>
              <caption>
                Team counts reconcile to observed player attempts/makes; no final points
                inferred
              </caption>
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  {headings.map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.teams.map((r) => (
                  <tr key={r.team.id}>
                    <th scope="row">{r.team.name}</th>
                    <Cells row={r} />
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <ResearchTable label="Observed player shooting">
            <table>
              <caption>
                Players with source shots only; missing non-shooting participation is
                not a DNP claim
              </caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Team</th>
                  {headings.map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.players.map((r) => (
                  <tr key={r.playerId}>
                    <th scope="row">
                      <Link to={`/players/${r.playerId}`}>{r.name}</Link>
                    </th>
                    <td>{r.team.abbreviation}</td>
                    <Cells row={r} />
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <p>
            Full points/FT/minutes/REB/AST: unavailable.{' '}
            <a href={data.source.url}>{data.source.title}</a> · {data.source.creator},
            version{data.source.version},{' '}
            <a href={data.source.licenceUrl}>{data.source.licence}</a>. Coverage is the
            publisher’s partial2018 playoff file; source hash{data.source.sha256}.
          </p>
        </>
      )}
    </ResearchShell>
  );
}
