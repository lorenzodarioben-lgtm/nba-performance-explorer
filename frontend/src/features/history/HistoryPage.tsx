import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  HistoryQuerySchema,
  HistoryResponseSchema,
  SeasonIdSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { ResearchShell, SourceNote } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { getSceneImage } from '../../ui/sceneImages';
import { SeasonHero } from './SeasonTimeline';
import { HistoryArchive, HistoryFilters, HistoryFactsTable } from './HistoryArchive';
import { SeasonResearchHub } from './SeasonResearchHub';

const ARCHIVE_SHOT = getSceneImage('kobe-shaq');

/**
 * The navigator's header photograph. It appears only on the all-seasons index, never on a single
 * season. The registry retains subject descriptions and asset provenance.
 */
function HistoryBackdrop() {
  if (!ARCHIVE_SHOT) return null;
  return (
    <figure className="histshot">
      <img
        src={ARCHIVE_SHOT.src}
        srcSet={ARCHIVE_SHOT.srcSet}
        sizes="(max-width: 767px) 100vw, min(66vw, 860px)"
        width={ARCHIVE_SHOT.width}
        height={ARCHIVE_SHOT.height}
        alt={ARCHIVE_SHOT.alt}
        fetchPriority="high"
        decoding="async"
        style={{ objectPosition: ARCHIVE_SHOT.objectPosition }}
      />
    </figure>
  );
}

export function HistoryPage() {
  const { season } = useParams();
  const [params, setParams] = useSearchParams();
  const valid =
    HistoryQuerySchema.safeParse(Object.fromEntries(params)).success &&
    (!season || SeasonIdSchema.safeParse(season).success) &&
    [...params.keys()].every((key) => params.getAll(key).length === 1);
  const path = `/history${season ? `/${season}` : ''}${params.size ? `?${params}` : ''}`;
  const query = useQuery({
    queryKey: ['research', 'history', season, params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/history/seasons${season ? `/${season}` : ''}?${params}`,
        signal,
        HistoryResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  if (!season)
    return (
      <ResearchShell
        title="Historical season navigator"
        className="history-archive"
        backdrop={<HistoryBackdrop />}
        lede={
          <p>
            Find a season. Follow a decade.
            <br />
            Go back to the source.
          </p>
        }
      >
        <HistoryArchive
          data={data}
          valid={valid}
          pending={query.isPending}
          failed={query.isError}
          params={params}
          onChange={setParams}
          path={path}
        />
      </ResearchShell>
    );
  return (
    <ResearchShell
      title={season ? `${season} · historical facts` : 'Historical season navigator'}
      backdrop={season ? undefined : <HistoryBackdrop />}
    >
      <p>
        Season and champion statements from Wikidata's community-maintained CC0
        structured facts. Missing champions remain unavailable. Entity labels may use
        modern franchise names; historical aliases and NBA team IDs are not inferred.
      </p>
      <Link to="/history">All recorded historical seasons</Link>
      {(!season || season === '2023-24') && (
        <p>
          Separate licensed 2023–24 tables: <Link to="/standings">Standings</Link>{' '}
          <Link to="/leaders">Published leaders</Link>{' '}
          <Link to="/games/recorded">Recorded 2024 playoff games</Link>.
        </p>
      )}
      {season === '2023-24' ? <SeasonResearchHub /> : null}
      {!valid && (
        <p role="alert">
          Invalid historical selection.{' '}
          <button onClick={() => setParams({})}>Clear filters</button>
        </p>
      )}
      {valid && query.isPending && (
        <p role="status" className="loading-line">
          <i aria-hidden="true" />
          Loading historical facts…
        </p>
      )}
      {query.isError && (
        <p role="alert">
          The historical facts source or this season is unavailable. No substitute facts
          are shown. <Link to="/history">Return to season navigator</Link>
        </p>
      )}
      <HistoryFilters params={params} onChange={setParams} />
      {data && (
        <>
          <SaveResearchButton
            kind="analysis"
            label={
              season ? `${season} historical facts` : 'Historical season navigator'
            }
            path={path}
          />
          <label>
            Shareable history URL
            <input readOnly value={`${window.location.origin}${path}`} />
          </label>
          {season && data.seasons.find((s) => s.season === season) ? (
            <SeasonHero season={data.seasons.find((s) => s.season === season)!} />
          ) : null}
          <SourceNote provenance={data.provenance} />
          <p>
            {data.seasons.length} matching seasons of {data.sourceSeasons} source season
            entities. {data.coverage.excludedRows} noncanonical rows excluded;{' '}
            {data.coverage.missingWinners} source seasons lack champion statements.
            Source status: {data.status}.
          </p>
          <div className="seasonnav">
            {data.navigation.previous && (
              <Link
                to={`/history/${data.navigation.previous}${params.size ? `?${params}` : ''}`}
              >
                Previous recorded season: {data.navigation.previous}
              </Link>
            )}
            {data.navigation.next && (
              <Link
                to={`/history/${data.navigation.next}${params.size ? `?${params}` : ''}`}
              >
                Next recorded season: {data.navigation.next}
              </Link>
            )}
          </div>
          {!data.seasons.length && (
            <p role="status">No recorded historical facts match this selection.</p>
          )}
          <HistoryFactsTable seasons={data.seasons} />
          <p>
            Season leaderboards, awards, draft classes, complete box scores and official
            championship totals are unavailable in this source slice.
          </p>
        </>
      )}
    </ResearchShell>
  );
}
