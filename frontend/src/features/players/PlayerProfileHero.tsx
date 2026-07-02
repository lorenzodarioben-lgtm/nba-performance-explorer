import type { RefObject } from 'react';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { CourtLines } from '../foundation/CourtLines';
import { Reveal } from '../foundation/Reveal';
import { formatDraft, formatHeight, formatTeamName, formatWeight } from './format';
import { getPlayerImage } from './playerImages';

interface ProfileRow {
  label: string;
  value: string;
}

// Bio metadata as label/value pairs. The shared contracts store raw/structured values; the
// formatters turn them into display strings. Only fields the provider returned are included, so no
// player fact is invented and no "undefined" can render.
function buildProfileRows(profile: PlayerProfile): ProfileRow[] {
  const rows: ProfileRow[] = profile.team
    ? [
        { label: 'Team', value: formatTeamName(profile.team) },
        { label: 'Abbreviation', value: profile.team.abbreviation },
      ]
    : [{ label: 'Team', value: 'No current team' }];

  if (profile.position !== undefined) {
    rows.push({ label: 'Position', value: profile.position });
  }
  if (profile.jerseyNumber !== undefined) {
    rows.push({ label: 'Jersey number', value: profile.jerseyNumber });
  }
  if (profile.heightInches !== undefined) {
    rows.push({ label: 'Height', value: formatHeight(profile.heightInches) });
  }
  if (profile.weightPounds !== undefined) {
    rows.push({ label: 'Weight', value: formatWeight(profile.weightPounds) });
  }
  if (profile.country !== undefined) {
    rows.push({ label: 'Country', value: profile.country });
  }
  if (profile.draft !== undefined) {
    rows.push({ label: 'Draft', value: formatDraft(profile.draft) });
  }

  return rows;
}

// The dramatic, player-specific profile hero: a full-bleed dark composition with the mapped player
// photograph (or an intentional photo-free fallback), an oversized jersey-number scoreboard graphic,
// the player name as the route heading in condensed display type, and the bio as broadcast technical
// labels in a preserved description list. The name and photo animate in on mount (reduced-motion
// safe); the data is present regardless of motion.
export function PlayerProfileHero({
  profile,
  headingRef,
}: {
  profile: PlayerProfile;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const image = getPlayerImage(profile.id);
  const rows = buildProfileRows(profile);
  const jersey = profile.jerseyNumber;

  return (
    <section
      aria-labelledby="player-profile-heading"
      className="relative overflow-hidden bg-night text-chalk"
    >
      <div className="absolute inset-0">
        {image ? (
          <>
            <img
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              fetchPriority="high"
              decoding="async"
              style={{ objectPosition: image.objectPosition }}
              className="hero-photo absolute inset-0 h-full w-full object-cover sm:left-auto sm:right-0 sm:w-[56%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/55" />
            <div className="absolute inset-0 bg-[radial-gradient(52%_46%_at_72%_40%,rgba(185,28,28,0.28),transparent_62%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_74%_42%,rgba(185,28,28,0.16),transparent_66%)]" />
            <Reveal className="pointer-events-none absolute -right-12 top-1/2 hidden h-[560px] -translate-y-1/2 text-white/[0.07] lg:block">
              <CourtLines className="h-full w-auto" />
            </Reveal>
          </>
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-[72rem] px-4 pb-14 pt-28 sm:px-8 sm:pb-16 sm:pt-32">
        <p className="eyebrow text-accent">Player profile</p>

        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
          {jersey !== undefined ? (
            <span className="leading-none">
              <span className="eyebrow block text-white/55">No.</span>
              <span className="display mt-1 block text-6xl font-extrabold leading-[0.8] text-accent-bright sm:text-8xl">
                {jersey}
              </span>
            </span>
          ) : null}
          <h1
            id="player-profile-heading"
            ref={headingRef}
            tabIndex={-1}
            className="display max-w-full text-[clamp(2.5rem,7.5vw,6.5rem)] font-extrabold break-words uppercase leading-[0.86] text-chalk outline-none"
          >
            <span className="hero-line">
              <span>{profile.fullName}</span>
            </span>
          </h1>
        </div>

        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="eyebrow text-white/55">{row.label}</dt>
              <dd className="mt-1.5 text-base font-semibold tabular-nums text-chalk">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
