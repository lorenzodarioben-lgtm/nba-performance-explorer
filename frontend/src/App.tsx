import { Route, Routes, useLocation } from 'react-router';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerComparisonPage } from './features/player-comparison/PlayerComparisonPage';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';

export function App() {
  const { pathname } = useLocation();
  // The masthead is fixed and overlays the top of the page. The dark surfaces (the landing, the
  // catch-all that renders it, and the redesigned player profile) intentionally bleed under the
  // header, so they get no top padding and a night background. The comparison route is not yet
  // redesigned, so it keeps the light surface and is pushed clear of the fixed header.
  const isCompareRoute = pathname === '/compare';

  return (
    <div
      className={`flex min-h-[100dvh] flex-col ${isCompareRoute ? 'bg-bg' : 'bg-night'}`}
    >
      <AppHeader />
      <div className={`flex-1 ${isCompareRoute ? 'pt-16' : ''}`}>
        <Routes>
          <Route path="/players/:playerId" element={<PlayerProfilePage />} />
          <Route path="/compare" element={<PlayerComparisonPage />} />
          <Route path="*" element={<FoundationPage />} />
        </Routes>
      </div>
      <AppFooter />
    </div>
  );
}
