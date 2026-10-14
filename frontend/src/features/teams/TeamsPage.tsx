import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  CanonicalTeamIdSchema,
  TeamDetailResponseSchema,
  TeamDirectoryResponseSchema,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { TeamArchivePanel } from '../wiki-archive/TeamArchivePanel';
import { TeamSeasonArchivePanel } from '../wiki-archive/TeamSeasonArchivePanel';
import { Stagger, StaggerItem } from '../../motion/choreography';

export function TeamsPage() {
  const [params, setParams] = useSearchParams();
  const invalid =
    params.getAll('search').length > 1 ||
    [...params.keys()].some((k) => k !== 'search') ||
    (params.get('search')?.length ?? 0) > 80;
  const query = useQuery({
    queryKey: ['research', 'teams', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/teams?${params}`, signal, (v) =>
        TeamDirectoryResponseSchema.parse(v),
      ),
    enabled: !invalid,
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <ResearchShell title="NBA teams">
      <p>
        Current team identity directory. Historical aliases, season rosters, records and
        schedules are outside this data snapshot.
      </p>
      <form
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          const search = String(
            new FormData(e.currentTarget).get('search') ?? '',
          ).trim();
          setParams(search ? { search } : {});
        }}
      >
        <label>
          Team name or abbreviation
          <input
            name="search"
            defaultValue={params.get('search') ?? ''}
            maxLength={80}
          />
        </label>
        <button type="submit">Find teams</button>
        <button type="button" onClick={() => setParams({})}>
          Show all teams
        </button>
      </form>
      {invalid ? (
        <p role="alert">Invalid directory URL. Choose Show all teams to reset.</p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {query.data && (
        <>
          <SourceNote provenance={query.data.provenance} />
          {query.data.teams.length === 0 ? (
            <p role="status">No current teams match this search.</p>
          ) : (
            <Stagger as="ul" className="teamwall" gap={0.02}>
              {query.data.teams.map((team) => (
                <StaggerItem as="li" key={team.id}>
                  <Link
                    to={`/teams/${team.id}`}
                    className="teamwall__plate"
                    aria-label={`${team.name} team hub`}
                  >
                    <b>{team.abbreviation}</b>
                    <span>{team.name}</span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
          {query.data.teams.length === 0 ? null : (
            <ResearchTable label="Team directory">
              <table>
                <caption>{query.data.teams.length} matching current teams</caption>
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col">Abbreviation</th>
                    <th scope="col">Canonical ID</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.teams.map((team) => (
                    <tr key={team.id}>
                      <th scope="row">
                        <Link to={`/teams/${team.id}`}>{team.name}</Link>
                      </th>
                      <td>{team.abbreviation}</td>
                      <td>{team.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
        </>
      )}
    </ResearchShell>
  );
}

export function TeamDetailPage() {
  const { teamId } = useParams();
  const valid = CanonicalTeamIdSchema.safeParse(teamId).success;
  const query = useQuery({
    queryKey: ['research', 'team', teamId],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/teams/${encodeURIComponent(teamId ?? '')}`, signal, (v) =>
        TeamDetailResponseSchema.parse(v),
      ),
    enabled: valid,
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <ResearchShell
      title={query.data?.team.name ?? 'Team identity'}
      backdrop={
        query.data ? (
          <span className="teamghost">{query.data.team.abbreviation}</span>
        ) : null
      }
    >
      <Link to="/teams">Back to team directory</Link>
      {!valid ? (
        <p role="alert">Invalid team ID. Team routes use namespaced NBA identities.</p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {query.data && (
        <>
          <p>
            {query.data.team.abbreviation} · {query.data.team.id} · NBA source ID{' '}
            {query.data.team.sourceId}
          </p>
          <SourceNote provenance={query.data.provenance} />
          <SaveResearchButton
            kind="team"
            label={query.data.team.name}
            path={`/teams/${query.data.team.id}`}
          />
          <p className="notlive">
            <span>Live season data unavailable</span>
            {query.data.availability.reason}
          </p>
          <TeamArchivePanel team={query.data.team} />
          <TeamSeasonArchivePanel team={query.data.team} />
        </>
      )}
    </ResearchShell>
  );
}
