import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { PlayerProfileError } from './api';
import { formatDraft, formatHeight, formatTeamName, formatWeight } from './format';
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
      className="mt-8 inline-block font-semibold text-red-700 underline underline-offset-4"
    >
      Back to search
    </Link>
  );
}

function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
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
        className="text-3xl font-bold text-zinc-950 outline-none"
      >
        {heading}
      </h1>
      <p role={role} className="mt-4 border-l-4 border-red-600 pl-4 text-zinc-700">
        {message}
      </p>
      <BackToSearchLink />
    </ProfileShell>
  );
}

function ProfileLoading() {
  return (
    <ProfileShell>
      <h1 id="player-profile-heading" className="text-3xl font-bold text-zinc-950">
        Player profile
      </h1>
      <p role="status" aria-live="polite" className="mt-4 text-zinc-700">
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
  const rows: ProfileRow[] = [
    { label: 'Team', value: formatTeamName(profile.team) },
    { label: 'Abbreviation', value: profile.team.abbreviation },
  ];

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
      <p className="text-sm font-semibold uppercase text-zinc-600">Player profile</p>
      <h1
        id="player-profile-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-4xl font-bold text-zinc-950 outline-none"
      >
        {profile.fullName}
      </h1>
      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {buildProfileRows(profile).map((row) => (
          <div key={row.label} className="border-t border-zinc-200 pt-3">
            <dt className="text-sm font-semibold uppercase text-zinc-500">
              {row.label}
            </dt>
            <dd className="mt-1 text-lg text-zinc-950">{row.value}</dd>
          </div>
        ))}
      </dl>
      <BackToSearchLink />
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
