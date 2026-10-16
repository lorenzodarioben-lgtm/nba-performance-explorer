import { teamLogo } from '../features/teams/teamLogos';

export interface TeamLogoTeam {
  id: string;
  name?: string | null;
  abbreviation?: string | null;
}

/**
 * A team's mark as it was in `season` (omit for the current season). With no verified mark the
 * component keeps the same footprint: an empty slot (`fallback="blank"`, for aligned lists), the
 * abbreviation in a neutral chip (`"abbr"`), or nothing (`"none"`). It never borrows a mark from
 * another era of the franchise.
 *
 * Decorative by default (`alt=""`), because the team's name is always printed beside it; pass
 * `label` where the mark stands alone.
 */
export function TeamLogo({
  team,
  season,
  size = 24,
  fallback = 'blank',
  label = false,
  className = '',
  priority = false,
}: {
  team: TeamLogoTeam;
  season?: string | null | undefined;
  size?: number;
  fallback?: 'blank' | 'abbr' | 'none';
  label?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const logo = teamLogo(team.id, season, team.name);
  const box = { width: size, height: size };
  if (!logo) {
    if (fallback === 'none') return null;
    if (fallback === 'abbr' && team.abbreviation)
      return (
        <span
          className={`tlogo tlogo--abbr ${className}`}
          style={{ ...box, fontSize: Math.max(9, Math.round(size * 0.3)) }}
          aria-hidden={label ? undefined : true}
          role={label ? 'img' : undefined}
          aria-label={
            label ? `${team.name ?? team.abbreviation} (no logo on file)` : undefined
          }
          data-team-logo="fallback"
        >
          {team.abbreviation}
        </span>
      );
    return (
      <span
        className={`tlogo tlogo--blank ${className}`}
        style={box}
        aria-hidden="true"
        data-team-logo="fallback"
      />
    );
  }
  return (
    <img
      className={`tlogo ${logo.halo ? 'tlogo--halo' : ''} ${className}`}
      src={size > 48 ? logo.srcLarge : logo.src}
      srcSet={size > 48 ? undefined : `${logo.src} 1x, ${logo.srcLarge} 4x`}
      width={size}
      height={size}
      alt={label ? `${logo.identity} logo` : ''}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      data-team-logo={logo.identity}
    />
  );
}
