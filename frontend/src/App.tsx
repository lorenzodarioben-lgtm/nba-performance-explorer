import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerComparisonPage } from './features/player-comparison/PlayerComparisonPage';
import { PlayerHubLayout } from './features/player-hub/PlayerHubLayout';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';
import { RouteEntrance } from './motion/choreography';
import { MotionPreferenceProvider } from './motion/MotionPreference';
import { DemoBand } from './ui/DataMode';
import { LoadingLine } from './ui/DataState';
import { ToastProvider } from './ui/Toast';

const ExplorerPage = lazy(() =>
  import('./features/explorer/ExplorerPage').then((m) => ({ default: m.ExplorerPage })),
);
const PlayerInsightsPage = lazy(() =>
  import('./features/player-insights/PlayerInsightsPage').then((m) => ({
    default: m.PlayerInsightsPage,
  })),
);
const ComparisonLabPage = lazy(() =>
  import('./features/comparison-lab/ComparisonLabPage').then((m) => ({
    default: m.ComparisonLabPage,
  })),
);
const MyNbaPage = lazy(() =>
  import('./features/my-nba/MyNbaPage').then((m) => ({ default: m.MyNbaPage })),
);
const TeamsPage = lazy(() =>
  import('./features/teams/TeamsPage').then((m) => ({ default: m.TeamsPage })),
);
const TeamDetailPage = lazy(() =>
  import('./features/teams/TeamsPage').then((m) => ({ default: m.TeamDetailPage })),
);
const AnalyticsLabPage = lazy(() =>
  import('./features/analytics-lab/AnalyticsLabPage').then((m) => ({
    default: m.AnalyticsLabPage,
  })),
);
const CareerResearchPage = lazy(() =>
  import('./features/career-research/CareerResearchPage').then((m) => ({
    default: m.CareerResearchPage,
  })),
);

const CareerComparisonPage = lazy(() =>
  import('./features/career-research/CareerComparisonPage').then((m) => ({
    default: m.CareerComparisonPage,
  })),
);

const GameResearchPage = lazy(() =>
  import('./features/game-research/GameResearchPage').then((m) => ({
    default: m.GameResearchPage,
  })),
);

const HistoryPage = lazy(() =>
  import('./features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);

const LeagueStandingsPage = lazy(() =>
  import('./features/league/LeagueStandingsPage').then((m) => ({
    default: m.LeagueStandingsPage,
  })),
);
const LeagueLeadersPage = lazy(() =>
  import('./features/league/LeagueLeadersPage').then((m) => ({
    default: m.LeagueLeadersPage,
  })),
);
const LeagueGamesPage = lazy(() =>
  import('./features/league/LeagueGamesPage').then((m) => ({
    default: m.LeagueGamesPage,
  })),
);
const GameRoute = lazy(() =>
  import('./features/league/LeagueGamePage').then((m) => ({
    default: m.GameRoute,
  })),
);
const LeaguePlayerRoom = lazy(() =>
  import('./features/league/LeaguePlayerRoom').then((m) => ({
    default: m.LeaguePlayerRoom,
  })),
);
const LeagueMovementPage = lazy(() =>
  import('./features/league/LeagueMovementPage').then((m) => ({
    default: m.LeagueMovementPage,
  })),
);
const LeagueLineupsPage = lazy(() =>
  import('./features/league/LeagueLineupsPage').then((m) => ({
    default: m.LeagueLineupsPage,
  })),
);
const LeagueErasPage = lazy(() =>
  import('./features/league/LeagueErasPage').then((m) => ({
    default: m.LeagueErasPage,
  })),
);
const LeagueRecordBookPage = lazy(() =>
  import('./features/league/LeagueRecordBookPage').then((m) => ({
    default: m.LeagueRecordBookPage,
  })),
);
const LeagueTeamRankingsPage = lazy(() =>
  import('./features/league/LeagueTeamRankingsPage').then((m) => ({
    default: m.LeagueTeamRankingsPage,
  })),
);
const LeagueArchivePage = lazy(() =>
  import('./features/wiki-archive/LeagueArchivePage').then((m) => ({
    default: m.LeagueArchivePage,
  })),
);
const GamesArchivePage = lazy(() =>
  import('./features/wiki-archive/GamesArchivePage').then((m) => ({
    default: m.GamesArchivePage,
  })),
);
const DiscoverPage = lazy(() =>
  import('./features/discovery/DiscoverPage').then((m) => ({
    default: m.DiscoverPage,
  })),
);
const ShootingResearchPage = lazy(() =>
  import('./features/shooting-research/ShootingResearchPage').then((m) => ({
    default: m.ShootingResearchPage,
  })),
);
const RecordedArchivePage = lazy(() =>
  import('./features/recorded-archive/RecordedArchivePage').then((m) => ({
    default: m.RecordedArchivePage,
  })),
);
const RecordedLabsPage = lazy(() =>
  import('./features/recorded-labs/RecordedLabsPage').then((m) => ({
    default: m.RecordedLabsPage,
  })),
);
const RecordedAnalyticsPage = lazy(() =>
  import('./features/recorded-analytics/RecordedAnalyticsPage').then((m) => ({
    default: m.RecordedAnalyticsPage,
  })),
);
const RecordedProfilesPage = lazy(() =>
  import('./features/recorded-analytics/RecordedProfilesPage').then((m) => ({
    default: m.RecordedProfilesPage,
  })),
);
const RecordedTeamRankingsPage = lazy(() =>
  import('./features/recorded-analytics/RecordedTeamRankingsPage').then((m) => ({
    default: m.RecordedTeamRankingsPage,
  })),
);
const ShotArchivePage = lazy(() =>
  import('./features/shot-archive/ShotArchivePage').then((m) => ({
    default: m.ShotArchivePage,
  })),
);
const RecordedDiscoveryPage = lazy(() =>
  import('./features/recorded-discovery/RecordedDiscoveryPage').then((m) => ({
    default: m.RecordedDiscoveryPage,
  })),
);
const RecordedCalendarPage = lazy(() =>
  import('./features/recorded-discovery/RecordedCalendarPage').then((m) => ({
    default: m.RecordedCalendarPage,
  })),
);
const HistoricalAwardsPage = lazy(() =>
  import('./features/history/HistoricalAwardsPage').then((m) => ({
    default: m.HistoricalAwardsPage,
  })),
);
const RecordedProgressionPage = lazy(() =>
  import('./features/recorded-discovery/RecordedProgressionPage').then((m) => ({
    default: m.RecordedProgressionPage,
  })),
);
const LineupStudyPage = lazy(() =>
  import('./features/lineup-study/LineupStudyPage').then((m) => ({
    default: m.LineupStudyPage,
  })),
);
const ShotBoxPage = lazy(() =>
  import('./features/shot-archive/ShotBoxPage').then((m) => ({
    default: m.ShotBoxPage,
  })),
);
const HistoricalDraftPage = lazy(() =>
  import('./features/history/HistoricalDraftPage').then((m) => ({
    default: m.HistoricalDraftPage,
  })),
);

const TeamSeasonPage = lazy(() =>
  import('./features/team-season/TeamSeasonPage').then((m) => ({
    default: m.TeamSeasonPage,
  })),
);
const RecordedSeasonRoom = lazy(() =>
  import('./features/player-season/RecordedSeasonRoom').then((m) => ({
    default: m.RecordedSeasonRoom,
  })),
);
const SimilarityPage = lazy(() =>
  import('./features/similarity/SimilarityPage').then((m) => ({
    default: m.SimilarityPage,
  })),
);
const ComparisonStudioPage = lazy(() =>
  import('./features/comparison-studio/ComparisonStudioPage').then((m) => ({
    default: m.ComparisonStudioPage,
  })),
);
const WorkbenchPage = lazy(() =>
  import('./features/workbench/WorkbenchPage').then((m) => ({
    default: m.WorkbenchPage,
  })),
);
const FormulaLabPage = lazy(() =>
  import('./features/formulas/FormulaLabPage').then((m) => ({
    default: m.FormulaLabPage,
  })),
);
const CoveragePage = lazy(() =>
  import('./features/explorer/CoveragePage').then((m) => ({ default: m.CoveragePage })),
);
const TourPage = lazy(() =>
  import('./features/foundation/TourPage').then((m) => ({ default: m.TourPage })),
);
const StoriesPage = lazy(() =>
  import('./features/stories/StoriesPage').then((m) => ({ default: m.StoriesPage })),
);
const StoryEditorPage = lazy(() =>
  import('./features/stories/StoryEditorPage').then((m) => ({
    default: m.StoryEditorPage,
  })),
);
const StoryReaderPage = lazy(() =>
  import('./features/stories/StoryReaderPage').then((m) => ({
    default: m.StoryReaderPage,
  })),
);
const SharedStoryPage = lazy(() =>
  import('./features/stories/StoryReaderPage').then((m) => ({
    default: m.SharedStoryPage,
  })),
);
const SeriesFilmRoomPage = lazy(() =>
  import('./features/playoffs/SeriesFilmRoomPage').then((m) => ({
    default: m.SeriesFilmRoomPage,
  })),
);
const PlayoffBracketPage = lazy(() =>
  import('./features/playoffs/PlayoffBracketPage').then((m) => ({
    default: m.PlayoffBracketPage,
  })),
);
const StandingsRacePage = lazy(() =>
  import('./features/team-season/StandingsRacePage').then((m) => ({
    default: m.StandingsRacePage,
  })),
);

const PlayersLanding = lazy(() =>
  import('./pages/PlayersLanding').then((m) => ({ default: m.PlayersLanding })),
);
const LabsLanding = lazy(() =>
  import('./pages/LabsLanding').then((m) => ({ default: m.LabsLanding })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/** The loading frame for a lazily loaded route: placed under the masthead, never hidden by it. */
function RouteFallback({ label }: { label: string }) {
  return (
    <div className="wrap route-fallback">
      <LoadingLine>{label}</LoadingLine>
    </div>
  );
}

function lazyRoute(label: string, element: ReactNode) {
  return <Suspense fallback={<RouteFallback label={label} />}>{element}</Suspense>;
}

// The player hub is a layout route: the tab bar persists while its rooms change. Its URLs are
// unchanged (/players/:playerId, /insights, /games, /career, /shooting).
const PLAYER_HUB_ROOMS: readonly { path: string; element: ReactNode }[] = [
  {
    path: 'insights',
    element: lazyRoute('Loading insights…', <PlayerInsightsPage />),
  },
  {
    path: 'games',
    element: lazyRoute('Loading game research…', <GameResearchPage />),
  },
  {
    path: 'career',
    element: lazyRoute('Loading reported career…', <CareerResearchPage />),
  },
  {
    path: 'records',
    element: lazyRoute('Loading records…', <LeaguePlayerRoom />),
  },
  {
    path: 'shooting',
    element: lazyRoute('Loading shooting research…', <ShootingResearchPage />),
  },
  {
    path: 'archive',
    element: lazyRoute('Loading recorded season…', <RecordedSeasonRoom />),
  },
];

// Every URL the platform has published keeps working. Order does not matter to React Router;
// it is grouped here by section for reading.
const ROUTES: readonly { path: string; element: ReactNode }[] = [
  { path: '/', element: <FoundationPage /> },
  // Players
  { path: '/players', element: lazyRoute('Loading players…', <PlayersLanding />) },
  { path: '/explore', element: lazyRoute('Loading explorer…', <ExplorerPage />) },
  {
    path: '/explore/coverage',
    element: lazyRoute('Counting the data…', <CoveragePage />),
  },
  // Teams
  { path: '/teams', element: lazyRoute('Loading team directory…', <TeamsPage />) },
  {
    path: '/teams/:teamId',
    element: lazyRoute('Loading team identity…', <TeamDetailPage />),
  },
  {
    path: '/teams/:teamId/season',
    element: lazyRoute('Loading team season…', <TeamSeasonPage />),
  },
  // Games
  {
    path: '/games',
    element: lazyRoute('Loading the scoreboard…', <LeagueGamesPage />),
  },
  {
    path: '/games/recorded',
    element: lazyRoute('Loading recorded games…', <GamesArchivePage />),
  },
  {
    path: '/games/:gameId',
    element: lazyRoute('Loading the game…', <GameRoute />),
  },
  {
    path: '/games/bracket',
    element: lazyRoute('Loading playoff bracket…', <PlayoffBracketPage />),
  },
  {
    path: '/games/series/:seriesId',
    element: lazyRoute('Loading series film room…', <SeriesFilmRoomPage />),
  },
  {
    path: '/games/shooting',
    element: lazyRoute('Loading game shooting…', <ShotBoxPage />),
  },
  {
    path: '/history/calendar',
    element: lazyRoute('Loading calendar games…', <RecordedCalendarPage />),
  },
  // Seasons
  { path: '/history', element: lazyRoute('Loading history…', <HistoryPage />) },
  {
    path: '/history/:season',
    element: lazyRoute('Loading historical season…', <HistoryPage />),
  },
  {
    path: '/standings',
    element: lazyRoute('Loading standings…', <LeagueStandingsPage />),
  },
  {
    path: '/standings/wikipedia',
    element: lazyRoute(
      'Loading historical standings…',
      <LeagueArchivePage mode="standings" />,
    ),
  },
  {
    path: '/standings/recorded',
    element: lazyRoute('Loading team rankings…', <RecordedTeamRankingsPage />),
  },
  {
    path: '/standings/race',
    element: lazyRoute('Loading standings race…', <StandingsRacePage />),
  },
  {
    path: '/leaders',
    element: lazyRoute('Loading league leaders…', <LeagueLeadersPage />),
  },
  {
    path: '/leaders/movement',
    element: lazyRoute('Loading leaderboard movement…', <LeagueMovementPage />),
  },
  {
    path: '/leaders/teams',
    element: lazyRoute('Loading team rankings…', <LeagueTeamRankingsPage />),
  },
  {
    path: '/history/eras',
    element: lazyRoute('Loading the eras…', <LeagueErasPage />),
  },
  {
    path: '/history/record-book',
    element: lazyRoute('Loading the record book…', <LeagueRecordBookPage />),
  },
  {
    path: '/leaders/wikipedia',
    element: lazyRoute(
      'Loading published leaders…',
      <LeagueArchivePage mode="leaders" />,
    ),
  },
  {
    path: '/leaders/recorded',
    element: lazyRoute(
      'Loading recorded ranking…',
      <RecordedArchivePage mode="leaders" />,
    ),
  },
  {
    path: '/history/records',
    element: lazyRoute(
      'Loading recorded records…',
      <RecordedArchivePage mode="records" />,
    ),
  },
  {
    path: '/history/progression',
    element: lazyRoute('Loading record progression…', <RecordedProgressionPage />),
  },
  {
    path: '/history/awards',
    element: lazyRoute('Loading historical awards…', <HistoricalAwardsPage />),
  },
  {
    path: '/history/draft',
    element: lazyRoute('Loading historical draft…', <HistoricalDraftPage />),
  },
  // Compare
  { path: '/compare', element: <PlayerComparisonPage /> },
  {
    path: '/compare/recorded',
    element: lazyRoute('Loading comparison studio…', <ComparisonStudioPage />),
  },
  {
    path: '/lab/compare',
    element: lazyRoute('Loading comparison lab…', <ComparisonLabPage />),
  },
  {
    path: '/lab/careers',
    element: lazyRoute('Loading career comparison…', <CareerComparisonPage />),
  },
  {
    path: '/lab/profiles',
    element: lazyRoute('Loading percentile profiles…', <RecordedProfilesPage />),
  },
  {
    path: '/lab/teams',
    element: lazyRoute('Loading team comparison…', <RecordedLabsPage mode="teams" />),
  },
  // Labs
  { path: '/labs', element: lazyRoute('Loading labs…', <LabsLanding />) },
  {
    path: '/lab/shots',
    element: lazyRoute('Loading recorded shots…', <ShotArchivePage />),
  },
  {
    path: '/lab/workbench',
    element: lazyRoute('Loading research workbench…', <WorkbenchPage />),
  },
  {
    path: '/lab/formulas',
    element: lazyRoute('Loading formula lab…', <FormulaLabPage />),
  },
  {
    path: '/lab/lineups/nba',
    element: lazyRoute('Loading NBA.com lineups…', <LeagueLineupsPage />),
  },
  {
    path: '/lab/lineups',
    element: lazyRoute('Loading research lineups…', <LineupStudyPage />),
  },
  {
    path: '/lab/analytics',
    element: lazyRoute('Loading analytics lab…', <AnalyticsLabPage />),
  },
  {
    path: '/lab/recorded',
    element: lazyRoute('Loading recorded analytics…', <RecordedAnalyticsPage />),
  },
  { path: '/discover', element: lazyRoute('Loading discovery…', <DiscoverPage />) },
  {
    path: '/discover/recorded',
    element: lazyRoute('Loading recorded discovery…', <RecordedDiscoveryPage />),
  },
  {
    path: '/discover/similar',
    element: lazyRoute('Loading similarity finder…', <SimilarityPage />),
  },
  {
    path: '/lab/groups',
    element: lazyRoute(
      'Loading hypothetical identities…',
      <RecordedLabsPage mode="groups" />,
    ),
  },
  // Personal
  { path: '/my-nba', element: lazyRoute('Loading My NBA…', <MyNbaPage />) },
  { path: '/tour', element: lazyRoute('Loading the tour…', <TourPage />) },
  { path: '/my-nba/stories', element: lazyRoute('Loading stories…', <StoriesPage />) },
  {
    path: '/my-nba/stories/shared',
    element: lazyRoute('Opening the shared story…', <SharedStoryPage />),
  },
  {
    path: '/my-nba/stories/:storyId',
    element: lazyRoute('Loading the story editor…', <StoryEditorPage />),
  },
  {
    path: '/my-nba/stories/:storyId/read',
    element: lazyRoute('Loading the story…', <StoryReaderPage />),
  },
  { path: '*', element: lazyRoute('Loading…', <NotFoundPage />) },
];

/** Routes that share a persistent frame animate as one place (a player's hub keeps its hero). */
function routeGroup(pathname: string) {
  const hub = /^\/players\/[^/]+/.exec(pathname);
  return hub ? hub[0] : pathname;
}

/** New places start at the top; query changes within a page keep the reader where they are. */
function useScrollToTopOnNavigate(group: string) {
  useEffect(() => {
    if (window.location.hash) return;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [group]);
}

export function App() {
  return (
    <MotionPreferenceProvider>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </MotionPreferenceProvider>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const group = routeGroup(pathname);
  useScrollToTopOnNavigate(group);
  return (
    <div className="flex min-h-[100dvh] flex-col bg-night">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <AppHeader />
      <DemoBand />
      <div id="content" tabIndex={-1} className="flex-1 outline-none">
        <RouteEntrance routeKey={group}>
          <Routes>
            {ROUTES.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="/players/:playerId" element={<PlayerHubLayout />}>
              <Route index element={<PlayerProfilePage />} />
              {PLAYER_HUB_ROOMS.map((room) => (
                <Route key={room.path} path={room.path} element={room.element} />
              ))}
            </Route>
          </Routes>
        </RouteEntrance>
      </div>
      <AppFooter />
    </div>
  );
}
