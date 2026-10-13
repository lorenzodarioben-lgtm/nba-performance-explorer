import {
  ArchiveRosterMemberSchema,
  ArchiveParticipantStatsSchema,
  ArchiveTeamResultSchema,
  TeamArchiveResponseSchema,
  type DirectoryTeam,
  type TeamArchiveResponse,
} from '@nba-performance-explorer/contracts';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { ArchiveSourceError, WikiArchiveClient, type WikiPage } from './wiki-client.js';
import {
  attribute,
  directRows,
  isElement,
  parsePage,
  text,
  walk,
  wikiLink,
  type HtmlElement,
} from './html-tables.js';
import { attribution, archiveProvenance } from './archive-provider.js';
import {
  WikidataRosterIdentities,
  type RosterIdentityProvider,
} from './roster-identities.js';
const numeric = (value: string) => {
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) throw new ArchiveSourceError('invalid');
  return Number(value);
};
const nullable = (value: string) =>
  value === '' || /^[–—-]$/.test(value) ? null : numeric(value);
function player(cell: HtmlElement) {
  const anchor = walk(cell).find(
    (n) =>
      isElement(n) && n.tagName === 'a' && attribute(n, 'href')?.startsWith('/wiki/'),
  );
  return {
    name: text(anchor ?? cell),
    articleUrl: wikiLink(cell),
    nbaPlayerId: null,
    identityUrl: null,
  };
}
export function mapTeamArchive(
  page: WikiPage,
  team: DirectoryTeam,
  teams: readonly DirectoryTeam[],
) {
  if (page.title !== `2023–24 ${team.name} season`)
    throw new ArchiveSourceError('invalid');
  const nodes = parsePage(page.html);
  const tables = nodes.filter(
    (n): n is HtmlElement => isElement(n) && n.tagName === 'table',
  );
  // An unlinked repeated label may reuse only an explicit same-page season link.
  // Never map a short city label by fuzzy matching or a current-name prefix.
  const opponentAliases = new Map<string, DirectoryTeam>();
  let aliasHeading = '';
  const fromLink = (link: string) =>
    teams.find(
      (t) =>
        link ===
        `https://en.wikipedia.org/wiki/${encodeURIComponent(`2023–24 ${t.name} season`.replaceAll(' ', '_'))}`,
    );
  const opponentLabel = (cell: HtmlElement) => text(cell).replace(/^@ /, '');
  for (const node of nodes) {
    if (isElement(node) && /^h[234]$/.test(node.tagName)) aliasHeading = text(node);
    if (
      !isElement(node) ||
      node.tagName !== 'table' ||
      aliasHeading !== 'Regular season'
    )
      continue;
    const rows = directRows(node);
    if (
      rows[0]?.map(text).join('|') !==
      'Game|Date|Team|Score|High points|High rebounds|High assists|Location Attendance|Record'
    )
      continue;
    for (const c of rows.slice(1)) {
      if (!c[2] || !c[0] || !/^\d+$/.test(text(c[0]))) continue;
      const link = wikiLink(c[2]);
      if (!link) continue;
      const identity = fromLink(link);
      if (!identity) throw new ArchiveSourceError('invalid');
      const label = opponentLabel(c[2]);
      if (opponentAliases.has(label) && opponentAliases.get(label)!.id !== identity.id)
        throw new ArchiveSourceError('invalid');
      opponentAliases.set(label, identity);
    }
  }
  if (
    !nodes.some(
      (n) =>
        isElement(n) &&
        ['th', 'caption'].includes(n.tagName) &&
        text(n) === `2023–24 ${team.name} roster`,
    )
  )
    throw new ArchiveSourceError('invalid');
  const rosters = tables.filter(
    (t) =>
      directRows(t)[0]?.map(text).join('|') ===
      'Pos.|No.|Player|Height|Weight|DOB|From',
  );
  if (rosters.length !== 1) throw new ArchiveSourceError('invalid');
  const roster = directRows(rosters[0]!)
    .slice(1)
    .map((c) => {
      if (c.length !== 7) throw new ArchiveSourceError('invalid');
      const birthDate = text(c[5]!) || null;
      const age = birthDate
        ? 2023 - Number(birthDate.slice(0, 4)) - (birthDate.slice(5) > '10-01' ? 1 : 0)
        : null;
      const parsed = ArchiveRosterMemberSchema.safeParse({
        ...player(c[2]!),
        position: text(c[0]!),
        number: text(c[1]!) || null,
        birthDate,
        ageOnOctober1: age,
      });
      if (!parsed.success) throw new ArchiveSourceError('invalid');
      return parsed.data;
    });
  const statistics: TeamArchiveResponse['statistics'] = {
    'regular-season': [],
    playoffs: [],
    'source-unspecified': [],
  };
  const resultRows: {
    gameNumber: number;
    sourceRecord: string;
    game: TeamArchiveResponse['results'][number];
  }[] = [];
  let heading = '';
  const statScopes = new Set<string>();
  for (const node of nodes) {
    if (isElement(node) && /^h[234]$/.test(node.tagName)) heading = text(node);
    if (!isElement(node) || node.tagName !== 'table') continue;
    const rows = directRows(node),
      header = rows[0]?.map(text).join('|');
    const standardHeader = 'Player|GP|GS|MPG|FG%|3P%|FT%|RPG|APG|SPG|BPG|PPG';
    const totalsHeader =
      'Player|POS|GP|GS|MP|REB|AST|STL|BLK|PTS|MPG|RPG|APG|SPG|BPG|PPG';
    const onlyTotalsHeader = 'Player|Pos.|GP|GS|MP|Reb.|Ast.|Stl.|Blk.|Pts.';
    if (
      header === standardHeader ||
      header === totalsHeader ||
      header === onlyTotalsHeader
    ) {
      if (heading === 'Preseason') continue;
      const scope =
        heading === 'Regular season'
          ? 'regular-season'
          : heading === 'Playoffs'
            ? 'playoffs'
            : heading === 'Player statistics'
              ? 'source-unspecified'
              : null;
      if (!scope || statScopes.has(scope)) throw new ArchiveSourceError('invalid');
      statScopes.add(scope);
      statistics[scope] = rows.slice(1).map((c) => {
        if (header !== standardHeader) {
          if (c.length !== (header === totalsHeader ? 16 : 10))
            throw new ArchiveSourceError('invalid');
          const rawKeys = [
            'minutes',
            'rebounds',
            'assists',
            'steals',
            'blocks',
            'points',
          ] as const;
          const rawTotals = Object.fromEntries(
            rawKeys.map((key, i) => {
              const value = text(c[i + 4]!);
              if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value))
                throw new ArchiveSourceError('invalid');
              return [key, Number(value.replaceAll(',', ''))];
            }),
          ) as Record<(typeof rawKeys)[number], number>;
          const gp = numeric(text(c[2]!)),
            keys = [
              'minutesPerGame',
              'reboundsPerGame',
              'assistsPerGame',
              'stealsPerGame',
              'blocksPerGame',
              'pointsPerGame',
            ] as const;
          const values = Object.fromEntries(
            keys.map((key, i) => [
              key,
              header === totalsHeader
                ? nullable(text(c[i + 10]!))
                : gp > 0
                  ? rawTotals[rawKeys[i]!] / gp
                  : null,
            ]),
          );
          if (
            header === totalsHeader &&
            gp > 0 &&
            keys.some(
              (key, i) =>
                values[key] !== null &&
                Math.abs(values[key]! - rawTotals[rawKeys[i]!] / gp) > 0.051,
            )
          )
            throw new ArchiveSourceError('invalid');
          const parsed = ArchiveParticipantStatsSchema.safeParse({
            ...player(c[0]!),
            gamesPlayed: gp,
            gamesStarted: nullable(text(c[3]!)),
            fieldGoalPercentage: null,
            threePointPercentage: null,
            freeThrowPercentage: null,
            ...values,
            rawTotals,
            valueBasis:
              header === totalsHeader
                ? 'published-per-game'
                : 'derived-from-raw-totals',
          });
          if (!parsed.success) throw new ArchiveSourceError('invalid');
          return parsed.data;
        }
        if (c.length !== 12) throw new ArchiveSourceError('invalid');
        const keys = [
          'gamesStarted',
          'minutesPerGame',
          'fieldGoalPercentage',
          'threePointPercentage',
          'freeThrowPercentage',
          'reboundsPerGame',
          'assistsPerGame',
          'stealsPerGame',
          'blocksPerGame',
          'pointsPerGame',
        ];
        const fields = Object.fromEntries(
          keys.map((key, i) => {
            const value = text(c[i + 2]!);
            return [
              key,
              key.endsWith('Percentage') && value.endsWith('%')
                ? numeric(value.slice(0, -1)) / 100
                : nullable(value),
            ];
          }),
        );
        const parsed = ArchiveParticipantStatsSchema.safeParse({
          ...player(c[0]!),
          gamesPlayed: numeric(text(c[1]!)),
          ...fields,
        });
        if (!parsed.success) throw new ArchiveSourceError('invalid');
        return parsed.data;
      });
      if (
        new Set(statistics[scope].map((p) => p.articleUrl ?? p.name)).size !==
        statistics[scope].length
      )
        throw new ArchiveSourceError('invalid');
    }
    if (
      heading === 'Regular season' &&
      header ===
        'Game|Date|Team|Score|High points|High rebounds|High assists|Location Attendance|Record'
    ) {
      for (const c of rows.slice(1)) {
        if (!c[0] || !/^\d+$/.test(text(c[0]))) continue;
        if (c.length !== 9) throw new ArchiveSourceError('invalid');
        const date =
          /^(October|November|December|January|February|March|April) (\d{1,2})$/.exec(
            text(c[1]!),
          );
        const months = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        if (!date) throw new ArchiveSourceError('invalid');
        const month = months.indexOf(date[1]!) + 1;
        const opponentLink = wikiLink(c[2]!);
        const opponent = opponentLink
          ? fromLink(opponentLink)
          : opponentAliases.get(opponentLabel(c[2]!));
        if (!opponent) throw new ArchiveSourceError('invalid');
        const score = /^([WL]) (\d+)[–-](\d+)(?: \((\d*)OT\))?$/.exec(text(c[3]!));
        const recap = walk(c[3]!).find(
          (n) =>
            isElement(n) &&
            n.tagName === 'a' &&
            /^https:\/\/www\.nba\.com\/game\/(?:[a-z0-9-]*-)?00223\d{5}(?:\/box-score)?$/.test(
              attribute(n, 'href') ?? '',
            ),
        );
        if (!score || !recap) throw new ArchiveSourceError('invalid');
        const recapUrl = attribute(recap, 'href')!,
          sourceId = /00223\d{5}/.exec(recapUrl)![0];
        const parsed = ArchiveTeamResultSchema.safeParse({
          sourceId,
          date: `${month >= 10 ? 2023 : 2024}-${String(month).padStart(2, '0')}-${date[2]!.padStart(2, '0')}`,
          opponent,
          location: text(c[2]!).startsWith('@ ') ? 'away' : 'home',
          result: score[1],
          teamScore: Number(score[2]),
          opponentScore: Number(score[3]),
          overtime: score[4] === undefined ? 0 : Number(score[4] || 1),
          locationLabel: text(c[7]!) || null,
          recapUrl,
        });
        if (!parsed.success) throw new ArchiveSourceError('invalid');
        resultRows.push({
          gameNumber: Number(text(c[0])),
          sourceRecord: text(c[8]!),
          game: parsed.data,
        });
      }
    }
  }
  resultRows.sort((a, b) => a.gameNumber - b.gameNumber);
  let wins = 0,
    losses = 0;
  for (const [i, r] of resultRows.entries()) {
    if (r.gameNumber !== i + 1 || (i > 0 && r.game.date < resultRows[i - 1]!.game.date))
      throw new ArchiveSourceError('invalid');
    if (r.game.result === 'W') wins++;
    else losses++;
    if (r.sourceRecord !== `${wins}–${losses}`) throw new ArchiveSourceError('invalid');
  }
  const results = resultRows.map((r) => r.game);
  if (
    results.length !== 82 ||
    roster.length < 1 ||
    roster.length > 40 ||
    new Set(roster.map((r) => r.articleUrl ?? r.name)).size !== roster.length ||
    new Set(results.map((g) => g.sourceId)).size !== 82
  )
    throw new ArchiveSourceError('invalid');
  return { roster, statistics, results };
}
export interface TeamArchiveProvider {
  getTeam(team: DirectoryTeam): Promise<TeamArchiveResponse>;
}
export class WikipediaTeamArchiveProvider implements TeamArchiveProvider {
  private cache = new NbaStatsCache({ maxEntries: 30 });
  constructor(
    private client = new WikiArchiveClient(),
    private identities: RosterIdentityProvider = new WikidataRosterIdentities(),
  ) {}
  getTeam(team: DirectoryTeam) {
    return this.cache.getOrLoad(
      team.id,
      async () => {
        const page = await this.client.getPage(`2023–24 ${team.name} season`);
        const data = mapTeamArchive(
          page,
          team,
          await staticTeamDirectoryProvider.listTeams(),
        );
        const people = [
          ...data.roster,
          ...data.statistics['regular-season'],
          ...data.statistics.playoffs,
          ...data.statistics['source-unspecified'],
        ];
        const articles = [
          ...new Set(people.flatMap((p) => (p.articleUrl ? [p.articleUrl] : []))),
        ];
        let identityStatus: 'available' | 'unavailable' = 'available',
          identityRetrievedAt: string | null = null;
        try {
          const mapped = await this.identities.getIdentities(articles);
          identityRetrievedAt = mapped.retrievedAt;
          for (const p of people) {
            const identity = p.articleUrl
              ? mapped.identities.get(p.articleUrl)
              : undefined;
            if (identity) {
              p.nbaPlayerId = identity.nbaPlayerId;
              p.identityUrl = identity.identityUrl;
            }
          }
        } catch (error) {
          if (!(error instanceof ArchiveSourceError)) throw error;
          if (error.kind === 'invalid') throw error;
          identityStatus = 'unavailable';
        }
        return TeamArchiveResponseSchema.parse({
          team,
          season: '2023-24',
          ...data,
          identityStatus,
          identityRetrievedAt,
          attribution: attribution(page),
          provenance: {
            ...archiveProvenance(page, 'regular-season', 'wikipedia'),
            coverage:
              '2023-24 historical team page: source-listed roster, reconciled82 regular-season results, published participant summaries in separate regular/playoff scopes.',
            warnings: [
              'Adapted Wikipedia tables under CC BY-SA4.0; revision and contributor history linked. Exact-article Wikidata P3647 identity mappings are CC0, not player-name guesses.',
              'Historical roster is the source-listed season snapshot, not complete transaction membership or the current roster. Regular-season participant tables may include departed players.',
              'Rounded participant per-game values/percentages are as published; raw totals only when explicitly sourced. No weighted team shooting, possessions or joint lineup metrics inferred.',
              'Derived per-game rows identify their raw-total basis. Unspecified source scope is separate from regular/playoff records.',
              'Source home/away designation includes designated neutral-site games; location/attendance labels remain as published. No timezone/live clock available.',
              'Opponent IDs use explicit linked2023-24 season pages; repeated unlinked labels may reuse only an identical label with an explicit identity link on this same source page.',
              ...(identityStatus === 'unavailable'
                ? [
                    'Player ID mapping source unavailable; only sourced external article links shown.',
                  ]
                : []),
            ],
          },
        });
      },
      () => 24 * 60 * 60_000,
    );
  }
}
