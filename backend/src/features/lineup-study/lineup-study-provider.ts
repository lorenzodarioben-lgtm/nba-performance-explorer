import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  LineupStudyDatasetSchema,
  StudyDirectorySchema,
  StudyLineupResponseSchema,
  StudyLineupRowSchema,
  type DirectoryTeam,
  type StudyLineupQuery,
  type LineupStudyDataset,
  type StudyLineupRow,
} from '@nba-performance-explorer/contracts';
import snapshot from './lineup-study-snapshot.json' with { type: 'json' };
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
export class LineupStudyProvider {
  readonly data: LineupStudyDataset;
  readonly people: Map<string, LineupStudyDataset['people'][number]>;
  readonly lineups: Map<string, LineupStudyDataset['lineups'][number]>;
  private readonly teams: Map<string, DirectoryTeam>;
  private readonly games: Map<string, LineupStudyDataset['games'][number]>;
  constructor(input: unknown, teams: readonly DirectoryTeam[]) {
    this.data = LineupStudyDatasetSchema.parse(input);
    this.people = new Map(this.data.people.map((p) => [p.id, p]));
    this.lineups = new Map(this.data.lineups.map((g) => [g.id, g]));
    this.teams = new Map(teams.map((t) => [t.abbreviation, t]));
    const games = new Map(this.data.games.map((g) => [g.id, g]));
    this.games = games;
    if (
      this.people.size !== 540 ||
      this.lineups.size !== 13867 ||
      games.size !== 1229 ||
      this.data.lineups.reduce((s, g) => s + g.seconds, 0) !==
        2 * this.data.games.reduce((s, g) => s + g.durationSeconds, 0) ||
      this.data.lineups.reduce((s, g) => s + g.plusMinus, 0) !== 0
    )
      throw new Error('Invalid study aggregate integrity.');
    for (const group of this.data.lineups)
      if (
        !this.teams.has(group.team) ||
        group.members.some((id) => !this.people.has(id)) ||
        group.games.some((id) => {
          const g = games.get(id);
          return !g || ![g.home, g.away].includes(group.team);
        })
      )
        throw new Error('Invalid source lineup/game references.');
    if (
      this.data.games.some((g) => !this.teams.has(g.home) || !this.teams.has(g.away)) ||
      this.data.quarantinedGames.some((g) => games.has(g.id))
    )
      throw new Error('Invalid source game/quarantine scope.');
  }
  directory() {
    return StudyDirectorySchema.parse({
      season: '2017-18',
      people: this.data.people,
      teams: [...this.teams.values()],
      source: this.data.source,
    });
  }
  hasTeam(id: string) {
    return [...this.teams.values()].some((t) => t.id === id);
  }
  private row(id: string, minMinutes: number): StudyLineupRow {
    const g = this.lineups.get(id)!;
    const qualified = g.seconds >= minMinutes * 60;
    return StudyLineupRowSchema.parse({
      id: g.id,
      team: this.teams.get(g.team),
      members: g.members.map((id) => ({
        ...this.people.get(id)!,
        nbaPlayerId: null,
        sourceUrl: `https://www.basketball-reference.com/players/${id[3]}/${id.slice(3)}.html`,
      })),
      secondsTogether: g.seconds,
      minutesTogether: g.seconds / 60,
      plusMinus: g.plusMinus,
      plusMinusPer48: qualified ? (g.plusMinus * 2880) / g.seconds : null,
      observedGames: g.games.length,
      games: g.games.map((id) => {
        const record = this.games.get(id)!;
        return { id, date: record.date, url: record.url };
      }),
      reportedQuarterRows: g.quarterRows,
      qualified,
      possessions: null,
      offensiveRating: null,
      defensiveRating: null,
      netRating: null,
      basis:
        'researcher-reconstructed from substitution records; source quarter reports, not official independently verified lineup events',
    });
  }
  list(q: StudyLineupQuery) {
    const groups = this.data.lineups.filter(
      (g) =>
        g.seconds >= q.minMinutes * 60 &&
        (!q.team || this.teams.get(g.team)?.id === q.team) &&
        (!q.members || q.members.every((id) => g.members.includes(id))),
    );
    const value = (g: LineupStudyDataset['lineups'][number]) =>
      q.sort === 'minutes'
        ? g.seconds
        : q.sort === 'plusMinus'
          ? g.plusMinus
          : q.sort === 'games'
            ? g.games.length
            : (g.plusMinus * 2880) / g.seconds;
    groups.sort(
      (a, b) =>
        (q.order === 'asc' ? 1 : -1) * (value(a) - value(b)) ||
        a.id.localeCompare(b.id),
    );
    return StudyLineupResponseSchema.parse({
      season: q.season,
      scope: q.scope,
      rows: groups
        .slice((q.page - 1) * q.pageSize, q.page * q.pageSize)
        .map((g) => this.row(g.id, q.minMinutes)),
      comparison: (q.compare ?? []).map((id) => this.row(id, q.minMinutes)),
      total: groups.length,
      minMinutes: q.minMinutes,
      page: q.page,
      pageSize: q.pageSize,
      usableGames: 1229,
      usableLineups: 13867,
      source: this.data.source,
      quarantinedGames: this.data.quarantinedGames,
      quarantinedOnlyLineupIds: this.data.quarantinedOnlyLineupIds,
      provenance: {
        source: 'open-research',
        servedAt: new Date().toISOString(),
        retrievedAt: this.data.source.retrievedAt,
        asOf: null,
        isLive: false,
        scope: 'regular-season',
        coverage:
          'Author-derived2017-18 research lineup reports only;13,867 usable five-person groups/1,229 source games, one incomplete overtime game quarantined. Not official NBA lineup verification or current/complete league data.',
        warnings: [
          'Arnaud Odet, scholarly dataset DOI10.57745/9NVFIQ, Etalab Open License2.0; source/update/modified-data notices retained, no endorsement implied.',
          'Five members and shared seconds/plus-minus come from researcher reconstruction using substitution records. Raw PBP is not redistributed or independently replayed here.',
          'All reported period clocks/opposing plus-minus reconcile; one missing-period game and its exclusive groups excluded, no missing quarter filled by guessing.',
          'Plus-minus per48 = sourcePM×2880/sharedSeconds, available only at the chosen shared-minute threshold; this is not net rating or a causal quality estimate.',
          'Possessions/ORtg/DRtg/net rating and contiguous stint ordering unavailable. Native BasketballReference identities/short aliases retained; NBA IDs never guessed from names.',
        ],
      },
    });
  }
}
export async function createLineupStudyProvider() {
  const bytes = readFileSync(new URL('./lineup-study-snapshot.json', import.meta.url));
  if (
    createHash('sha256').update(bytes).digest('hex') !==
    '64b1c58f2e7b8f2865500254ea0aa7571bca1704ea51e4a1c92811e24745fd5b'
  )
    throw new Error('Study recorded dataset checksum mismatch.');
  return new LineupStudyProvider(
    snapshot,
    await staticTeamDirectoryProvider.listTeams(),
  );
}
