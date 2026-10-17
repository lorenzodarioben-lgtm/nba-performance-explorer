import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import {
  RecordedProgressionQuerySchema,
  RecordedProgressionResponseSchema,
  RecordedRecordMetricSchema,
  RecordedDirectorySchema,
  type RecordedProgressionResponse,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { LineChart } from '../../charts/LineChart';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
function MeanSeries({ series }: { series: RecordedProgressionResponse['series'] }) {
  return (
    <div className="panel frchart" data-chart="progression-mean">
      <LineChart
        label="Daily mean metric value; gaps remain disconnected"
        categories={series.map((r) => r.date)}
        series={[
          {
            id: 'mean',
            label: 'Daily mean',
            color: '#3b82f6',
            values: series.map((r) => r.meanValue),
          },
        ]}
        height={240}
        format={(value) => value.toFixed(2)}
        formatCategory={(date) => date.slice(5)}
        footnote="Daily mean metric value across the recorded games of each date; days without games are gaps, never bridged."
      />
    </div>
  );
}
export function RecordedProgressionPage() {
  const [params, setParams] = useSearchParams(),
    parsed = RecordedProgressionQuerySchema.safeParse(Object.fromEntries(params)),
    valid =
      parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'recorded-progression', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/progression?${params}`,
        signal,
        RecordedProgressionResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined,
    update = (k: string, v: string) => {
      const q = new URLSearchParams(params);
      if (v) q.set(k, v);
      else q.delete(k);
      setParams(q);
    },
    share = new URLSearchParams(params);
  share.set('season', '2023-24');
  if (data) {
    share.set('from', data.from);
    share.set('to', data.to);
  }
  return (
    <ResearchShell title="Observed record progression and daily trends">
      <p>
        Source-agreed 2023–24 regular-season finals only. Record maxima begin at the
        selected window start and are reported through each calendar date; game order
        within a date is unknown. Every tied game at that date’s high is retained. These
        are observed window records, not all-time or complete official league records.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid progression filters. Choose a supported metric, ordered 2023–24 window
          and daily sample threshold.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      <div className={styles.controls}>
        <label>
          Progression metric
          <select
            value={params.get('metric') ?? 'teamPoints'}
            onChange={(e) => update('metric', e.target.value)}
          >
            {RecordedRecordMetricSchema.options.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Progression source team
          <select
            value={params.get('team') ?? ''}
            onChange={(e) => update('team', e.target.value)}
          >
            <option value="">All source games</option>
            {directory.data?.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {(['from', 'to'] as const).map((k) => (
          <label key={k}>
            {k === 'from' ? 'Progression from date' : 'Progression to date'}
            <input
              type="date"
              min="2023-10-01"
              max="2024-06-30"
              value={params.get(k) ?? ''}
              onChange={(e) => update(k, e.target.value)}
            />
          </label>
        ))}
        <label>
          Minimum daily games for means
          <input
            type="number"
            min={1}
            max={15}
            value={params.get('minDailyGames') ?? '1'}
            onChange={(e) => update('minDailyGames', e.target.value)}
          />
        </label>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {data.matchingGames} matching games in {data.from}–{data.to};{' '}
            {data.reconciledGames} source-agreed archive games,{' '}
            {data.quarantinedGameIds.length} globally quarantined IDs. teamPoints
            without a team means the higher final score in each game; finalMargin means
            absolute final-score difference. Daily means require {data.minDailyGames}{' '}
            games; maxima still refer to actual games. No possession or largest in-game
            lead inference.
          </p>
          <label>
            Shareable progression URL
            <input
              readOnly
              value={`${window.location.origin}/history/progression?${share}`}
            />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Observed record progression/daily trend"
            path={`/history/progression?${share}`}
          />
          <h2>Daily mean trend</h2>
          <MeanSeries series={data.series} />
          <ResearchTable label="Daily observed metric values">
            <table>
              <caption>
                Every calendar day and raw sample count; null/low samples produce chart
                gaps
              </caption>
              <thead>
                <tr>
                  {['Date', 'Source games', 'Mean metric value', 'Daily high'].map(
                    (s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.series.map((r) => (
                  <tr key={r.date}>
                    <th scope="row">{r.date}</th>
                    <td>{r.games}</td>
                    <td>{r.meanValue?.toFixed(3) ?? 'Unavailable'}</td>
                    <td>{r.highValue ?? 'Unavailable'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2>Highest observed value through each date</h2>
          {!data.progression.length ? (
            <p role="status">No source-agreed record events in this window.</p>
          ) : (
            <ResearchTable label="Observed record changes">
              <table>
                <caption>
                  All games tied at that date’s high; no within-day chronology invented
                </caption>
                <thead>
                  <tr>
                    {[
                      'Date',
                      'Previous high',
                      'High through date',
                      'Change',
                      'Tied source games',
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.progression.map((r) => (
                    <tr key={r.date}>
                      <th scope="row">{r.date}</th>
                      <td>{r.previousHigh ?? 'No earlier window record'}</td>
                      <td>{r.value}</td>
                      <td>{r.kind}</td>
                      <td>
                        {r.games.map((g) => (
                          <div key={g.id}>
                            <a href={g.recapUrl}>{g.id}</a> · {g.away.abbreviation}
                            {g.awayScore} at {g.home.abbreviation}
                            {g.homeScore}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
          <details>
            <summary>Progression source revisions and licences</summary>
            {data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
        </>
      )}
    </ResearchShell>
  );
}
