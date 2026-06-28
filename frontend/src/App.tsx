import { Route, Routes } from 'react-router';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerComparisonPage } from './features/player-comparison/PlayerComparisonPage';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';

export function App() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AppHeader />
      <div className="flex-1">
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
