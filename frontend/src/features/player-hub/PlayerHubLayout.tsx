import { ShotDirectorySchema } from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useParams, useSearchParams } from 'react-router';

import { springs, transitions } from '../../motion/tokens';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { Icon } from '../../ui/Icon';
import { fetchResearch } from '../research/api';
import { fetchPlayerProfile } from '../players/api';
import { isValidPlayerId } from '../players/usePlayerProfileQuery';
import { HubContext, type HubIdentity } from './hub-context';

/**
 * The player hub: one persistent frame around Overview, Form, Game research, Career and
 * Shooting. The tab bar stays mounted while the tab content changes, so the active marker slides
 * between rooms and the score bug (the compact identity) keeps its place. Every hub URL is the
 * same one the platform has always published.
 */
export function PlayerHubLayout() {
  const { playerId } = useParams();
  const valid = isValidPlayerId(playerId);
  const [reported, setReported] = useState<HubIdentity | null>(null);
  const [heroInView, setHeroInView] = useState(false);
  const context = useMemo(() => ({ setIdentity: setReported, setHeroInView }), []);

  // A profile already in the cache (the overview loaded it) names the player immediately;
  // the hub never requests it on its own.
  const cachedProfile = useQuery({
    queryKey: ['players', 'profile', playerId],
    queryFn: ({ signal }) => fetchPlayerProfile(playerId ?? '', signal),
    enabled: false,
  }).data;

  const identity: HubIdentity | null =
    cachedProfile && cachedProfile.id === playerId
      ? {
          playerId: cachedProfile.id,
          name: cachedProfile.fullName,
          team: cachedProfile.team?.abbreviation,
          jersey: cachedProfile.jerseyNumber,
        }
      : reported?.playerId === playerId
        ? reported
        : null;

  return (
    <HubContext.Provider value={context}>
      {valid ? (
        <HubBar playerId={playerId} identity={identity} heroInView={heroInView} />
      ) : null}
      <Outlet />
    </HubContext.Provider>
  );
}

const ROOMS = [
  { key: 'overview', label: 'Overview', suffix: '' },
  { key: 'form', label: 'Form', suffix: '/insights' },
  { key: 'games', label: 'Game research', suffix: '/games' },
  { key: 'career', label: 'Career', suffix: '/career' },
  { key: 'shooting', label: 'Shooting', suffix: '/shooting' },
  { key: 'archive', label: '2023–24', suffix: '/archive' },
] as const;

function useShotArchivePlayers() {
  return useQuery({
    queryKey: ['research', 'shots', 'directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/shots/directory', signal, ShotDirectorySchema.parse),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function HubBar({
  playerId,
  identity,
  heroInView,
}: {
  playerId: string;
  identity: HubIdentity | null;
  heroInView: boolean;
}) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const allowed = useMotionAllowed();
  const base = `/players/${playerId}`;
  const current = ROOMS.find((room) => pathname === `${base}${room.suffix}`)?.key;
  const isOverview = current === 'overview';
  const showBug = Boolean(identity) && !(isOverview && heroInView);
  const season = params.get('season');
  const shots = useShotArchivePlayers();
  const shotEntry = shots.data?.players.find((player) => player.id === playerId);

  const hrefFor = (room: (typeof ROOMS)[number]) => {
    // Season-scoped rooms keep the season being studied; Game research needs one.
    if (
      season &&
      (room.key === 'form' || room.key === 'games' || room.key === 'shooting')
    ) {
      return `${base}${room.suffix}?season=${encodeURIComponent(season)}`;
    }
    return `${base}${room.suffix}`;
  };

  return (
    <nav className="hubbar" aria-label="Player sections">
      <div className="wrap hubbar__inner">
        {/* The bug fades and slides with transforms only; popLayout takes a leaving bug out of
            the flow at once so the tabs can slide back (a transform layout animation). */}
        <AnimatePresence initial={false} mode="popLayout">
          {showBug && identity ? (
            <motion.div
              key="bug"
              className="scorebug"
              initial={allowed ? { opacity: 0, x: -18 } : { opacity: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={allowed ? { opacity: 0, x: -12 } : { opacity: 0 }}
              transition={transitions.filmSlow}
            >
              <span className="scorebug__num" aria-hidden="true">
                {identity.jersey ?? initials(identity.name)}
              </span>
              <span className="scorebug__name">{identity.name}</span>
              {identity.team ? (
                <span className="scorebug__team" aria-hidden="true">
                  {identity.team}
                </span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <LayoutGroup id="hub-tabs">
          <motion.div
            className="hubbar__tabs"
            layout={allowed ? 'position' : false}
            transition={transitions.filmSlow}
          >
            {ROOMS.map((room) => {
              const on = current === room.key;
              return (
                <Link
                  key={room.key}
                  to={hrefFor(room)}
                  className="hubbar__tab"
                  aria-current={on ? 'page' : undefined}
                >
                  {room.label}
                  {on ? (
                    <motion.span
                      layoutId="hub-tab-active"
                      className="hubbar__active"
                      transition={springs.nav}
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              );
            })}
            {shotEntry ? (
              <Link
                to={`/lab/shots?players=${encodeURIComponent(playerId)}`}
                className="hubbar__tab hubbar__tab--out"
              >
                Shot map
                <span className="hubbar__tag">2018 PO</span>
                <Icon name="arrowUpRight" size={13} />
              </Link>
            ) : null}
          </motion.div>
        </LayoutGroup>
      </div>
    </nav>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
