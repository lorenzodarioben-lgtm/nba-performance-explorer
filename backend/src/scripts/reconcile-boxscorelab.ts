// Opt-in cross-check of BoxScore Lab CSV downloads against the committed league archive.
//   npx tsx backend/src/scripts/reconcile-boxscorelab.ts --dir <folder with the CSVs>
// The CSVs are read as data from the given folder and never copied into the repository.
// BoxScore Lab rows carry no player or game IDs: players are matched by normalised name within
// one season, and a name shared by two archived players is left unresolved.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LeagueArchive, value } from '../features/league/league-archive.js';
import { sumLines } from '../features/league/league-service.js';

const argv = process.argv.slice(2);
const dir = resolve(argv[argv.indexOf('--dir') + 1] ?? '.');
if (!argv.includes('--dir'))
  throw new Error('Pass --dir <folder with BoxScore Lab CSVs>.');

function csv(file: string) {
  const text = readFileSync(join(dir, file), 'utf8');
  if (text.includes('"'))
    throw new Error(`${file}: quoted fields are not supported by this check.`);
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const keys = head!.split(',');
  return lines.map((l) =>
    Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v])),
  );
}
const norm = (n: string) =>
  n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/[^a-z]/g, '');

const archive = new LeagueArchive();
const seasons = [
  ...new Set(
    readdirSync(dir)
      .map((f) => /^(\d{4}-\d{2})-team-game-results\.csv$/.exec(f)?.[1])
      .filter((s): s is string => Boolean(s)),
  ),
].sort();
const report = [];
for (const season of seasons) {
  if (!archive.has(season)) {
    report.push({ season, skipped: 'not in the league archive' });
    continue;
  }
  const files = ['team-game-results', 'team-standings', 'player-season-totals'].map(
    (f) => `${season}-${f}.csv`,
  );
  const fingerprints = Object.fromEntries(
    files.map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(join(dir, f)))
        .digest('hex'),
    ]),
  );
  const s = archive.summary(season);
  const abbr = new Map(s.teams.map((t) => [t.teamId, t.abbreviation]));
  const games = archive.seasonGames(season).scopes['regular-season'].games;

  // 1. Team games: one BoxScore Lab row per team per game, keyed by team, date and opponent.
  const bslGames = csv(files[0]!);
  const ours = new Map<
    string,
    { pts: number; opp: number; home: boolean; neutral: boolean }
  >();
  for (const g of games) {
    const [id, date, home, away, hp, ap, neutral] = g;
    void id;
    ours.set(`${abbr.get(home)}|${date}|${abbr.get(away)}`, {
      pts: hp,
      opp: ap,
      home: true,
      neutral: neutral === 1,
    });
    ours.set(`${abbr.get(away)}|${date}|${abbr.get(home)}`, {
      pts: ap,
      opp: hp,
      home: false,
      neutral: neutral === 1,
    });
  }
  let matched = 0;
  const scoreDiffs: string[] = [],
    missing: string[] = [],
    homeDiffs: string[] = [];
  for (const r of bslGames) {
    const o = ours.get(`${r.team}|${r.game_date}|${r.opponent}`);
    if (!o) {
      missing.push(`${r.team} ${r.game_date} ${r.opponent}`);
      continue;
    }
    matched++;
    if (Number(r.points) !== o.pts || Number(r.opponent_points) !== o.opp)
      scoreDiffs.push(
        `${r.team} ${r.game_date} v ${r.opponent}: archive ${o.pts}-${o.opp}, BSL ${r.points}-${r.opponent_points}`,
      );
    if ((r.home === 'True') !== o.home)
      homeDiffs.push(
        `${r.team} ${r.game_date} v ${r.opponent}${o.neutral ? ' (neutral site)' : ''}`,
      );
  }

  // 2. Standings: W-L per team.
  const reg = s.scopes['regular-season'];
  const standingsDiffs = csv(files[1]!)
    .filter((t) => {
      const ours2 = reg.teams.find((x) => abbr.get(x.teamId) === t.team);
      return !ours2 || ours2.w !== Number(t.wins) || ours2.l !== Number(t.losses);
    })
    .map((t) => t.team);

  // 3. Players: season totals (all stints combined) by normalised name.
  const byName = new Map<string, number[]>();
  for (const p of s.players)
    byName.set(norm(p.name), [...(byName.get(norm(p.name)) ?? []), p.playerId]);
  const combined = new Map<
    number,
    { gp: number; total: ReturnType<typeof sumLines> }
  >();
  for (const id of new Set(reg.players.map((p) => p.playerId))) {
    const st = reg.players.filter((p) => p.playerId === id);
    combined.set(id, {
      gp: st.reduce((n, p) => n + p.gp, 0),
      total: sumLines(st.map((p) => p.totals)),
    });
  }
  const players = csv(files[2]!);
  let resolved = 0,
    agreeing = 0;
  const unresolved: string[] = [],
    ambiguous: string[] = [],
    playerDiffs: string[] = [];
  for (const r of players) {
    const ids = byName.get(norm(r.player_name!)) ?? [];
    if (ids.length > 1) {
      ambiguous.push(r.player_name!);
      continue;
    }
    const c = ids[0] !== undefined ? combined.get(ids[0]) : undefined;
    if (!c) {
      unresolved.push(r.player_name!);
      continue;
    }
    resolved++;
    const diffs: string[] = [];
    const check = (label: string, bsl: string | undefined, mine: number | null) => {
      if (mine !== null && Number(bsl) !== mine) diffs.push(`${label} ${mine}/${bsl}`);
    };
    check('GP', r.games_played, c.gp);
    check('PTS', r.points, value(c.total, 'pts'));
    check('REB', r.rebounds, value(c.total, 'reb'));
    check('AST', r.assists, value(c.total, 'ast'));
    check('FGM', r.field_goals_made, value(c.total, 'fgm'));
    check('FGA', r.field_goal_attempts, value(c.total, 'fga'));
    check('3PM', r.three_point_makes, value(c.total, 'fg3m'));
    check('FTA', r.free_throw_attempts, value(c.total, 'fta'));
    if (diffs.length) playerDiffs.push(`${r.player_name}: ${diffs.join(', ')}`);
    else agreeing++;
  }
  report.push({
    season,
    fingerprints,
    games: {
      bslRows: bslGames.length,
      archiveRows: games.length * 2,
      matched,
      missing: missing.length,
      missingSample: missing.slice(0, 5),
      scoreDiffs,
      homeDiffs,
    },
    standingsDiffs,
    players: {
      bslRows: players.length,
      resolved,
      agreeing,
      differing: playerDiffs.length,
      differingSample: playerDiffs.slice(0, 12),
      unresolved,
      ambiguous,
    },
  });
}
console.log(JSON.stringify(report, null, 1));
