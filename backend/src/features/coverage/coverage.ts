import {
  CoverageResponseSchema,
  type CoverageDataset,
  type CoverageResponse,
  type DataSource,
} from '@nba-performance-explorer/contracts';
import type { RecordedArchiveProvider } from '../recorded-archive/recorded-provider.js';
import type { ShotArchiveProvider } from '../shot-archive/shot-provider.js';
import { shotSource } from '../shot-archive/shot-provider.js';
import type { LineupStudyProvider } from '../lineup-study/lineup-study-provider.js';
import { archiveSnapshot } from '../wiki-archive/archive-provider.js';
import { buildPlayoffBracket } from '../wiki-archive/playoff-series.js';

const WIKIPEDIA = {
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};
const field = (
  name: string,
  label: string,
  rows: readonly unknown[],
  has: (row: never) => boolean,
  note: string | null = null,
) => ({
  field: name,
  label,
  available: rows.filter((r) => has(r as never)).length,
  total: rows.length,
  note,
});
const span = (dates: readonly string[]) => {
  const sorted = [...dates].sort();
  return { retrievedFrom: sorted[0] ?? null, retrievedTo: sorted.at(-1) ?? null };
};

export interface CoverageInputs {
  recorded: RecordedArchiveProvider | undefined;
  shots: ShotArchiveProvider | undefined;
  lineups: LineupStudyProvider | undefined;
  playerSource: DataSource | 'unknown';
  archiveMode: 'live' | 'bundled';
}

/**
 * Coverage of every committed dataset, measured from the data the tools read: counts, the share
 * of records with each field, revisions and retrieval times. A dataset whose provider is
 * disabled on this server is simply absent.
 */
export function buildCoverage(inputs: CoverageInputs): CoverageResponse {
  const datasets: CoverageDataset[] = [];
  if (inputs.recorded) {
    const data = inputs.recorded.dataset;
    const regular = data.snapshots.flatMap((s) => s.statistics['regular-season']);
    const playoffRows = data.snapshots.flatMap((s) => s.statistics.playoffs);
    const unknownScope = data.snapshots.flatMap((s) => s.statistics['source-unspecified']);
    const roster = data.snapshots.flatMap((s) => s.roster);
    const games = inputs.recorded.reconciliationSummary();
    const revisions = data.snapshots.map((s) => s.attribution.revision);
    const rawTeams = data.snapshots.filter((s) =>
      s.statistics['regular-season'].some((r) => r.rawTotals !== null),
    ).length;
    datasets.push({
      id: 'recorded-2023-24',
      title: '2023–24 team pages (30 teams, recorded and reconciled)',
      season: '2023-24',
      scope: 'regular-season',
      completeness: 'partial-scope',
      completenessNote: `${games.agreed} of ${data.snapshots.length * 41} regular-season games are agreed by both teams' pages; ${games.conflicting + games.unpaired} are quarantined and never scored. Player rows come from each team's published table, not an official league feed.`,
      storage: 'committed-with-app',
      source: {
        name: 'Wikipedia "2023–24 <team> season" articles, with Wikidata player identities',
        url: 'https://en.wikipedia.org/wiki/2023%E2%80%9324_NBA_season',
        ...WIKIPEDIA,
        version: `${revisions.length} page revisions, ${Math.min(...revisions)}–${Math.max(...revisions)}`,
      },
      ...span(data.snapshots.map((s) => s.retrievedAt)),
      sourceUpdatedAt: null,
      counts: [
        { label: 'Teams', value: data.snapshots.length },
        { label: 'Schedule rows', value: data.snapshots.reduce((n, s) => n + s.results.length, 0) },
        { label: 'Games agreed by both teams', value: games.agreed },
        { label: 'Games quarantined', value: games.conflicting + games.unpaired },
        { label: 'Regular-season player rows', value: regular.length },
        { label: 'Playoff player rows', value: playoffRows.length },
        { label: 'Rows of unstated scope', value: unknownScope.length },
        { label: 'Roster entries', value: roster.length },
      ],
      fields: [
        field('nbaPlayerId', 'NBA player identity (Wikidata)', regular, (r: { nbaPlayerId: string | null }) => r.nbaPlayerId !== null),
        field('gamesStarted', 'Games started', regular, (r: { gamesStarted: number | null }) => r.gamesStarted !== null),
        ...(
          [
            ['minutesPerGame', 'Minutes per game'],
            ['pointsPerGame', 'Points per game'],
            ['reboundsPerGame', 'Rebounds per game'],
            ['assistsPerGame', 'Assists per game'],
            ['stealsPerGame', 'Steals per game'],
            ['blocksPerGame', 'Blocks per game'],
            ['fieldGoalPercentage', 'Field-goal %'],
            ['threePointPercentage', '3-point %'],
            ['freeThrowPercentage', 'Free-throw %'],
          ] as const
        ).map(([key, label]) =>
          field(key, label, regular, (r: Record<string, unknown>) => r[key] !== null),
        ),
        field('rawTotals', 'Raw season totals (traded players)', regular, (r: { rawTotals: unknown }) => r.rawTotals !== null, `Published by ${rawTeams} of ${data.snapshots.length} team pages (those with totals tables); used to combine a traded player's rows only when every team page has them.`),
        field('position', 'Roster position (as listed)', roster, (r: { position: string }) => Boolean(r.position)),
        field('ageOnOctober1', 'Age on October 1, 2023', roster, (r: { ageOnOctober1: number | null }) => r.ageOnOctober1 !== null),
      ],
      unavailable: [
        'Shot attempts and makes (FGA, 3PA, FTA): the tables publish percentages only',
        'Turnovers, offensive/defensive rebounds, plus-minus',
        'Years of NBA experience',
        'Possessions, ratings or play-by-play',
      ],
      tools: [
        { label: 'Research workbench', to: '/lab/workbench' },
        { label: 'Recorded leaders', to: '/leaders/recorded' },
        { label: 'Standings race', to: '/standings/race' },
        { label: 'Team seasons', to: '/teams' },
      ],
    });
  }
  const snapshot = archiveSnapshot();
  const league = snapshot.league;
  datasets.push({
    id: 'league-2023-24',
    title: '2023–24 published standings and category leaders',
    season: '2023-24',
    scope: 'season-tables',
    completeness: 'complete-scope',
    completenessNote: 'All 30 teams in the published final standings; category winners as printed.',
    storage: 'committed-with-app',
    source: {
      name: 'Wikipedia "2023–24 NBA season" article (structured tables only)',
      url: `https://en.wikipedia.org/w/index.php?oldid=${league.page.revision}`,
      ...WIKIPEDIA,
      version: `revision ${league.page.revision}`,
    },
    retrievedFrom: league.page.retrievedAt,
    retrievedTo: league.page.retrievedAt,
    sourceUpdatedAt: null,
    counts: [
      { label: 'Standings rows', value: league.standings.length },
      { label: 'Published category leaders', value: league.leaders.length },
    ],
    fields: [
      field('gamesBehind', 'Games behind (as published)', league.standings, (r: { gamesBehind: number | null }) => r.gamesBehind !== null, null),
    ],
    unavailable: ['Division standings', 'Official tie-breaker detail'],
    tools: [{ label: 'Standings', to: '/standings' }, { label: 'Leaders', to: '/leaders' }],
  });
  const playoffs = snapshot.playoffs;
  const bracket = buildPlayoffBracket(
    playoffs.games,
    playoffs.seeds ? new Map(Object.entries(playoffs.seeds)) : null,
  );
  const leaderLabels = playoffs.games.flatMap((g) =>
    g.leaders.flatMap((l) => [l.points, l.rebounds, l.assists]),
  );
  datasets.push({
    id: 'playoffs-2024',
    title: '2024 playoffs: every game with period scores',
    season: '2023-24',
    scope: 'playoffs',
    completeness: bracket.complete ? 'complete-scope' : 'partial-scope',
    completenessNote: bracket.complete
      ? `All ${bracket.series.length} series form a complete bracket; play-in games are not in this table.`
      : 'The recorded games do not form a complete bracket.',
    storage: 'committed-with-app',
    source: {
      name: 'Wikipedia "2024 NBA playoffs" article (structured tables only)',
      url: `https://en.wikipedia.org/w/index.php?oldid=${playoffs.page.revision}`,
      ...WIKIPEDIA,
      version: `revision ${playoffs.page.revision}`,
    },
    retrievedFrom: playoffs.page.retrievedAt,
    retrievedTo: playoffs.page.retrievedAt,
    sourceUpdatedAt: null,
    counts: [
      { label: 'Games', value: playoffs.games.length },
      { label: 'Series', value: bracket.series.length },
      { label: 'Published seeds', value: playoffs.seeds ? Object.keys(playoffs.seeds).length : 0 },
      { label: 'Overtime games', value: playoffs.games.filter((g) => g.quarters.length > 4).length },
    ],
    fields: [
      field('quarters', 'Period scores', playoffs.games, (g: { quarters: unknown[] }) => g.quarters.length >= 4),
      field('venue', 'Venue', playoffs.games, (g: { venue: string | null }) => g.venue !== null),
      field('reportedTime', 'Reported local time', playoffs.games, (g: { reportedTime: string | null }) => g.reportedTime !== null, 'No verified time zone, so no UTC tip-off is derived.'),
      field('leaders', 'Published leader labels (points/rebounds/assists)', leaderLabels, (l: string | null) => l !== null),
    ],
    unavailable: [
      'Full box scores and player minutes',
      'Play-by-play, scoring runs and lead changes',
      'UTC tip-off times',
    ],
    tools: [
      { label: 'Bracket', to: '/games/bracket' },
      { label: 'Finals film room', to: '/games/series/r4-BOS-DAL' },
      { label: 'Playoff games', to: '/games' },
    ],
  });
  if (inputs.shots) {
    const shots = inputs.shots.shots;
    const dates = shots.map((s) => s.date).sort();
    datasets.push({
      id: 'shots-2018',
      title: '2018 playoff shot locations',
      season: '2017-18',
      scope: 'playoffs',
      completeness: 'partial-scope',
      completenessNote: `${inputs.shots.directory.games.length} games from ${dates[0]} to ${dates.at(-1)}: the archive ends before the playoffs finished and covers ${inputs.shots.directory.teams.length} teams.`,
      storage: 'committed-with-app',
      source: {
        name: `${shotSource.title} by ${shotSource.creator} (Kaggle)`,
        url: shotSource.url,
        licence: shotSource.licence,
        licenceUrl: shotSource.licenceUrl,
        version: `version ${shotSource.version}, sha256 ${shotSource.sha256.slice(0, 12)}…`,
      },
      retrievedFrom: shotSource.retrievedAt,
      retrievedTo: shotSource.retrievedAt,
      sourceUpdatedAt: shotSource.sourceUpdatedAt,
      counts: [
        { label: 'Field-goal attempts', value: shots.length },
        { label: 'Games', value: inputs.shots.directory.games.length },
        { label: 'Players', value: inputs.shots.directory.players.length },
        { label: 'Teams', value: inputs.shots.directory.teams.length },
      ],
      fields: [
        field('coordinates', 'Court coordinates', shots, (s: { x: number | null; y: number | null }) => s.x !== null && s.y !== null),
        field('zone', 'Source shot zone', shots, (s: { zone: string }) => Boolean(s.zone)),
        field('distanceFeet', 'Shot distance', shots, (s: { distanceFeet: number }) => Number.isFinite(s.distanceFeet)),
      ],
      unavailable: [
        'Free throws (the archive holds field goals only)',
        'Shot events for Finals Games 3 and 4 (NBA.com’s league zone baseline covers all 82 games)',
        'Defender and shot-clock context',
      ],
      tools: [{ label: 'Shot studio', to: '/lab/shots' }, { label: 'Game shooting', to: '/games/shooting' }],
    });
  }
  if (inputs.lineups) {
    const d = inputs.lineups.data;
    datasets.push({
      id: 'lineups-2017-18',
      title: '2017–18 researcher-reconstructed five-player units',
      season: '2017-18',
      scope: 'regular-season',
      completeness: 'partial-scope',
      completenessNote: `${d.games.length} games; ${d.quarantinedGames.length} quarantined for missing source periods. Units are reconstructed by a researcher, not officially replayed events.`,
      storage: 'committed-with-app',
      source: {
        name: `${d.source.title} (${d.source.creator})`,
        url: `https://doi.org/${d.source.doi}`,
        licence: d.source.licence,
        licenceUrl: d.source.licenceUrl,
        version: `dataset ${d.source.datasetVersion}`,
      },
      retrievedFrom: d.source.retrievedAt,
      retrievedTo: d.source.retrievedAt,
      sourceUpdatedAt: d.source.sourceUpdatedAt,
      counts: [
        { label: 'Games', value: d.games.length },
        { label: 'Five-player units', value: d.lineups.length },
        { label: 'People', value: d.people.length },
        { label: 'Games quarantined', value: d.quarantinedGames.length },
      ],
      fields: [
        field('seconds', 'Shared playing time', d.lineups, (l: { seconds: number }) => l.seconds > 0),
        field('plusMinus', 'Signed plus-minus', d.lineups, (l: { plusMinus: number }) => Number.isFinite(l.plusMinus)),
      ],
      unavailable: ['Possessions', 'Offensive, defensive and net ratings', 'On/off splits'],
      tools: [{ label: 'Lineup research', to: '/lab/lineups' }],
    });
  }
  return CoverageResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    datasets,
    liveSources: [
      {
        id: 'nba-stats',
        name: 'NBA.com Stats',
        use: 'Player search, profiles, seasons, game logs and careers, fetched by the server when a page asks.',
        mode: inputs.playerSource === 'nba-stats' ? 'on-request' : 'fixtures',
        note:
          inputs.playerSource === 'nba-stats'
            ? 'Undocumented service; may be slow or unreachable from some hosts. Pages say so and show nothing in its place.'
            : 'This server is configured with labelled synthetic fixtures for player pages, not NBA results.',
      },
      {
        id: 'wikipedia',
        name: 'Wikipedia',
        use: '2023–24 awards and 2023 draft read on request; season, playoff and team tables have committed copies.',
        mode: inputs.archiveMode === 'bundled' ? 'not-contacted' : 'fallback-to-committed',
        note:
          inputs.archiveMode === 'bundled'
            ? 'Bundled mode: the committed copies are served and Wikipedia is never contacted, so awards and draft are unavailable.'
            : 'Fetched live and cached; when unreachable the committed copies are served and labelled.',
      },
      {
        id: 'wikidata',
        name: 'Wikidata',
        use: 'Champions by season for the history navigator, fetched on request (identities for the recorded season are committed).',
        mode: 'on-request',
        note: 'CC0 statements; modern franchise labels may differ from historical names.',
      },
    ],
  });
}
