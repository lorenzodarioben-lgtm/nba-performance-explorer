import { Route, Routes } from 'react-router';

import { FoundationPage } from './features/foundation/FoundationPage';

export function App() {
  return (
    <Routes>
      <Route path="*" element={<FoundationPage />} />
    </Routes>
  );
}
