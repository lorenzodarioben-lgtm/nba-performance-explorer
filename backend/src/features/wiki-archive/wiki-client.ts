import { z } from 'zod';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
export class ArchiveSourceError extends Error {
  constructor(readonly kind: 'invalid' | 'unavailable' | 'timeout') {
    super('Archive source unavailable.');
  }
}
const BodySchema = z.object({
  parse: z.object({
    title: z.string(),
    revid: z.number().int().positive(),
    text: z.string().max(2_000_000),
  }),
});
export interface WikiPage {
  title: string;
  revision: number;
  html: string;
  retrievedAt: string;
}
export class WikiArchiveClient {
  private readonly cache: NbaStatsCache;
  private blockedUntil = 0;
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now = () => new Date(),
  ) {
    this.cache = new NbaStatsCache({ maxEntries: 32, now: () => this.now().getTime() });
  }
  getPage(
    title:
      | '2023–24 NBA season'
      | '2024 NBA playoffs'
      | '2023 NBA draft'
      | `2023–24 ${string} season`,
  ): Promise<WikiPage> {
    return this.cache.getOrLoad(
      title,
      async () => {
        const allowed = [
          '2023–24 NBA season',
          '2024 NBA playoffs',
          '2023 NBA draft',
          ...(await staticTeamDirectoryProvider.listTeams()).map(
            (t) => `2023–24 ${t.name} season`,
          ),
        ];
        if (!allowed.includes(title)) throw new ArchiveSourceError('invalid');
        if (this.now().getTime() < this.blockedUntil)
          throw new ArchiveSourceError('unavailable');
        const url = new URL('https://en.wikipedia.org/w/api.php');
        for (const [key, value] of Object.entries({
          action: 'parse',
          page: title,
          prop: 'text|revid',
          format: 'json',
          formatversion: '2',
          maxlag: '5',
        }))
          url.searchParams.set(key, value);
        try {
          const response = await this.fetcher(url, {
            signal: AbortSignal.timeout(10_000),
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip,deflate',
              'User-Agent':
                'NBA-Performance-Explorer/0.1 (https://github.com/lorenzodarioben-lgtm/nba-performance-explorer; licensed historical tables)',
            },
          });
          if (!response.ok) {
            if (response.status === 429 || response.status === 503) {
              const retry = response.headers.get('retry-after') ?? '';
              const seconds = /^\d+$/.test(retry)
                ? Number(retry)
                : (Date.parse(retry) - this.now().getTime()) / 1000;
              this.blockedUntil =
                this.now().getTime() +
                Math.min(86400, Math.max(60, Number.isFinite(seconds) ? seconds : 60)) *
                  1000;
            }
            await response.body?.cancel();
            throw new ArchiveSourceError('unavailable');
          }
          const reader = response.body?.getReader();
          if (!reader) throw new ArchiveSourceError('invalid');
          const chunks: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.byteLength;
            if (size > 2_000_000) {
              await reader.cancel();
              throw new ArchiveSourceError('invalid');
            }
            chunks.push(part.value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const c of chunks) {
            bytes.set(c, offset);
            offset += c.byteLength;
          }
          let body: unknown;
          try {
            body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
          } catch {
            throw new ArchiveSourceError('invalid');
          }
          if (body && typeof body === 'object' && 'error' in body) {
            this.blockedUntil = this.now().getTime() + 60_000;
            throw new ArchiveSourceError('unavailable');
          }
          const parsed = BodySchema.safeParse(body);
          if (!parsed.success || parsed.data.parse.title !== title)
            throw new ArchiveSourceError('invalid');
          return {
            title,
            revision: parsed.data.parse.revid,
            html: parsed.data.parse.text,
            retrievedAt: this.now().toISOString(),
          };
        } catch (error) {
          if (error instanceof ArchiveSourceError) throw error;
          throw new ArchiveSourceError(
            error instanceof Error &&
              ['TimeoutError', 'AbortError'].includes(error.name)
              ? 'timeout'
              : 'unavailable',
          );
        }
      },
      () => 24 * 60 * 60_000,
    );
  }
}
