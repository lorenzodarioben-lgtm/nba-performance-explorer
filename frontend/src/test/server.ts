import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const unavailable = () =>
  HttpResponse.json(
    { error: { code: 'ARCHIVE_DISABLED', message: 'Disabled in tests.', status: 503 } },
    { status: 503 },
  );

// Default handlers for requests the shell makes on its own, so a test only mocks what it is
// about. By default these archives are reported unavailable; tests that need them override the
// handler with server.use().
//  - The player hub asks which players are in the archived shot directory (its Shot map tab).
//  - The home page previews read the shot, standings and playoff-game archives.
//  - Global search, the homepage band and game pages read the 2024 playoff bracket.
export const server = setupServer(
  http.get('http://localhost/api/shots/directory', unavailable),
  http.get('http://localhost/api/shots', unavailable),
  http.get('http://localhost/api/standings', unavailable),
  http.get('http://localhost/api/games', unavailable),
  http.get('http://localhost/api/games/bracket', unavailable),
);
