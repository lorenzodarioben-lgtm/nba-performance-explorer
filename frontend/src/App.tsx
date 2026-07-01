import { Route, Routes, useLocation } from 'react-router';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerComparisonPage } from './features/player-comparison/PlayerComparisonPage';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';

export function App() {
  const { pathname } = useLocation();
  // The masthead is fixed and overlays the top of the page. The landing (and the catch-all that
  // renders it) is a dark, full-bleed experience that intentionally bleeds under the header, so it
  // gets no top padding and a night background. The data routes keep the light surface and are
  // pushed clear of the fixed header.
  const isDataRoute = pathname.startsWith('/players/') || pathname === '/compare';

  return (
    <div
      className={`flex min-h-[100dvh] flex-col ${isDataRoute ? 'bg-bg' : 'bg-night'}`}
    >
      <AppHeader />
      <div className={`flex-1 ${isDataRoute ? 'pt-16' : ''}`}>
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
