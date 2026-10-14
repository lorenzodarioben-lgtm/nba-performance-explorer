import {
  DraftSelectionSchema,
  DraftForfeitureSchema,
  type DraftSelection,
  type DraftResponse,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
import {
  parsePage,
  isElement,
  expandedRows,
  text,
  walk,
  wikiLink,
  type HtmlElement,
} from '../wiki-archive/html-tables.js';
import {
  ArchiveSourceError,
  WikiArchiveClient,
  type WikiPage,
} from '../wiki-archive/wiki-client.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import {
  WikidataRosterIdentities,
  type RosterIdentityProvider,
} from '../wiki-archive/roster-identities.js';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
export function mapDraftArchive(page: WikiPage, teams: readonly DirectoryTeam[]) {
  const tables = parsePage(page.html)
    .filter((n): n is HtmlElement => isElement(n) && n.tagName === 'table')
    .filter(
      (t) =>
        expandedRows(t)[0]?.map(text).join('|') ===
        'Rnd.|Pick|Player|Pos.|Nationality|Team|School / club team',
    );
  if (tables.length !== 1) throw new ArchiveSourceError('invalid');
  const selections: DraftSelection[] = [],
    forfeitures: DraftResponse['forfeitures'] = [];
  const teamFor = (cell: HtmlElement) => {
    const link = walk(cell).find(
      (n) => isElement(n) && n.tagName === 'a' && !!wikiLink(n),
    );
    const found = link ? teams.find((t) => t.name === text(link)) : undefined;
    if (!found) throw new ArchiveSourceError('invalid');
    return found;
  };
  for (const cells of expandedRows(tables[0]!).slice(1)) {
    if (cells.length !== 7) throw new ArchiveSourceError('invalid');
    const round = text(cells[0]!),
      pick = text(cells[1]!);
    if (!/^\d+$/.test(pick)) {
      if (round !== '2' || !pick.includes('forfeited'))
        throw new ArchiveSourceError('invalid');
      forfeitures.push(
        DraftForfeitureSchema.parse({
          round: 2,
          listedTeam: teamFor(cells[1]!),
          sourceLabel: pick,
        }),
      );
      continue;
    }
    const actor = walk(cells[2]!).find(
      (n) => isElement(n) && n.tagName === 'a' && wikiLink(n),
    );
    if (!actor) throw new ArchiveSourceError('invalid');
    const row = DraftSelectionSchema.safeParse({
      id: `draft:2023:${pick}`,
      year: 2023,
      round: Number(round),
      pick: Number(pick),
      name: text(actor),
      playerLabel: text(cells[2]!),
      articleUrl: wikiLink(actor),
      nbaPlayerId: null,
      identityUrl: null,
      position: text(cells[3]!) || null,
      nationality: text(cells[4]!) || null,
      listedTeam: teamFor(cells[5]!),
      teamLabel: text(cells[5]!),
      schoolClub: text(cells[6]!) || null,
    });
    if (!row.success) throw new ArchiveSourceError('invalid');
    selections.push(row.data);
  }
  if (
    selections.length !== 58 ||
    forfeitures.length !== 2 ||
    new Set(forfeitures.map((f) => f.listedTeam.id)).size !== 2 ||
    new Set(selections.map((p) => p.articleUrl)).size !== 58 ||
    new Set(selections.map((r) => r.pick)).size !== 58 ||
    selections.some((r, i) => r.pick !== i + 1)
  )
    throw new ArchiveSourceError('invalid');
  return { selections, forfeitures };
}
export interface DraftProvider {
  source: 'wikipedia' | 'fixture';
  getDraft(): Promise<
    ReturnType<typeof mapDraftArchive> & {
      page: WikiPage;
      identityStatus: 'available' | 'unavailable';
      identityRetrievedAt: string | null;
    }
  >;
}
export class WikipediaDraftProvider implements DraftProvider {
  readonly source = 'wikipedia' as const;
  private readonly cache = new NbaStatsCache({ maxEntries: 1 });
  constructor(
    private readonly client = new WikiArchiveClient(),
    private readonly identities: RosterIdentityProvider = new WikidataRosterIdentities(),
  ) {}
  getDraft() {
    return this.cache.getOrLoad(
      '2023',
      async () => {
        const page = await this.client.getPage('2023 NBA draft'),
          data = mapDraftArchive(page, await staticTeamDirectoryProvider.listTeams());
        let identityStatus: 'available' | 'unavailable' = 'available',
          identityRetrievedAt: string | null = null;
        try {
          const mapped = await this.identities.getIdentities(
            data.selections.map((p) => p.articleUrl),
          );
          identityRetrievedAt = mapped.retrievedAt;
          for (const p of data.selections) {
            const id = mapped.identities.get(p.articleUrl);
            if (id) {
              p.nbaPlayerId = id.nbaPlayerId;
              p.identityUrl = id.identityUrl;
            }
          }
        } catch (e) {
          if (!(e instanceof ArchiveSourceError) || e.kind === 'invalid') throw e;
          identityStatus = 'unavailable';
        }
        return { ...data, page, identityStatus, identityRetrievedAt };
      },
      () => 24 * 60 * 60_000,
    );
  }
}
