import {
  ShotAttemptSchema,
  type ShotAttempt,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
// Bounded RFC4180 subset: explicit quoted fields/escaped quotes, no silent malformed-row repair.
export function parseShotCsv(
  csv: string,
  teams: readonly DirectoryTeam[],
): ShotAttempt[] {
  if (Buffer.byteLength(csv, 'utf8') > 3_000_000)
    throw new Error('Shot source payload exceeds cap.');
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const cell = () => {
    row.push(field);
    field = '';
    closed = false;
    if (row.length > 24) throw new Error('Shot column cap.');
  };
  const finish = () => {
    cell();
    if (row.some((v) => v !== '')) rows.push(row);
    row = [];
    if (rows.length > 14_001) throw new Error('Shot row cap.');
  };
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (quoted) {
      if (c === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === ',') cell();
    else if (c === '\n') finish();
    else if (c === '\r' && csv[i + 1] === '\n') {
      finish();
      i++;
    } else if (c === '"' && !field && !closed) quoted = true;
    else {
      if (closed || c === '"' || c === '\r') throw new Error('Malformed shot CSV.');
      field += c;
    }
    if (field.length > 200) throw new Error('Shot field cap.');
  }
  if (quoted) throw new Error('Unclosed shot CSV quote.');
  if (field || row.length || closed) finish();
  const headers = [
    'GRID_TYPE',
    'GAME_ID',
    'GAME_EVENT_ID',
    'PLAYER_ID',
    'PLAYER_NAME',
    'TEAM_ID',
    'TEAM_NAME',
    'PERIOD',
    'MINUTES_REMAINING',
    'SECONDS_REMAINING',
    'EVENT_TYPE',
    'ACTION_TYPE',
    'SHOT_TYPE',
    'SHOT_ZONE_BASIC',
    'SHOT_ZONE_AREA',
    'SHOT_ZONE_RANGE',
    'SHOT_DISTANCE',
    'LOC_X',
    'LOC_Y',
    'SHOT_ATTEMPTED_FLAG',
    'SHOT_MADE_FLAG',
    'GAME_DATE',
    'HTM',
    'VTM',
  ];
  if (JSON.stringify(rows.shift()) !== JSON.stringify(headers))
    throw new Error('Unsupported shot source columns.');
  const byId = new Map(teams.map((t) => [t.sourceId, t])),
    byAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  const ids = new Set<string>(),
    gameScope = new Map<string, string>();
  const integer = (s: string) => {
    if (!/^-?\d+$/.test(s)) throw new Error('Invalid shot number.');
    return Number(s);
  };
  return rows.map((r) => {
    if (
      r.length !== 24 ||
      r[0] !== 'Shot Chart Detail' ||
      r[19] !== '1' ||
      !['0', '1'].includes(r[20]!) ||
      !['2PT Field Goal', '3PT Field Goal'].includes(r[12]!) ||
      r[10] !== (r[20] === '1' ? 'Made Shot' : 'Missed Shot') ||
      !/^\d{8}$/.test(r[21]!)
    )
      throw new Error('Invalid shot row.');
    const team = byId.get(r[5]!),
      home = byAbbr.get(r[22]!),
      away = byAbbr.get(r[23]!);
    if (!team || !home || !away || r[6] !== team.name)
      throw new Error('Unverified shot team identity.');
    const shot = ShotAttemptSchema.parse({
      id: `nba:${r[1]}:${r[2]}`,
      gameId: `nba:${r[1]}`,
      eventId: integer(r[2]!),
      playerId: r[3],
      playerName: r[4],
      team,
      home,
      away,
      date: `${r[21]!.slice(0, 4)}-${r[21]!.slice(4, 6)}-${r[21]!.slice(6, 8)}`,
      period: integer(r[7]!),
      minutesRemaining: integer(r[8]!),
      secondsRemaining: integer(r[9]!),
      type: r[12] === '2PT Field Goal' ? '2PT' : '3PT',
      made: r[20] === '1',
      zone: r[13],
      area: r[14],
      range: r[15],
      action: r[11],
      distanceFeet: integer(r[16]!),
      x: r[17] === '' ? null : integer(r[17]!),
      y: r[18] === '' ? null : integer(r[18]!),
    });
    if (shot.period > 4 && shot.minutesRemaining > 5)
      throw new Error('Invalid overtime clock.');
    if (ids.has(shot.id)) throw new Error('Duplicate source shot event.');
    ids.add(shot.id);
    const scope = `${shot.date}:${home.id}:${away.id}`;
    if (gameScope.has(shot.gameId) && gameScope.get(shot.gameId) !== scope)
      throw new Error('Conflicting shot game identity.');
    gameScope.set(shot.gameId, scope);
    if (
      shot.x !== null &&
      shot.y !== null &&
      Math.floor(Math.hypot(shot.x, shot.y) / 10) !== shot.distanceFeet
    )
      throw new Error('Shot distance/coordinate scale mismatch.');
    if (
      (shot.zone === 'Left Corner 3' && shot.x !== null && shot.x >= 0) ||
      (shot.zone === 'Right Corner 3' && shot.x !== null && shot.x <= 0)
    )
      throw new Error('Shot side/orientation mismatch.');
    return shot;
  });
}
