import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNbaStatsHttpClient } from './nba-stats-http-client.js';

function jsonResponse(
  body: unknown,
  init: { status?: number; contentType?: string } = {},
): Response {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      'content-type': init.contentType ?? 'application/json; charset=utf-8',
    }),
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('createNbaStatsHttpClient', () => {
  it('requests the endpoint with browser headers and encoded params, omitting Node-managed headers', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ resultSets: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await client.fetchEndpoint('playergamelog', {
      PlayerID: '2544',
      Season: '2023-24',
      SeasonType: 'Regular Season',
      LeagueID: '00',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl).toBeInstanceOf(URL);
    expect(requestUrl.origin).toBe('https://stats.nba.com');
    expect(requestUrl.pathname).toBe('/stats/playergamelog');
    expect(requestUrl.searchParams.get('PlayerID')).toBe('2544');
    expect(requestUrl.searchParams.get('SeasonType')).toBe('Regular Season');

    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('Chrome/145');
    expect(headers['Referer']).toBe('https://www.nba.com/');
    expect(headers['Accept']).toContain('application/json');
    expect(headers).not.toHaveProperty('Host');
    expect(headers).not.toHaveProperty('Content-Length');
    expect(headers).not.toHaveProperty('Accept-Encoding');
  });

  it('returns the parsed JSON body on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ resultSets: [{ ok: true }] })),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    expect(await client.fetchEndpoint('commonallplayers', { LeagueID: '00' })).toEqual({
      resultSets: [{ ok: true }],
    });
  });

  it.each([
    ['HTTP 403', 403],
    ['HTTP 429', 429],
    ['upstream 5xx', 503],
  ])('maps %s to PROVIDER_UNAVAILABLE', async (_label, status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse('<html>blocked secret</html>', { status })),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await expect(
      client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });

  it('maps a network rejection to PROVIDER_UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await expect(
      client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });

  it('maps a timeout abort to PROVIDER_TIMEOUT', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: URL, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createNbaStatsHttpClient({ timeoutMs: 1_000 });

    const promise = client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' });
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'PROVIDER_TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await expectation;
  });

  it.each([
    ['an HTML body', { contentType: 'text/html' }],
    ['an unexpected content type', { contentType: 'text/plain' }],
  ])('maps %s to PROVIDER_INVALID_RESPONSE', async (_label, init) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse('<html></html>', init)),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await expect(
      client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE' });
  });

  it('maps a malformed JSON body to PROVIDER_INVALID_RESPONSE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => {
              throw new SyntaxError('Unexpected token');
            },
          }) as unknown as Response,
      ),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await expect(
      client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE' });
  });

  it('does not leak the upstream body or status text into the error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse('<html>SECRET-TOKEN-12345</html>', { status: 403 }),
      ),
    );
    const client = createNbaStatsHttpClient({ timeoutMs: 10_000 });

    await expect(
      client.fetchEndpoint('commonplayerinfo', { PlayerID: '2544' }),
    ).rejects.toThrow(/^(?!.*SECRET-TOKEN).*$/);
  });
});
