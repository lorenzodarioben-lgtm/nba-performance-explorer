import {
  HistoricalAwardSchema,
  type HistoricalAwardsResponse,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
import {
  parsePage,
  isElement,
  directRows,
  text,
  walk,
  attribute,
  wikiLink,
  type HtmlElement,
} from '../wiki-archive/html-tables.js';
import {
  ArchiveSourceError,
  WikiArchiveClient,
  type WikiPage,
} from '../wiki-archive/wiki-client.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
export function mapHistoricalAwards(
  page: WikiPage,
  teams: readonly DirectoryTeam[],
): HistoricalAwardsResponse['awards'] {
  const matches = parsePage(page.html)
    .filter((n): n is HtmlElement => isElement(n) && n.tagName === 'table')
    .filter(
      (table) =>
        directRows(table)[0]?.map(text).join('|') === 'Award|Recipient(s)|Finalists',
    );
  if (matches.length !== 1) throw new ArchiveSourceError('invalid');
  const rows = directRows(matches[0]!).slice(1),
    awards = rows.map((cells) => {
      if (cells.length !== 3) throw new ArchiveSourceError('invalid');
      const category = text(cells[0]!),
        cell = cells[1]!,
        label = text(cell);
      // The finalist column is deliberately never read as winners. Preserve empty recipient cells.
      const links = walk(cell).filter(
        (n): n is HtmlElement => isElement(n) && n.tagName === 'a' && !!wikiLink(n),
      );
      const recipients: HistoricalAwardsResponse['awards'][number]['recipients'] = [];
      for (const link of links) {
        const name = text(link),
          team = teams.find((t) => t.name === name);
        if (team || !name) continue;
        if (attribute(link, 'href')?.includes('NBA_')) continue;
        const following = links
          .slice(links.indexOf(link) + 1)
          .find((n) => teams.some((t) => t.name === text(n)));
        recipients.push({
          name,
          articleUrl: wikiLink(link),
          team: following
            ? (teams.find((t) => t.name === text(following)) ?? null)
            : null,
        });
      }
      if (label && !recipients.length) throw new ArchiveSourceError('invalid');
      const affiliations = [...label.matchAll(/\(([^()]*)\)/g)].map((m) =>
        teams.find((t) => t.name === m[1]),
      );
      if (
        affiliations.some((t) => !t) ||
        (affiliations.length && affiliations.length !== recipients.length)
      )
        throw new ArchiveSourceError('invalid');
      recipients.forEach((r, i) => {
        if (affiliations[i]) r.team = affiliations[i]!;
      });
      const parsed = HistoricalAwardSchema.safeParse({
        category,
        recipients,
        recipientUnavailable: !recipients.length,
      });
      if (!parsed.success) throw new ArchiveSourceError('invalid');
      return parsed.data;
    });
  if (
    !awards.length ||
    awards.length > 30 ||
    new Set(awards.map((a) => a.category)).size !== awards.length
  )
    throw new ArchiveSourceError('invalid');
  return awards;
}
export interface HistoricalAwardsProvider {
  source: 'wikipedia' | 'fixture';
  getAwards(): Promise<{ awards: HistoricalAwardsResponse['awards']; page: WikiPage }>;
}
export class WikipediaAwardsProvider implements HistoricalAwardsProvider {
  readonly source = 'wikipedia' as const;
  constructor(private readonly client = new WikiArchiveClient()) {}
  async getAwards() {
    const page = await this.client.getPage('2023–24 NBA season');
    return {
      page,
      awards: mapHistoricalAwards(page, await staticTeamDirectoryProvider.listTeams()),
    };
  }
}
