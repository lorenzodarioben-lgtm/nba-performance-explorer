// A minimal backend-private HTTP client for NBA.com Stats using only Node.js 22 built-ins
// (`fetch`, `URL`, `URLSearchParams`, `AbortController`). It sends the approved browser-style
// application headers, enforces a single timeout, performs zero retries, checks the status and
// content type before parsing JSON, and converts every failure into a provider error without
// leaking raw URLs, bodies, headers, or cookies.

import {
  providerInvalidResponse,
  providerTimeout,
  providerUnavailable,
} from '../provider-error.js';

const BASE_URL = 'https://stats.nba.com/stats';

// Application-controlled headers only. Node manages Host, Content-Length, Accept-Encoding, and
// connection headers; we do not set them. Keep the User-Agent and Sec-CH-UA Chromium versions
// consistent if this set is ever updated.
const APPLICATION_HEADERS: Readonly<Record<string, string>> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  Referer: 'https://www.nba.com/',
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
  'Sec-CH-UA': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
};

export interface NbaStatsHttpClientOptions {
  timeoutMs: number;
  // Injectable for tests; production resolves `globalThis.fetch` at call time.
  fetchImpl?: typeof fetch;
}

export interface NbaStatsHttpClient {
  fetchEndpoint(
    endpoint: string,
    params: Readonly<Record<string, string>>,
  ): Promise<unknown>;
}

export function createNbaStatsHttpClient(
  options: NbaStatsHttpClientOptions,
): NbaStatsHttpClient {
  return {
    async fetchEndpoint(endpoint, params) {
      const doFetch = options.fetchImpl ?? globalThis.fetch;
      const url = new URL(`${BASE_URL}/${endpoint}`);
      url.search = new URLSearchParams(params).toString();

      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, options.timeoutMs);

      try {
        let response: Response;
        try {
          response = await doFetch(url, {
            method: 'GET',
            headers: { ...APPLICATION_HEADERS },
            signal: controller.signal,
          });
        } catch (error) {
          if (isAbort(error, controller)) {
            throw providerTimeout('NBA Stats request timed out.');
          }
          throw providerUnavailable('NBA Stats request failed.');
        }

        if (!response.ok) {
          // 403/429/4xx/5xx all surface as a generic upstream-unavailable condition.
          throw providerUnavailable(
            `NBA Stats responded with status ${response.status}.`,
          );
        }

        const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
        if (!contentType.includes('json')) {
          throw providerInvalidResponse('NBA Stats returned a non-JSON content type.');
        }

        try {
          return (await response.json()) as unknown;
        } catch (error) {
          if (isAbort(error, controller)) {
            throw providerTimeout('NBA Stats request timed out.');
          }
          throw providerInvalidResponse(
            'NBA Stats returned a body that is not valid JSON.',
          );
        }
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function isAbort(error: unknown, controller: AbortController): boolean {
  return (
    controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')
  );
}
