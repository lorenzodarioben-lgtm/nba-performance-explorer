import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { Icon } from '../../ui/Icon';
import { LoadingLine, Notice } from '../../ui/DataState';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { useHubIdentity } from '../player-hub/hub-context';
import { PlayerProfileError } from './api';
import { PlayerCareerTrends } from './PlayerCareerTrends';
import { PlayerProfileHero } from './PlayerProfileHero';
import { PlayerSeasonStatistics } from './PlayerSeasonStatistics';
import { isValidPlayerId, usePlayerProfileQuery } from './usePlayerProfileQuery';

// Focus the page heading once the terminal route state mounts so keyboard and screen-reader
// users land on the profile (or its message) after client-side navigation. The empty
// dependency list means it runs on mount only and never steals focus on a background rerender.
function useHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return headingRef;
}

function BackToSearchLink() {
  return (
    <Link to="/" className="link-arrow">
      <Icon name="arrowLeft" size={15} />
      Back to search
    </Link>
  );
}

// The frame for the non-success states (loading, invalid, not found, error): a single <main>
// and route heading, placed under the masthead.
function StateShell({ children }: { children: ReactNode }) {
  return (
    <main className="pstate">
      <section aria-labelledby="player-profile-heading" className="wrap pstate__inner">
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
      <p className="t-eyebrow is-red">Player profile</p>
      <h1
        id="player-profile-heading"
        ref={headingRef}
        tabIndex={-1}
        className="pstate__title"
      >
        {heading}
      </h1>
      <Notice tone={role === 'alert' ? 'error' : 'info'} role={role}>
        {message}
      </Notice>
      <div className="pstate__actions">
        <BackToSearchLink />
      </div>
    </StateShell>
  );
}

function ProfileLoading() {
  return (
    <StateShell>
      <p className="t-eyebrow is-red">Player profile</p>
      <h1 id="player-profile-heading" className="pstate__title pstate__title--ghost">
        Player profile
      </h1>
      <LoadingLine>Loading player profile...</LoadingLine>
    </StateShell>
  );
}

function ProfileView({ profile }: { profile: PlayerProfile }) {
  const headingRef = useHeadingFocus();
  useHubIdentity({
    playerId: profile.id,
    name: profile.fullName,
    team: profile.team?.abbreviation,
    jersey: profile.jerseyNumber,
  });

  return (
    <main className="pprofile">
      <PlayerProfileHero
        profile={profile}
        headingRef={headingRef}
        actions={
          <>
            <Link
              to={`/compare?player1=${encodeURIComponent(profile.id)}`}
              className="btn btn--primary"
            >
              <Icon name="compare" size={16} />
              Compare {profile.fullName} with another player
            </Link>
            <SaveResearchButton
              kind="player"
              label={profile.fullName}
              path={`/players/${profile.id}`}
            />
          </>
        }
      />

      <div className="wrap pprofile__body">
        <PlayerSeasonStatistics playerId={profile.id} />

        <PlayerCareerTrends playerId={profile.id} />

        <div className="pprofile__foot">
          <BackToSearchLink />
          <Link to={`/players/${profile.id}/career`} className="link-arrow">
            Full reported career
            <Icon name="arrowRight" size={15} />
          </Link>
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
        message="NBA.com player data could not be loaded right now, so nothing is shown in its place. Try again later; recorded 2023–24 rooms and every archive tool keep working."
      />
    );
  }

  return <ProfileView profile={profileQuery.data} />;
}
