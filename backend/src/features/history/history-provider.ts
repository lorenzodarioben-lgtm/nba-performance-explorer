import { z } from 'zod';
import {
  HistoricalSeasonSchema,
  SeasonIdSchema,
  type HistoricalSeason,
} from '@nba-performance-explorer/contracts';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';

export class HistorySourceError extends Error {
  constructor(readonly kind: 'invalid' | 'unavailable' | 'timeout') {
    super('Historical source unavailable.');
  }
}
const BindingSchema = z.object({ type: z.string(), value: z.string().max(500) });
const BodySchema = z.object({
  results: z.object({
    bindings: z
      .array(
        z.object({
          season: BindingSchema,
          seasonLabel: BindingSchema,
          winner: BindingSchema.optional(),
          winnerLabel: BindingSchema.optional(),
        }),
      )
      .max(101),
  }),
});
export const HISTORY_QUERY =
  'SELECT ?season ?seasonLabel ?winner ?winnerLabel WHERE { ?season wdt:P3450 wd:Q155223 . OPTIONAL { ?season wdt:P1346 ?winner } SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } } ORDER BY ?season LIMIT 101';
export function mapHistoricalSeasons(body: unknown) {
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) throw new HistorySourceError('invalid');
  const rows = parsed.data.results.bindings;
  const seasons = new Map<string, HistoricalSeason>();
  const canonicalIds = new Map<string, string>();
  const seen = new Set<string>();
  let excludedRows = 0;
  const identity = (binding: z.infer<typeof BindingSchema>) => {
    const match = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d{0,11})$/.exec(
      binding.value,
    );
    if (binding.type !== 'uri' || !match) throw new HistorySourceError('invalid');
    return {
      id: `wd:${match[1]}`,
      sourceUrl: `https://www.wikidata.org/wiki/${match[1]}`,
    };
  };
  for (const row of rows.slice(0, 100)) {
    const label = row.seasonLabel.value;
    const match = /^(\d{4})[–-](\d{2}|\d{4}) NBA season$/.exec(label);
    if (!match) {
      excludedRows++;
      continue;
    }
    const start = Number(match[1]),
      end = match[2]!;
    if (
      (end.length === 4 && Number(end) !== start + 1) ||
      (end.length === 2 && Number(end) !== (start + 1) % 100)
    )
      throw new HistorySourceError('invalid');
    const season = `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
    if (!SeasonIdSchema.safeParse(season).success)
      throw new HistorySourceError('invalid');
    const entity = identity(row.season);
    const rowKey = `${entity.id}:${row.winner?.value ?? ''}`;
    if (seen.has(rowKey)) throw new HistorySourceError('invalid');
    seen.add(rowKey);
    if (canonicalIds.has(season) && canonicalIds.get(season) !== entity.id)
      throw new HistorySourceError('invalid');
    canonicalIds.set(season, entity.id);
    const record = seasons.get(entity.id) ?? {
      ...entity,
      season,
      sourceLabel: label,
      winners: [],
    };
    if (record.season !== season || record.sourceLabel !== label)
      throw new HistorySourceError('invalid');
    if (row.winner) {
      const winner = identity(row.winner);
      if (record.winners.some((w) => w.id === winner.id))
        throw new HistorySourceError('invalid');
      const winnerLabel = row.winnerLabel?.value;
      record.winners.push({
        ...winner,
        label: !winnerLabel || /^Q\d+$/.test(winnerLabel) ? null : winnerLabel,
      });
    } else if (row.winnerLabel) throw new HistorySourceError('invalid');
    seasons.set(entity.id, record);
  }
  const records = [...seasons.values()]
    .map((s) => {
      const parsed = HistoricalSeasonSchema.safeParse(s);
      if (!parsed.success) throw new HistorySourceError('invalid');
      return parsed.data;
    })
    .sort((a, b) => b.season.localeCompare(a.season));
  return {
    seasons: records,
    coverage: {
      rawRows: rows.length,
      excludedRows,
      missingWinners: records.filter((r) => !r.winners.length).length,
      capped: rows.length === 101,
    },
  };
}
export interface HistoryProvider {
  source: 'wikidata' | 'fixture';
  getSeasons(): Promise<
    ReturnType<typeof mapHistoricalSeasons> & { retrievedAt: string }
  >;
}
export class WikidataHistoryProvider implements HistoryProvider {
  readonly source = 'wikidata' as const;
  private readonly cache: NbaStatsCache;
  private blockedUntil = 0;
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now = () => new Date(),
  ) {
    this.cache = new NbaStatsCache({ maxEntries: 1, now: () => this.now().getTime() });
  }
  getSeasons() {
    return this.cache.getOrLoad(
      'nba-season-facts',
      async () => {
        if (this.now().getTime() < this.blockedUntil)
          throw new HistorySourceError('unavailable');
        const url = new URL('https://query.wikidata.org/sparql');
        url.searchParams.set('query', HISTORY_QUERY);
        url.searchParams.set('format', 'json');
        try {
          const response = await this.fetcher(url, {
            signal: AbortSignal.timeout(10_000),
            headers: {
              Accept: 'application/sparql-results+json',
              'Accept-Encoding': 'gzip,deflate',
              'User-Agent':
                'NBA-Performance-Explorer/0.1 (https://github.com/lorenzodarioben-lgtm/nba-performance-explorer; historical facts)',
            },
          });
          if (!response.ok) {
            if (response.status === 429) {
              const retry = response.headers.get('retry-after') ?? '';
              const seconds = /^\d+$/.test(retry)
                ? Number(retry)
                : (Date.parse(retry) - this.now().getTime()) / 1000;
              this.blockedUntil =
                this.now().getTime() +
                Math.min(86400, Math.max(60, Number.isFinite(seconds) ? seconds : 60)) *
                  1000;
            }
            throw new HistorySourceError('unavailable');
          }
          const reader = response.body?.getReader();
          if (!reader) throw new HistorySourceError('invalid');
          const chunks: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 250_000) {
              await reader.cancel();
              throw new HistorySourceError('invalid');
            }
            chunks.push(value);
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
            throw new HistorySourceError('invalid');
          }
          return {
            ...mapHistoricalSeasons(body),
            retrievedAt: this.now().toISOString(),
          };
        } catch (error) {
          if (error instanceof HistorySourceError) throw error;
          throw new HistorySourceError(
            error instanceof Error &&
              ['TimeoutError', 'AbortError'].includes(error.name)
              ? 'timeout'
              : 'unavailable',
          );
        }
      },
      (value) => (value.seasons.length ? 24 * 60 * 60_000 : 60_000),
    );
  }
}
