import { Route, Routes } from 'react-router';

import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerPlaceholderPage } from './features/players/PlayerPlaceholderPage';

export function App() {
  return (
    <Routes>
      <Route path="/players/:playerId" element={<PlayerPlaceholderPage />} />
      <Route path="*" element={<FoundationPage />} />
    </Routes>
  );
}
