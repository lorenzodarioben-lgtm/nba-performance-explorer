// Opt-in build of the league archive's franchise and roster files from NBA.com Stats.
//
//   npx tsx backend/src/scripts/build-league-extras.ts --franchises [--write]
//   npx tsx backend/src/scripts/build-league-extras.ts --rosters --from 1983-84 --to 2025-26 [--write]
//
// --franchises: franchisehistory (every franchise and defunct team), then per active franchise
// teamdetails (dated city/nickname history, titles) and teamyearbyyearstats (every season).
// --rosters: commonteamroster for every team of every archived season. Serial requests with a
// pause, cached on disk like build-league-archive.ts. Writes digests into extras-index.json.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import { LeagueArchive } from '../features/league/league-archive.js';
import {
  ExtrasIndexSchema,
  FranchiseArchiveSchema,
  SeasonRostersSchema,
  type ExtrasIndex,
} from '../features/league/league-extras-data.js';

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const write = argv.includes('--write');
const delayMs = Number(flag('--delay') ?? 1500);
const cacheDir = resolve(flag('--cache') ?? join(tmpdir(), 'nba-league-archive-cache'));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const dataDir = resolve(root, 'backend/src/features/league/data');
mkdirSync(cacheDir, { recursive: true });
const client = createNbaStatsHttpClient({ timeoutMs: 45_000 });
const sha256 = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
let last = 0;

async function stats(endpoint: string, params: Record<string, string>) {
  const file = join(
    cacheDir,
    `${endpoint}-${sha256(endpoint + JSON.stringify(params)).slice(0, 24)}.json`,
  );
  let body: { retrievedAt: string; json: unknown };
  if (existsSync(file)) body = JSON.parse(readFileSync(file, 'utf8'));
  else {
    const wait = last + delayMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    let json: unknown;
    for (let attempt = 1; ; attempt++) {
      try {
        json = await client.fetchEndpoint(endpoint, params);
        break;
      } catch (error) {
        if (attempt >= 2) throw error;
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
    last = Date.now();
    body = { retrievedAt: new Date().toISOString(), json };
    writeFileSync(file, JSON.stringify(body));
  }
  const raw = body.json as {
    resultSets?: { name: string; headers: string[]; rowSet: unknown[][] }[];
  };
  if (!Array.isArray(raw.resultSets)) throw new Error(`${endpoint}: no resultSets`);
  const sets: Record<string, Record<string, unknown>[]> = {};
  for (const s of raw.resultSets)
    sets[s.name] = s.rowSet.map((row) =>
      Object.fromEntries(s.headers.map((h, i) => [h, row[i]])),
    );
  return {
    sets,
    retrievedAt: body.retrievedAt,
    sha256: sha256(JSON.stringify(raw.resultSets)),
  };
}
const teamYear = (r: Record<string, unknown>) => ({
  season: String(r.YEAR),
  city: str(r.TEAM_CITY) ?? '',
  name: str(r.TEAM_NAME) ?? '',
  gp: int(r.GP) ?? 0,
  wins: int(r.WINS) ?? 0,
  losses: int(r.LOSSES) ?? 0,
  conferenceRank: int(r.CONF_RANK),
  divisionRank: int(r.DIV_RANK),
  playoffWins: int(r.PO_WINS),
  playoffLosses: int(r.PO_LOSSES),
  finals: str(r.NBA_FINALS_APPEARANCE),
  pts: int(r.PTS),
  fgm: int(r.FGM),
  fga: int(r.FGA),
  fg3m: int(r.FG3M),
  fg3a: int(r.FG3A),
  ftm: int(r.FTM),
  fta: int(r.FTA),
  oreb: int(r.OREB),
  dreb: int(r.DREB),
  reb: int(r.REB),
  ast: int(r.AST),
  stl: int(r.STL),
  tov: int(r.TOV),
  blk: int(r.BLK),
  pf: int(r.PF),
});
const str = (v: unknown) =>
  v === null || v === undefined ? null : String(v).trim() || null;
const int = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : v === null || v === undefined || v === ''
      ? null
      : Number.isFinite(Number(v))
        ? Number(v)
        : null;

const indexFile = join(dataDir, 'extras-index.json');
const index: ExtrasIndex = existsSync(indexFile)
  ? ExtrasIndexSchema.parse(JSON.parse(readFileSync(indexFile, 'utf8')))
  : {
      kind: 'nba-stats-league-extras',
      version: 1,
      franchisesSha256: null,
      rosters: [],
    };
const save = (name: string, value: unknown) => {
  const bytes = gzipSync(JSON.stringify(value), { level: 9 });
  if (write) writeFileSync(join(dataDir, name), bytes);
  return sha256(bytes);
};

if (argv.includes('--franchises')) {
  const history = await stats('franchisehistory', { LeagueID: '00' });
  const franchises = [];
  const requests = [
    {
      endpoint: 'franchisehistory',
      retrievedAt: history.retrievedAt,
      sha256: history.sha256,
    },
  ];
  const active = history.sets.FranchiseHistory!.filter((r) =>
    String(r.TEAM_ID).startsWith('16106127'),
  );
  for (const teamId of [...new Set(active.map((r) => Number(r.TEAM_ID)))]) {
    const details = await stats('teamdetails', { TeamID: String(teamId) });
    const years = await stats('teamyearbyyearstats', {
      LeagueID: '00',
      PerMode: 'Totals',
      SeasonType: 'Regular Season',
      TeamID: String(teamId),
    });
    requests.push(
      {
        endpoint: 'teamdetails',
        retrievedAt: details.retrievedAt,
        sha256: details.sha256,
      },
      {
        endpoint: 'teamyearbyyearstats',
        retrievedAt: years.retrievedAt,
        sha256: years.sha256,
      },
    );
    const bg = details.sets.TeamBackground?.[0] ?? {};
    const titles = (set: string) =>
      (details.sets[set] ?? []).map((r) => ({
        year: str(r.YEARAWARDED) ?? '',
        opponent: str(r.OPPOSITETEAM),
      }));
    franchises.push({
      teamId,
      abbreviation: str(bg.ABBREVIATION),
      city: str(bg.CITY),
      nickname: str(bg.NICKNAME),
      yearFounded: int(bg.YEARFOUNDED),
      arena: str(bg.ARENA),
      identities: (details.sets.TeamHistory ?? []).map((r) => ({
        city: str(r.CITY) ?? '',
        nickname: str(r.NICKNAME) ?? '',
        from: int(r.YEARFOUNDED)!,
        to: int(r.YEARACTIVETILL)!,
      })),
      championships: titles('TeamAwardsChampionships'),
      conferenceTitles: titles('TeamAwardsConf'),
      divisionTitles: titles('TeamAwardsDiv'),
      retired: (details.sets.TeamRetired ?? []).map((r) => ({
        player: str(r.PLAYER) ?? '',
        playerId: int(r.PLAYERID),
        jersey: str(r.JERSEY),
        seasonsWithTeam: str(r.SEASONSWITHTEAM),
        year: int(r.YEAR),
      })),
      seasons: (years.sets.TeamStats ?? []).map(teamYear),
    });
  }
  const totals = (r: Record<string, unknown>) => ({
    teamId: Number(r.TEAM_ID),
    city: str(r.TEAM_CITY) ?? '',
    name: str(r.TEAM_NAME) ?? '',
    from: int(r.START_YEAR)!,
    to: int(r.END_YEAR)!,
    games: int(r.GAMES) ?? 0,
    wins: int(r.WINS) ?? 0,
    losses: int(r.LOSSES) ?? 0,
    playoffAppearances: int(r.PO_APPEARANCES) ?? 0,
    divisionTitles: int(r.DIV_TITLES) ?? 0,
    conferenceTitles: int(r.CONF_TITLES) ?? 0,
    leagueTitles: int(r.LEAGUE_TITLES) ?? 0,
  });
  const defunctSeasons = [];
  for (const teamId of [
    ...new Set((history.sets.DefunctTeams ?? []).map((r) => Number(r.TEAM_ID))),
  ]) {
    const years = await stats('teamyearbyyearstats', {
      LeagueID: '00',
      PerMode: 'Totals',
      SeasonType: 'Regular Season',
      TeamID: String(teamId),
    });
    requests.push({
      endpoint: 'teamyearbyyearstats',
      retrievedAt: years.retrievedAt,
      sha256: years.sha256,
    });
    defunctSeasons.push(
      ...(years.sets.TeamStats ?? []).map((r) => ({ teamId, ...teamYear(r) })),
    );
  }
  const archive = FranchiseArchiveSchema.parse({
    kind: 'nba-stats-franchises',
    version: 1,
    builtAt: new Date().toISOString(),
    requests,
    franchiseHistory: history.sets.FranchiseHistory!.map(totals),
    defunct: (history.sets.DefunctTeams ?? []).map(totals),
    defunctSeasons,
    franchises,
  });
  index.franchisesSha256 = save('franchises.json.gz', archive);
  console.log(
    `franchises: ${franchises.length} active, ${archive.defunct.length} defunct rows, ${archive.franchiseHistory.length} identity rows`,
  );
}

if (argv.includes('--rosters')) {
  const from = Number(flag('--from')?.slice(0, 4));
  const to = Number(flag('--to')?.slice(0, 4));
  const league = new LeagueArchive();
  for (const season of league.seasons.filter(
    (s) => Number(s.slice(0, 4)) >= from && Number(s.slice(0, 4)) <= to,
  )) {
    const teams = league.summary(season).teams;
    const out = [];
    const requests = [];
    for (const t of teams) {
      const r = await stats('commonteamroster', {
        LeagueID: '00',
        Season: season,
        TeamID: String(t.teamId),
      });
      requests.push({
        endpoint: 'commonteamroster',
        retrievedAt: r.retrievedAt,
        sha256: r.sha256,
      });
      out.push({
        teamId: t.teamId,
        players: (r.sets.CommonTeamRoster ?? []).map((p) => ({
          playerId: Number(p.PLAYER_ID),
          name: str(p.PLAYER) ?? '',
          number: str(p.NUM),
          position: str(p.POSITION),
          height: str(p.HEIGHT),
          weight: str(p.WEIGHT),
          birthDate: str(p.BIRTH_DATE),
          age: int(p.AGE),
          experience: str(p.EXP),
          school: str(p.SCHOOL),
          howAcquired: str(p.HOW_ACQUIRED),
        })),
        coaches: (r.sets.Coaches ?? []).map((c) => ({
          name: str(c.COACH_NAME) ?? '',
          type: str(c.COACH_TYPE),
          assistant: Number(c.IS_ASSISTANT) === 1,
        })),
      });
    }
    const value = SeasonRostersSchema.parse({
      kind: 'nba-stats-rosters',
      version: 1,
      season,
      requests,
      teams: out,
    });
    const digest = save(`${season}.rosters.json.gz`, value);
    index.rosters = [
      ...index.rosters.filter((x) => x.season !== season),
      { season, sha256: digest },
    ].sort((a, b) => a.season.localeCompare(b.season));
    console.log(
      `${season} rosters: ${out.length} teams, ${out.reduce((n, t) => n + t.players.length, 0)} players`,
    );
    if (write)
      writeFileSync(
        indexFile,
        JSON.stringify(ExtrasIndexSchema.parse(index), null, 1) + '\n',
      );
  }
}
if (write)
  writeFileSync(
    indexFile,
    JSON.stringify(ExtrasIndexSchema.parse(index), null, 1) + '\n',
  );
