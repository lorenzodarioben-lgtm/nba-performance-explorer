import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerComparisonPage } from './features/player-comparison/PlayerComparisonPage';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';

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

export function App() {
  // Every route is now a dark experience (landing, player profile, and comparison). The masthead is
  // fixed and each page bleeds under it, handling its own top spacing.
  return (
    <div className="flex min-h-[100dvh] flex-col bg-night">
      <AppHeader />
      <div className="flex-1">
        <Routes>
          <Route
            path="/players/:playerId/shooting"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading shooting research…
                  </p>
                }
              >
                <ShootingResearchPage />
              </Suspense>
            }
          />
          <Route
            path="/discover"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading discovery…
                  </p>
                }
              >
                <DiscoverPage />
              </Suspense>
            }
          />
          <Route
            path="/standings"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading historical standings…
                  </p>
                }
              >
                <LeagueArchivePage mode="standings" />
              </Suspense>
            }
          />
          <Route
            path="/leaders"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading published leaders…
                  </p>
                }
              >
                <LeagueArchivePage mode="leaders" />
              </Suspense>
            }
          />
          <Route
            path="/games"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading recorded games…
                  </p>
                }
              >
                <GamesArchivePage />
              </Suspense>
            }
          />
          <Route
            path="/games/:gameId"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading recorded game…
                  </p>
                }
              >
                <GamesArchivePage />
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading history…
                  </p>
                }
              >
                <HistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/history/:season"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading historical season…
                  </p>
                }
              >
                <HistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/players/:playerId/games"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading game research…
                  </p>
                }
              >
                <GameResearchPage />
              </Suspense>
            }
          />
          <Route
            path="/lab/careers"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading career comparison…
                  </p>
                }
              >
                <CareerComparisonPage />
              </Suspense>
            }
          />
          <Route
            path="/players/:playerId/career"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading reported career…
                  </p>
                }
              >
                <CareerResearchPage />
              </Suspense>
            }
          />
          <Route
            path="/lab/analytics"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading analytics lab…
                  </p>
                }
              >
                <AnalyticsLabPage />
              </Suspense>
            }
          />
          <Route
            path="/teams"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading team directory…
                  </p>
                }
              >
                <TeamsPage />
              </Suspense>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading team identity…
                  </p>
                }
              >
                <TeamDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/my-nba"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading My NBA…
                  </p>
                }
              >
                <MyNbaPage />
              </Suspense>
            }
          />
          <Route
            path="/lab/compare"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading comparison lab…
                  </p>
                }
              >
                <ComparisonLabPage />
              </Suspense>
            }
          />
          <Route
            path="/explore"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading explorer…
                  </p>
                }
              >
                <ExplorerPage />
              </Suspense>
            }
          />
          <Route
            path="/players/:playerId/insights"
            element={
              <Suspense
                fallback={
                  <p className="pt-24 text-white" role="status">
                    Loading insights…
                  </p>
                }
              >
                <PlayerInsightsPage />
              </Suspense>
            }
          />
          <Route path="/players/:playerId" element={<PlayerProfilePage />} />
          <Route path="/compare" element={<PlayerComparisonPage />} />
          <Route path="*" element={<FoundationPage />} />
        </Routes>
      </div>
      <AppFooter />
    </div>
  );
}
