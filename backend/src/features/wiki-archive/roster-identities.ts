import { z } from 'zod';
import {
  WikiArticleUrlSchema,
  ResearchPlayerIdSchema,
} from '@nba-performance-explorer/contracts';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import { ArchiveSourceError } from './wiki-client.js';
const binding = z.object({ type: z.string(), value: z.string().max(500) });
const schema = z.object({
  results: z.object({
    bindings: z
      .array(z.object({ article: binding, item: binding, nbaId: binding.optional() }))
      .max(121),
  }),
});
export function mapRosterIdentities(body: unknown, articles: readonly string[]) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ArchiveSourceError('invalid');
  const identities = new Map<
    string,
    { nbaPlayerId: string | null; identityUrl: string }
  >();
  for (const r of parsed.data.results.bindings) {
    if (
      r.article.type !== 'uri' ||
      !articles.includes(r.article.value) ||
      r.item.type !== 'uri'
    )
      throw new ArchiveSourceError('invalid');
    const entity = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d{0,11})$/.exec(
      r.item.value,
    );
    if (
      !entity ||
      identities.has(r.article.value) ||
      (r.nbaId && !ResearchPlayerIdSchema.safeParse(r.nbaId.value).success)
    )
      throw new ArchiveSourceError('invalid');
    identities.set(r.article.value, {
      nbaPlayerId: r.nbaId?.value ?? null,
      identityUrl: `https://www.wikidata.org/wiki/${entity[1]}`,
    });
  }
  const ids = [...identities.values()].flatMap((r) =>
    r.nbaPlayerId ? [r.nbaPlayerId] : [],
  );
  if (new Set(ids).size !== ids.length) throw new ArchiveSourceError('invalid');
  return identities;
}
export interface RosterIdentityProvider {
  getIdentities(articles: readonly string[]): Promise<{
    identities: ReturnType<typeof mapRosterIdentities>;
    retrievedAt: string;
  }>;
}
export class WikidataRosterIdentities implements RosterIdentityProvider {
  private cache: NbaStatsCache;
  private blockedUntil = 0;
  constructor(
    private fetcher: typeof fetch = fetch,
    private now = () => new Date(),
  ) {
    this.cache = new NbaStatsCache({ maxEntries: 32, now: () => this.now().getTime() });
  }
  getIdentities(input: readonly string[]) {
    const articles = [...new Set(input)].sort();
    if (
      articles.length > 60 ||
      articles.some((s) => !WikiArticleUrlSchema.safeParse(s).success)
    )
      throw new ArchiveSourceError('invalid');
    return this.cache.getOrLoad(
      articles.join('|'),
      async () => {
        if (this.now().getTime() < this.blockedUntil)
          throw new ArchiveSourceError('unavailable');
        const query = `SELECT ?article ?item ?nbaId WHERE { VALUES ?article { ${articles.map((s) => `<${s}>`).join(' ')} } ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> . OPTIONAL { ?item wdt:P3647 ?nbaId } } LIMIT 121`;
        const url = new URL('https://query.wikidata.org/sparql');
        url.searchParams.set('query', query);
        url.searchParams.set('format', 'json');
        try {
          const response = await this.fetcher(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
              Accept: 'application/sparql-results+json',
              'User-Agent':
                'NBA-Performance-Explorer/0.1 (https://github.com/lorenzodarioben-lgtm/nba-performance-explorer; exact roster article identity mapping)',
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
            if (size > 250000) {
              await reader.cancel();
              throw new ArchiveSourceError('invalid');
            }
            chunks.push(part.value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          let body: unknown;
          try {
            body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
          } catch {
            throw new ArchiveSourceError('invalid');
          }
          return {
            identities: mapRosterIdentities(body, articles),
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
