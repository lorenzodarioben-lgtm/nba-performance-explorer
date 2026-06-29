import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { PlayerProfileError } from './api';
import { formatDraft, formatHeight, formatTeamName, formatWeight } from './format';
import { PlayerCareerTrends } from './PlayerCareerTrends';
import { PlayerSeasonStatistics } from './PlayerSeasonStatistics';
import { isValidPlayerId, usePlayerProfileQuery } from './usePlayerProfileQuery';

// Focus the page heading once the terminal route state mounts so keyboard and screen-reader
// users land on the profile (or its message) after client-side navigation. The empty
// dependency list means it runs on mount only and never steals focus on a background
// rerender.
function useHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}

function BackToSearchLink() {
  return (
    <Link
      to="/"
      className="font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-strong"
    >
      Back to search
    </Link>
  );
}

function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[72rem] px-4 py-10 sm:px-8 sm:py-12">
      <section aria-labelledby="player-profile-heading" className="w-full">
        {children}
      </section>
    </main>
  );
}

function ProfileStatus({
  heading,
  message,
  role,
}: {
  heading: string;
  message: string;
  role: 'alert' | 'status';
}) {
  const headingRef = useHeadingFocus();

  return (
    <ProfileShell>
      <h1
        id="player-profile-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl font-bold tracking-tight text-ink outline-none"
      >
        {heading}
      </h1>
      <p
        role={role}
        className={`mt-4 max-w-prose rounded-sm border border-edge px-4 py-3 text-ink-2 ${
          role === 'alert' ? 'bg-accent-quiet' : 'bg-surface'
        }`}
      >
        {message}
      </p>
      <div className="mt-8">
        <BackToSearchLink />
      </div>
    </ProfileShell>
  );
}

function ProfileLoading() {
  return (
    <ProfileShell>
      <h1
        id="player-profile-heading"
        className="text-3xl font-bold tracking-tight text-ink"
      >
        Player profile
      </h1>
      <p role="status" aria-live="polite" className="mt-4 text-ink-2">
        Loading player profile...
      </p>
    </ProfileShell>
  );
}

interface ProfileRow {
  label: string;
  value: string;
}

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

function ProfileView({ profile }: { profile: PlayerProfile }) {
  const headingRef = useHeadingFocus();

  return (
    <ProfileShell>
      {/* Player record: name as the route heading, with the bio metadata grouped beneath it
          in a single restrained surface. The semantic description list is preserved. */}
      <h1
        id="player-profile-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-4xl font-bold tracking-tight text-ink outline-none sm:text-5xl"
      >
        {profile.fullName}
      </h1>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 rounded-md border border-edge bg-surface p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-4">
        {buildProfileRows(profile).map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-medium text-ink-3">{row.label}</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <PlayerSeasonStatistics playerId={profile.id} />
      <PlayerCareerTrends playerId={profile.id} />

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-edge pt-6">
        <Link
          to={`/compare?player1=${encodeURIComponent(profile.id)}`}
          className="font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-strong"
        >
          Compare {profile.fullName} with another player
        </Link>
        <BackToSearchLink />
      </div>
    </ProfileShell>
  );
}

export function PlayerProfilePage() {
  const { playerId } = useParams();
  const profileQuery = usePlayerProfileQuery(playerId);

  if (!isValidPlayerId(playerId)) {
    return (
      <ProfileStatus
        role="alert"
        heading="Invalid player link"
        message="That player link is not valid. Please search for a player instead."
      />
    );
  }

  if (profileQuery.isPending) {
    return <ProfileLoading />;
  }

  if (profileQuery.isError) {
    const kind =
      profileQuery.error instanceof PlayerProfileError
        ? profileQuery.error.kind
        : 'error';

    if (kind === 'not-found') {
      return (
        <ProfileStatus
          role="status"
          heading="Player not found"
          message="We could not find a player for that link."
        />
      );
    }

    return (
      <ProfileStatus
        role="alert"
        heading="Player profile unavailable"
        message="Something went wrong loading this player. Please try again."
      />
    );
  }

  return <ProfileView profile={profileQuery.data} />;
}
