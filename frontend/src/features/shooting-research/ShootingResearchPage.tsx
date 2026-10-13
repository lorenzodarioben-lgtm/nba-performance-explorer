import { Link, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  ResearchPlayerIdSchema,
  SeasonIdSchema,
  SeasonScopeSchema,
} from '@nba-performance-explorer/contracts';
import { useCareerResearch } from '../career-research/useCareerResearch';
import {
  ResearchShell,
  ResearchTable,
  QueryFeedback,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { shootingProfile } from './shooting-core';
import styles from '../research/research.module.css';
const schema = z
  .object({
    season: SeasonIdSchema.optional(),
    scope: SeasonScopeSchema.default('regular-season'),
    minAttempts: z
      .string()
      .regex(/^\d{1,4}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(1000))
      .prefault('20'),
  })
  .strict();
const percent = (value: number | null) =>
  value === null ? 'Unavailable' : `${(value * 100).toFixed(2)}%`;
export function ShootingResearchPage() {
  const { playerId } = useParams();
  const [params, setParams] = useSearchParams();
  const parsed = schema.safeParse(Object.fromEntries(params));
  const valid =
    ResearchPlayerIdSchema.safeParse(playerId).success &&
    parsed.success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const scope = parsed.success ? parsed.data.scope : 'regular-season';
  const query = useCareerResearch(
    playerId ?? 'invalid',
    'trueShooting',
    1,
    valid,
    scope,
  );
  const data = valid ? query.data : undefined;
  const season = parsed.success
    ? (parsed.data.season ?? data?.seasons.at(-1)?.totals.season)
    : undefined;
  const selected = data?.seasons.find((r) => r.totals.season === season);
  let profile: ReturnType<typeof shootingProfile> | undefined,
    invalidCounts = false;
  if (selected && parsed.success) {
    try {
      profile = shootingProfile(selected.totals, parsed.data.minAttempts);
    } catch {
      invalidCounts = true;
    }
  }
  const saved = new URLSearchParams(params);
  saved.set('scope', scope);
  if (season) saved.set('season', season);
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(saved);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  return (
    <ResearchShell title={`${data?.player.fullName ?? 'Player'} · shooting counts`}>
      <p>
        Two-point, three-point and free-throw breakdowns from sourced raw season totals.
        Shot locations, distances, court zones, shot-to-game events and league zone
        baselines are unavailable; no court dots or inferred shot coordinates are shown.
      </p>
      {playerId && (
        <>
          <Link to={`/players/${playerId}`}>Original player profile</Link>{' '}
          <Link
            to={`/players/${playerId}/games${season ? `?season=${season}&scope=${scope}` : ''}`}
          >
            Date/opponent shooting splits and rolling games
          </Link>
        </>
      )}
      {!valid ? (
        <p role="alert">
          Invalid shooting URL. Use a recorded season/scope and an attempt minimum from1
          to1000.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <div className={styles.controls}>
            <label>
              Shooting season
              <select
                value={season ?? ''}
                onChange={(e) => update('season', e.target.value)}
              >
                <option value="">Choose a sourced season</option>
                {season && !data.seasons.some((s) => s.totals.season === season) && (
                  <option value={season}>{season} (unavailable)</option>
                )}
                {data.seasons.map((s) => (
                  <option key={s.totals.season}>{s.totals.season}</option>
                ))}
              </select>
            </label>
            <label>
              Shooting scope
              <select value={scope} onChange={(e) => update('scope', e.target.value)}>
                <option value="regular-season">Regular season</option>
                <option value="playoffs">Playoffs</option>
              </select>
            </label>
            <label>
              Minimum attempts per shot type
              <input
                type="number"
                min={1}
                max={1000}
                value={parsed.success ? parsed.data.minAttempts : 20}
                onChange={(e) => update('minAttempts', e.target.value)}
              />
            </label>
          </div>
          <SaveResearchButton
            kind="analysis"
            label={`${data.player.fullName} shooting counts`}
            path={`/players/${playerId}/shooting?${saved}`}
          />
          <label>
            Shareable shooting URL
            <input
              readOnly
              value={`${window.location.origin}/players/${playerId}/shooting?${saved}`}
            />
          </label>
          {!selected && (
            <p role="status">
              Raw totals unavailable for this season and scope. No per-game averages are
              multiplied into totals.
            </p>
          )}
          {invalidCounts && (
            <p role="alert">
              Raw shooting counts are inconsistent. Derived breakdowns are withheld.
            </p>
          )}
          {selected && profile && (
            <>
              <p>
                {season} · {scope} · {selected.totals.gamesPlayed} reported games.
                Two-point makes/attempts = total field goals minus three-pointers.
                Percentages use actual makes/attempts; missing/zero or below-minimum
                denominators are unavailable. Counts remain visible below the attempt
                threshold. A traded season uses its unique aggregate once.
              </p>
              <ResearchTable label="Sourced shooting breakdown">
                <table>
                  <caption>
                    Actual raw counts and scoring contributions; shot types are not
                    court zones
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Shot type',
                        'Made',
                        'Attempted',
                        'Made / attempted',
                        'Qualification',
                        'Share of field-goal attempts',
                        'Points from makes',
                        'Share of reported points',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.rows.map((r) => (
                      <tr key={r.type}>
                        <th scope="row">{r.type}</th>
                        <td>{r.made ?? 'Unavailable'}</td>
                        <td>{r.attempted ?? 'Unavailable'}</td>
                        <td>{percent(r.percentage)}</td>
                        <td>{r.qualification}</td>
                        <td>
                          {r.type === 'Free throws'
                            ? 'Separate from field goals'
                            : percent(r.fieldGoalAttemptShare)}
                        </td>
                        <td>{r.points ?? 'Unavailable'}</td>
                        <td>{percent(r.pointShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                Free-throw rate (FTA/FGA):{' '}
                {profile.freeThrowRate === null
                  ? 'Unavailable'
                  : profile.freeThrowRate.toFixed(4)}
                . Free throws are separate from field-goal attempt shares; this ratio
                may exceed1.
              </p>
              <p>
                Raw-total efficiency: TS% estimate{' '}
                {percent(selected.metrics.trueShooting)}; eFG%{' '}
                {percent(selected.metrics.effectiveFieldGoal)}. TS uses the
                conventional0.44 free-throw multiplier; these efficiency values use the
                full sourced season and are independent of the display qualification for
                each shot type.
              </p>
            </>
          )}
        </>
      )}
    </ResearchShell>
  );
}
