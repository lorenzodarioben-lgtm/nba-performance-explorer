import {
  ArchiveLeaderSchema,
  ArchiveStandingSchema,
  ArchiveGameSchema,
  type ArchiveGame,
  type DirectoryTeam,
  type WikiAttribution,
  type DataProvenance,
  type ArchiveLeagueResponse,
} from '@nba-performance-explorer/contracts';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import {
  attribute,
  children,
  directRows,
  expandedRows,
  isElement,
  parsePage,
  text,
  walk,
  wikiLink,
  type HtmlElement,
  type HtmlNode,
} from './html-tables.js';
import { ArchiveSourceError, WikiArchiveClient, type WikiPage } from './wiki-client.js';
export function attribution(page: WikiPage): WikiAttribution {
  return {
    title: page.title,
    revision: page.revision,
    url: `https://en.wikipedia.org/w/index.php?oldid=${page.revision}`,
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    adapted: true,
  };
}
export function archiveProvenance(
  page: WikiPage,
  scope: 'regular-season' | 'playoffs',
  source: 'wikipedia' | 'fixture',
): DataProvenance {
  return {
    source,
    scope,
    servedAt: new Date().toISOString(),
    retrievedAt: page.retrievedAt,
    asOf: null,
    isLive: false,
    coverage:
      '2023-24 historical Wikipedia snapshot only; no current/live NBA feed or complete cross-season archive.',
    warnings: [
      ...(source === 'fixture'
        ? ['DEMO FIXTURES: synthetic test snapshot, not NBA results.']
        : []),
      'Adapted structured tables from Wikipedia contributors under CC BY-SA 4.0; source revision and licence linked. No images or article prose reused.',
      'Community-maintained snapshot; missing fields stay unavailable. Retrieval time is known; published statistical as-of time is unknown.',
      scope === 'playoffs'
        ? 'Recorded 2024 playoff games only. Source times have no verified time zone; UTC tipoffs and live clocks remain unavailable.'
        : 'Regular-season standings and published category winners only. Leader qualification/population cannot be recalculated without complete player GP/attempts.',
    ],
  };
}
const numeric = (value: string) => {
  if (!/^\d*(?:\.\d+)?$/.test(value) || value === '')
    throw new ArchiveSourceError('invalid');
  return Number(value);
};
function teamByName(name: string, teams: readonly DirectoryTeam[]) {
  const team = teams.find((t) => t.name === name);
  if (!team) throw new ArchiveSourceError('invalid');
  return team;
}
export function mapLeagueArchive(page: WikiPage, teams: readonly DirectoryTeam[]) {
  const tables = parsePage(page.html).filter(
    (n): n is HtmlElement => isElement(n) && n.tagName === 'table',
  );
  const standings: ArchiveLeagueResponse['standings'] = [];
  for (const conference of ['East', 'West'] as const) {
    const matches = tables.filter((table) => {
      const rows = directRows(table);
      return (
        rows[0]?.length === 1 &&
        text(rows[0][0]!) === `${conference}ern Conference` &&
        rows[1]?.map(text).join('|') === '#|Team|W|L|PCT|GB|GP'
      );
    });
    if (matches.length !== 1) throw new ArchiveSourceError('invalid');
    for (const cells of directRows(matches[0]!).slice(2)) {
      if (!cells[0] || !/^\d+$/.test(text(cells[0]))) continue;
      if (cells.length !== 7) throw new ArchiveSourceError('invalid');
      const nameLink = walk(cells[1]!).find(
        (n) =>
          isElement(n) && n.tagName === 'a' && teams.some((t) => t.name === text(n)),
      );
      if (!nameLink) throw new ArchiveSourceError('invalid');
      const wins = numeric(text(cells[2]!)),
        losses = numeric(text(cells[3]!)),
        gamesPlayed = numeric(text(cells[6]!));
      const raw = {
        rank: numeric(text(cells[0]!)),
        conference,
        team: teamByName(text(nameLink), teams),
        wins,
        losses,
        gamesPlayed,
        winPercentage: wins / gamesPlayed,
        sourcePercentage: numeric(text(cells[4]!)),
        gamesBehind: /^[–—-]$/.test(text(cells[5]!)) ? 0 : numeric(text(cells[5]!)),
      };
      const parsed = ArchiveStandingSchema.safeParse(raw);
      if (!parsed.success) throw new ArchiveSourceError('invalid');
      standings.push(parsed.data);
    }
  }
  if (
    standings.length !== 30 ||
    new Set(standings.map((r) => r.team.id)).size !== 30 ||
    ['East', 'West'].some(
      (c) =>
        new Set(standings.filter((r) => r.conference === c).map((r) => r.rank)).size !==
        15,
    )
  )
    throw new ArchiveSourceError('invalid');
  const leaders: ArchiveLeagueResponse['leaders'] = [];
  for (const scope of ['player', 'team'] as const) {
    const header =
      scope === 'player'
        ? 'Category|Player|Team(s)|Statistic'
        : 'Category|Team|Statistic';
    const matching = tables.filter(
      (t) => directRows(t)[0]?.map(text).join('|') === header,
    );
    if (matching.length !== 1) throw new ArchiveSourceError('invalid');
    for (const cells of expandedRows(matching[0]!).slice(1)) {
      if (cells.length !== (scope === 'player' ? 4 : 3))
        throw new ArchiveSourceError('invalid');
      const category = text(cells[0]!);
      const sourceValue = text(cells.at(-1)!).replace(/%$/, '').trim();
      if (category === '+/−' && !/^[+-]?\d+(?:\.\d+)?$/.test(sourceValue))
        throw new ArchiveSourceError('invalid');
      const parsed = ArchiveLeaderSchema.safeParse({
        scope,
        category,
        name: text(cells[1]!),
        teamLabel: scope === 'player' ? text(cells[2]!) : null,
        value: category === '+/−' ? Number(sourceValue) : numeric(sourceValue),
        unit: category.includes('%')
          ? '%'
          : category.includes('per game')
            ? 'per game'
            : ['Double-doubles', 'Triple-doubles'].includes(category)
              ? 'count'
              : 'source-defined',
        articleUrl: wikiLink(cells[1]!),
      });
      if (!parsed.success) throw new ArchiveSourceError('invalid');
      leaders.push(parsed.data);
    }
  }
  if (
    leaders.length > 100 ||
    new Set(leaders.map((r) => `${r.scope}:${r.category}:${r.name}`)).size !==
      leaders.length
  )
    throw new ArchiveSourceError('invalid');
  return { standings, leaders };
}
function parentBox(node: HtmlElement): HtmlElement {
  let parent: HtmlNode | null = node;
  while (parent) {
    if (
      isElement(parent) &&
      parent.tagName === 'div' &&
      children(parent)
        .filter(isElement)
        .some((n) => n.tagName === 'table' && text(n).includes('Scoring by quarter:'))
    )
      return parent;
    parent = 'parentNode' in parent ? parent.parentNode : null;
  }
  throw new ArchiveSourceError('invalid');
}
export function mapPlayoffArchive(
  page: WikiPage,
  teams: readonly DirectoryTeam[],
): ArchiveGame[] {
  const anchors = parsePage(page.html).filter(
    (n): n is HtmlElement =>
      isElement(n) &&
      n.tagName === 'a' &&
      text(n) === 'Recap' &&
      /^https:\/\/www\.nba\.com\/game\/[a-z0-9-]*00423\d{5}(?:\/box-score)?$/.test(
        attribute(n, 'href') ?? '',
      ),
  );
  if (!anchors.length || anchors.length > 150) throw new ArchiveSourceError('invalid');
  const games = anchors.map((anchor) => {
    const recapUrl = attribute(anchor, 'href')!,
      sourceId = /00423\d{5}/.exec(recapUrl)![0];
    const box = parentBox(anchor),
      tables = children(box).filter(
        (n): n is HtmlElement => isElement(n) && n.tagName === 'table',
      );
    const dateTable = tables.find((t) => /^(April|May|June) \d{1,2}\b/.test(text(t)));
    if (!dateTable) throw new ArchiveSourceError('invalid');
    const match = /^(April|May|June) (\d{1,2})(?: (.*))?$/.exec(text(dateTable))!;
    const month = { April: '04', May: '05', June: '06' }[match[1]! as 'April'];
    const scoring = tables.find((t) => text(t).includes('Scoring by quarter:'));
    if (!scoring) throw new ArchiveSourceError('invalid');
    const rows = directRows(scoring);
    if (!rows[0]?.[0] || !rows[1]?.[0] || rows[2]?.length !== 3)
      throw new ArchiveSourceError('invalid');
    const scoreText = text(rows[0][0]);
    const names = walk(rows[0][0])
      .filter(
        (n) =>
          isElement(n) && n.tagName === 'a' && teams.some((t) => t.name === text(n)),
      )
      .map(text);
    if (names.length !== 2) throw new ArchiveSourceError('invalid');
    const away = teamByName(names[0]!, teams),
      home = teamByName(names[1]!, teams);
    const scores = scoreText
      .replace(away.name, '')
      .replace(home.name, '')
      .trim()
      .match(/^(\d+),\s*(\d+)(?: \(OT\))?$/);
    if (!scores) throw new ArchiveSourceError('invalid');
    const pairs = [...text(rows[1][0]).matchAll(/(\d+)[–-](\d+)/g)];
    const leaders = [0, 2].map((i) => {
      const label = text(rows[2]![i]!);
      const parsed = /Pts:\s*(.*?)\s*Rebs:\s*(.*?)\s*Asts:\s*(.*)$/.exec(label);
      return {
        teamId: i === 0 ? away.id : home.id,
        points: parsed?.[1] || null,
        rebounds: parsed?.[2] || null,
        assists: parsed?.[3] || null,
      };
    });
    const venueTable = tables.find((t) => text(t).includes('Attendance:'));
    const raw = {
      id: `nba:${sourceId}`,
      sourceId,
      season: '2023-24',
      scope: 'playoffs',
      date: `2024-${month}-${match[2]!.padStart(2, '0')}`,
      status: 'final',
      away,
      home,
      awayScore: Number(scores[1]),
      homeScore: Number(scores[2]),
      tipoffUtc: null,
      reportedTime: match[3] ?? null,
      venue: venueTable ? text(venueTable).split('Attendance:')[0]!.trim() : null,
      quarters: pairs.map((q, i) => ({
        period: i + 1,
        away: Number(q[1]),
        home: Number(q[2]),
      })),
      leaders,
      recapUrl,
    };
    const parsed = ArchiveGameSchema.safeParse(raw);
    if (!parsed.success) throw new ArchiveSourceError('invalid');
    return parsed.data;
  });
  if (new Set(games.map((g) => g.id)).size !== games.length)
    throw new ArchiveSourceError('invalid');
  return games.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export interface ArchiveProvider {
  source: 'wikipedia' | 'fixture';
  getLeague(): Promise<ReturnType<typeof mapLeagueArchive> & { page: WikiPage }>;
  getGames(): Promise<{ games: ArchiveGame[]; page: WikiPage }>;
}
export class WikipediaArchiveProvider implements ArchiveProvider {
  readonly source = 'wikipedia' as const;
  private readonly cache = new NbaStatsCache({ maxEntries: 2 });
  constructor(private readonly client = new WikiArchiveClient()) {}
  getLeague() {
    return this.cache.getOrLoad(
      'league',
      async () => {
        const page = await this.client.getPage('2023–24 NBA season');
        return {
          ...mapLeagueArchive(page, await staticTeamDirectoryProvider.listTeams()),
          page,
        };
      },
      () => 24 * 60 * 60_000,
    );
  }
  getGames() {
    return this.cache.getOrLoad(
      'games',
      async () => {
        const page = await this.client.getPage('2024 NBA playoffs');
        return {
          games: mapPlayoffArchive(page, await staticTeamDirectoryProvider.listTeams()),
          page,
        };
      },
      () => 24 * 60 * 60_000,
    );
  }
}
