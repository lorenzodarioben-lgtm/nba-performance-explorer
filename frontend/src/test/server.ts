import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Default handlers for requests the shell makes on its own, so a test only mocks what it is
// about. The player hub asks which players are in the archived shot directory (to decide
// whether to show its "Shot map" tab); by default the archive is reported unavailable, which
// hides the tab. Tests that need the directory override this handler with server.use().
export const server = setupServer(
  http.get('http://localhost/api/shots/directory', () =>
    HttpResponse.json(
      {
        error: {
          code: 'SHOT_ARCHIVE_DISABLED',
          message: 'Disabled in tests.',
          status: 503,
        },
      },
      { status: 503 },
    ),
  ),
);
