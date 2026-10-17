import type { LeagueProvenance } from '@nba-performance-explorer/contracts';
import { Tape } from '../../ui/Tape';
import { LoadingLine, Notice } from '../../ui/DataState';
import { LeagueApiError } from './league-api';

const MODE_TEXT: Record<LeagueProvenance['mode'], string> = {
  'committed-snapshot': 'Archived NBA.com data shipped with the app',
  live: 'Fetched from NBA.com for this request',
  cached: 'NBA.com response reused from this server’s short cache',
};

/** Source, freshness and coverage for any league response. */
export function LeagueSourceNote({ provenance }: { provenance: LeagueProvenance }) {
  return (
    <aside className="source-note" aria-label="Data source and coverage">
      <div className="source-note__top">
        <Tape
          code="NBA.com"
          source={provenance.mode === 'committed-snapshot' ? 'Archived' : 'Queried'}
          variant={provenance.mode === 'committed-snapshot' ? 'archive' : 'queried'}
        />
        <strong>{MODE_TEXT[provenance.mode]}</strong>
      </div>
      <p>{provenance.coverage}</p>
      {provenance.retrievedAt ? (
        <p className="source-note__time">
          Retrieved from NBA.com {new Date(provenance.retrievedAt).toLocaleString()}
          {provenance.sourceUpdatedAt
            ? `; NBA.com reports it updated ${new Date(provenance.sourceUpdatedAt).toLocaleString()}.`
            : '; NBA.com reports no update time for it.'}
        </p>
      ) : null}
      {provenance.warnings.length ? (
        <ul>
          {provenance.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

/** Loading, refusal and failure states for a league query. */
export function LeagueFeedback({
  pending,
  error,
}: {
  pending: boolean;
  error: unknown;
}) {
  if (pending) return <LoadingLine>Loading the league archive…</LoadingLine>;
  if (!error) return null;
  return (
    <Notice tone="error" role="alert" title="Not available">
      {error instanceof LeagueApiError
        ? error.message
        : 'The league archive could not answer this request.'}{' '}
      No substitute statistics are shown.
    </Notice>
  );
}
