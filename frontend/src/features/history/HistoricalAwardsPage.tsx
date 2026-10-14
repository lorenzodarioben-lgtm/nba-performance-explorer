import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import {
  HistoricalAwardsQuerySchema,
  HistoricalAwardsResponseSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
export function HistoricalAwardsPage() {
  const [params, setParams] = useSearchParams(),
    api = new URLSearchParams(params);
  api.delete('search');
  const valid =
    HistoricalAwardsQuerySchema.safeParse(Object.fromEntries(api)).success &&
    (params.get('search')?.length ?? 0) <= 100 &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'historical-awards', api.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/history/awards?${api}`,
        signal,
        HistoricalAwardsResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined,
    search = (params.get('search') ?? '').trim().toLowerCase(),
    share = new URLSearchParams(params);
  share.set('season', '2023-24');
  const filtered =
    data?.awards.filter((a) =>
      `${a.category} ${a.recipients.map((r) => `${r.name} ${r.team?.name ?? ''}`).join(' ')}`
        .toLowerCase()
        .includes(search),
    ) ?? [];
  return (
    <ResearchShell title="Historical yearly awards">
      <p>
        Source-listed2023–24 award recipients. Finalists are excluded; missing
        recipients remain unavailable. Coaches and executives keep their source names
        without being mapped to player profiles. This is a single-season yearly-award
        table, not a complete all-time/All-NBA-team archive.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid award filters. Choose2023-24 and bounded search text.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <label>
        Search recorded award/recipient/team
        <input
          maxLength={100}
          value={params.get('search') ?? ''}
          onChange={(e) => {
            const p = new URLSearchParams(params);
            if (e.target.value) p.set('search', e.target.value);
            else p.delete('search');
            setParams(p);
          }}
        />
      </label>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {filtered.length} matching categories from {data.awards.length} source rows;{' '}
            {data.awards.filter((a) => a.recipientUnavailable).length} missing recipient
            categories.
          </p>
          <label>
            Shareable award URL
            <input
              readOnly
              value={`${window.location.origin}/history/awards?${share}`}
            />
          </label>
          <SaveResearchButton
            kind="page"
            label="Historical 2023–24 yearly awards"
            path={`/history/awards?${share}`}
          />
          {!filtered.length ? (
            <p role="status">No recorded awards match this search.</p>
          ) : (
            <>
              <Stagger as="ul" className="trophies" gap={0.04}>
                {filtered.map((a) => (
                  <StaggerItem as="li" key={a.category} className="trophy">
                    <span className="trophy__award">{a.category}</span>
                    {a.recipientUnavailable ? (
                      <span className="trophy__none">Recipient not in source</span>
                    ) : (
                      a.recipients.map((r) => (
                        <span
                          key={`${r.name}:${r.articleUrl}`}
                          className="trophy__winner"
                        >
                          <b>{r.name}</b>
                          <span>{r.team?.name ?? 'Team unavailable'}</span>
                        </span>
                      ))
                    )}
                  </StaggerItem>
                ))}
              </Stagger>
              <ResearchTable label="Historical award recipients">
                <table>
                  <caption>Winners from the recipient column only</caption>
                  <thead>
                    <tr>
                      <th scope="col">Award</th>
                      <th scope="col">Recipient(s)</th>
                      <th scope="col">Source team association</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.category}>
                        <th scope="row">{a.category}</th>
                        <td>
                          {a.recipientUnavailable
                            ? 'Unavailable in source'
                            : a.recipients.map((r) => (
                                <div key={`${r.name}:${r.articleUrl}`}>
                                  {r.articleUrl ? (
                                    <a href={r.articleUrl}>{r.name}</a>
                                  ) : (
                                    r.name
                                  )}
                                </div>
                              ))}
                        </td>
                        <td>
                          {a.recipients.map((r) => (
                            <div key={r.name}>{r.team?.name ?? 'Unavailable'}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
            </>
          )}
          <WikiAttribution data={data.attribution} />
        </>
      )}
    </ResearchShell>
  );
}
