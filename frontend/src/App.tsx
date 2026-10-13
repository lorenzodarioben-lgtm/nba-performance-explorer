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

export function App() {
  // Every route is now a dark experience (landing, player profile, and comparison). The masthead is
  // fixed and each page bleeds under it, handling its own top spacing.
  return (
    <div className="flex min-h-[100dvh] flex-col bg-night">
      <AppHeader />
      <div className="flex-1">
        <Routes>
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
