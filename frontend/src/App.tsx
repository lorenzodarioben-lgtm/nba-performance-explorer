import { Route, Routes } from 'react-router';

import { FoundationPage } from './features/foundation/FoundationPage';
import { PlayerProfilePage } from './features/players/PlayerProfilePage';

export function App() {
  return (
    <Routes>
      <Route path="/players/:playerId" element={<PlayerProfilePage />} />
      <Route path="*" element={<FoundationPage />} />
    </Routes>
  );
}
