import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { PlayerProfileError } from './api';
import { PlayerCareerTrends } from './PlayerCareerTrends';
import { PlayerProfileHero } from './PlayerProfileHero';
import { PlayerSeasonStatistics } from './PlayerSeasonStatistics';
import { isValidPlayerId, usePlayerProfileQuery } from './usePlayerProfileQuery';

// A shared dark link treatment for the profile's navigation links: white text with a red underline
// keeps strong contrast on the near-black surfaces (the brand red alone is too dark for text here).
const darkLinkClass =
  'font-semibold text-chalk underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:decoration-accent-strong';

// Focus the page heading once the terminal route state mounts so keyboard and screen-reader users
// land on the profile (or its message) after client-side navigation. The empty dependency list means
// it runs on mount only and never steals focus on a background rerender.
function useHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}

function BackToSearchLink() {
  return (
    <Link to="/" className={darkLinkClass}>
      Back to search
    </Link>
  );
}

// A dark, padded shell for the non-success states (loading, invalid, not found, error). It clears the
// fixed masthead and keeps a single <main> and route heading.
function StateShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-night text-chalk">
      <section
        aria-labelledby="player-profile-heading"
        className="mx-auto min-h-[60svh] max-w-[72rem] px-4 pb-16 pt-28 sm:px-8 sm:pt-32"
      >
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
    <StateShell>
      <p className="eyebrow text-accent">Player profile</p>
      <h1
        id="player-profile-heading"
        ref={headingRef}
        tabIndex={-1}
        className="display mt-3 text-4xl font-extrabold uppercase leading-[0.9] text-chalk outline-none sm:text-6xl"
      >
        {heading}
      </h1>
      <p
        role={role}
        className={`mt-6 max-w-prose rounded-sm border px-4 py-3 ${
          role === 'alert'
            ? 'border-white/10 bg-accent/15 text-red-100'
            : 'border-white/10 bg-coal text-white/80'
        }`}
      >
        {message}
      </p>
      <div className="mt-8">
        <BackToSearchLink />
      </div>
    </StateShell>
  );
}

function ProfileLoading() {
  return (
    <StateShell>
      <p className="eyebrow text-accent">Player profile</p>
      <h1
        id="player-profile-heading"
        className="display mt-3 text-4xl font-extrabold uppercase leading-[0.9] text-chalk sm:text-6xl"
      >
        Player profile
      </h1>
      <p role="status" aria-live="polite" className="mt-6 text-white/70">
        Loading player profile...
      </p>
    </StateShell>
  );
}

function ProfileView({ profile }: { profile: PlayerProfile }) {
  const headingRef = useHeadingFocus();

  return (
    <main className="bg-night text-chalk">
      <PlayerProfileHero profile={profile} headingRef={headingRef} />

      <div className="mx-auto max-w-[72rem] px-4 sm:px-8">
        {/* Dark scoreboard statistics (redesigned). Its own game log stays in the light contrast
            band below, per this stage's scope. */}
        <PlayerSeasonStatistics playerId={profile.id} />

        {/* The career trend chart and its equivalent table are not redesigned in this stage; they
            live inside the one deliberate light contrast band, so their existing light styling reads
            as an intentional data appendix rather than a stray white card on the dark page. */}
        <div className="mt-4 rounded-md bg-bg p-4 text-ink [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0 sm:p-6">
          <PlayerCareerTrends playerId={profile.id} />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pb-20 pt-6">
          <Link
            to={`/compare?player1=${encodeURIComponent(profile.id)}`}
            className={darkLinkClass}
          >
            Compare {profile.fullName} with another player
          </Link>
          <BackToSearchLink />
        </div>
      </div>
    </main>
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
