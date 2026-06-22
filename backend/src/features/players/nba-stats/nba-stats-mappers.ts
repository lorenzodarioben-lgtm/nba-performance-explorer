import {
  PlayerGameSchema,
  PlayerProfileSchema,
  PlayerSeasonSchema,
  PlayerSeasonStatsSchema,
  type PlayerGame,
  type PlayerProfile,
  type PlayerSeason,
  type PlayerSeasonStats,
  type TeamSummary,
} from '@nba-performance-explorer/contracts';

import { providerInvalidResponse } from '../provider-error.js';
import type { DirectoryPlayer } from './nba-stats-search.js';
import {
  optionalString,
  ratioOrZero,
  requireFiniteNumber,
  requireString,
  selectResultSet,
  validateMapped,
  type ResultSetTable,
} from './nba-stats-response.js';

const TEAM_ABBREVIATION_PATTERN = /^[A-Z]{3}$/;
const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;

// ---------------------------------------------------------------------------------------------
// commonallplayers -> player directory
// ---------------------------------------------------------------------------------------------

const DIRECTORY_RESULT_SET = 'CommonAllPlayers';
const DIRECTORY_COLUMNS = [
  'PERSON_ID',
  'DISPLAY_LAST_COMMA_FIRST',
  'DISPLAY_FIRST_LAST',
  'ROSTERSTATUS',
  'FROM_YEAR',
  'TO_YEAR',
  'PLAYERCODE',
  'PLAYER_SLUG',
  'TEAM_ID',
  'TEAM_CITY',
  'TEAM_NAME',
  'TEAM_ABBREVIATION',
  'TEAM_CODE',
  'TEAM_SLUG',
  'GAMES_PLAYED_FLAG',
  'OTHERLEAGUE_EXPERIENCE_CH',
] as const;

export function parseDirectory(body: unknown): DirectoryPlayer[] {
  const table = selectResultSet(body, DIRECTORY_RESULT_SET, DIRECTORY_COLUMNS);
  const players: DirectoryPlayer[] = [];

  for (const [rowIndex, row] of table.rows.entries()) {
    const fullName = optionalString(table, row, 'DISPLAY_FIRST_LAST');
    if (fullName === undefined) {
      continue;
    }
    const personIdValue = requireFiniteNumber(table, row, 'PERSON_ID');
    if (!Number.isSafeInteger(personIdValue) || personIdValue <= 0) {
      throw providerInvalidResponse('NBA Stats returned an invalid player id.', {
        stage: 'value-format',
        category: 'invalid-player-id',
        expectedResultSet: DIRECTORY_RESULT_SET,
        rejectedColumn: 'PERSON_ID',
        rejectedRowIndex: rowIndex,
        valueCategory: 'number',
      });
    }
    const { firstName, surname } = parseDirectoryNames(
      requireString(table, row, 'DISPLAY_LAST_COMMA_FIRST'),
      rowIndex,
    );
    const rosterStatus = requireFiniteNumber(table, row, 'ROSTERSTATUS');
    if (rosterStatus !== 0 && rosterStatus !== 1) {
      throw providerInvalidResponse('NBA Stats returned an invalid roster status.', {
        stage: 'value-format',
        category: 'invalid-roster-status',
        expectedResultSet: DIRECTORY_RESULT_SET,
        rejectedColumn: 'ROSTERSTATUS',
        rejectedRowIndex: rowIndex,
        valueCategory: 'number',
      });
    }
    const personId = String(personIdValue);
    const isActive = rosterStatus === 1;
    const team = teamSummaryFor(
      requireFiniteNumber(table, row, 'TEAM_ID'),
      optionalString(table, row, 'TEAM_ABBREVIATION'),
    );

    players.push({
      personId,
      fullName,
      firstName,
      surname,
      isActive,
      ...(team ? { team } : {}),
    });
  }

  return players;
}

function parseDirectoryNames(
  value: string,
  rowIndex: number,
): {
  firstName: string;
  surname: string;
} {
  const commaIndex = value.indexOf(',');
  if (commaIndex <= 0) {
    throw providerInvalidResponse(
      'NBA Stats returned an invalid last-comma-first player name.',
      {
        stage: 'value-format',
        category: 'invalid-last-comma-first-name',
        expectedResultSet: DIRECTORY_RESULT_SET,
        rejectedColumn: 'DISPLAY_LAST_COMMA_FIRST',
        rejectedRowIndex: rowIndex,
        valueCategory: 'string',
      },
    );
  }

  const surname = value.slice(0, commaIndex).trim();
  const firstName = value.slice(commaIndex + 1).trim();
  if (firstName === '' || surname === '') {
    throw providerInvalidResponse(
      'NBA Stats returned an incomplete last-comma-first player name.',
      {
        stage: 'value-format',
        category: 'incomplete-last-comma-first-name',
        expectedResultSet: DIRECTORY_RESULT_SET,
        rejectedColumn: 'DISPLAY_LAST_COMMA_FIRST',
        rejectedRowIndex: rowIndex,
        valueCategory: 'string',
      },
    );
  }

  return { firstName, surname };
}

// A real team only: positive team id and a valid three-letter abbreviation. `TOT` (the traded
// aggregate) and missing/invalid abbreviations are treated as "no team", never fabricated.
function teamSummaryFor(
  teamId: number,
  abbreviation: string | undefined,
): TeamSummary | undefined {
  if (teamId <= 0 || abbreviation === undefined || abbreviation === 'TOT') {
    return undefined;
  }
  if (!TEAM_ABBREVIATION_PATTERN.test(abbreviation)) {
    return undefined;
  }
  return { abbreviation };
}

// ---------------------------------------------------------------------------------------------
// commonplayerinfo -> player profile
// ---------------------------------------------------------------------------------------------

const PROFILE_RESULT_SET = 'CommonPlayerInfo';
const PROFILE_COLUMNS = [
  'PERSON_ID',
  'FIRST_NAME',
  'LAST_NAME',
  'DISPLAY_FIRST_LAST',
  'BIRTHDATE',
  'SCHOOL',
  'COUNTRY',
  'HEIGHT',
  'WEIGHT',
  'SEASON_EXP',
  'JERSEY',
  'POSITION',
  'ROSTERSTATUS',
  'TEAM_ID',
  'TEAM_NAME',
  'TEAM_ABBREVIATION',
  'TEAM_CODE',
  'TEAM_CITY',
  'FROM_YEAR',
  'TO_YEAR',
  'NBA_FLAG',
  'GAMES_PLAYED_FLAG',
  'DRAFT_YEAR',
  'DRAFT_ROUND',
  'DRAFT_NUMBER',
] as const;
const AVAILABLE_SEASONS_RESULT_SET = 'AvailableSeasons';
const AVAILABLE_SEASONS_COLUMNS = ['SEASON_ID'] as const;

export function mapPlayerProfile(body: unknown): PlayerProfile | null {
  selectResultSet(body, AVAILABLE_SEASONS_RESULT_SET, AVAILABLE_SEASONS_COLUMNS);
  const table = selectResultSet(body, PROFILE_RESULT_SET, PROFILE_COLUMNS);

  if (table.rows.length === 0) {
    return null;
  }
  if (table.rows.length > 1) {
    throw providerInvalidResponse('NBA Stats returned multiple profile rows.', {
      stage: 'value-format',
      category: 'multiple-profile-rows',
      expectedResultSet: PROFILE_RESULT_SET,
      rowCount: table.rows.length,
    });
  }

  const row = table.rows[0];
  if (!row) {
    return null;
  }

  const id = String(requireFiniteNumber(table, row, 'PERSON_ID'));
  const fullName = requireString(table, row, 'DISPLAY_FIRST_LAST');
  const team = teamProfileFor(table, row);
  const position = parsePosition(optionalString(table, row, 'POSITION'));
  const jerseyNumber = optionalString(table, row, 'JERSEY');
  const heightInches = parseHeightInches(optionalString(table, row, 'HEIGHT'));
  const weightPounds = parseWeightPounds(optionalString(table, row, 'WEIGHT'));
  const country = optionalString(table, row, 'COUNTRY');
  const draft = parseDraft(table, row);

  const profile = {
    id,
    fullName,
    ...(team ? { team } : {}),
    ...(position ? { position } : {}),
    ...(jerseyNumber ? { jerseyNumber } : {}),
    ...(heightInches !== undefined ? { heightInches } : {}),
    ...(weightPounds !== undefined ? { weightPounds } : {}),
    ...(country ? { country } : {}),
    ...(draft ? { draft } : {}),
  };

  return validateMapped(PlayerProfileSchema, profile, 'player profile');
}

function teamProfileFor(table: ResultSetTable, row: readonly unknown[]) {
  const teamId = requireFiniteNumber(table, row, 'TEAM_ID');
  const abbreviation = optionalString(table, row, 'TEAM_ABBREVIATION');
  const name = optionalString(table, row, 'TEAM_NAME');
  const city = optionalString(table, row, 'TEAM_CITY');

  if (
    teamId <= 0 ||
    abbreviation === undefined ||
    abbreviation === 'TOT' ||
    !TEAM_ABBREVIATION_PATTERN.test(abbreviation) ||
    name === undefined ||
    city === undefined
  ) {
    return undefined;
  }

  return { abbreviation, name, city };
}

function parseHeightInches(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const feet = Number.parseInt(match[1] ?? '', 10);
  const inches = Number.parseInt(match[2] ?? '', 10);
  if (!Number.isInteger(feet) || !Number.isInteger(inches) || inches >= 12) {
    return undefined;
  }
  const total = feet * 12 + inches;
  return total > 0 ? total : undefined;
}

function parsePosition(value: string | undefined): string | undefined {
  if (value === undefined || value.length <= 10) {
    return value;
  }

  const abbreviations: Readonly<Record<string, string>> = {
    Guard: 'G',
    Forward: 'F',
    Center: 'C',
  };
  const abbreviated = value
    .split('-')
    .map((part) => abbreviations[part])
    .filter((part): part is string => part !== undefined);

  return abbreviated.length === value.split('-').length ? abbreviated.join('-') : value;
}

function parseWeightPounds(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  const pounds = Number.parseInt(value, 10);
  return pounds > 0 ? pounds : undefined;
}

function parseDraftPart(value: string | undefined): number | undefined {
  // Covers "Undrafted", empty, and non-numeric values.
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

function parseDraft(table: ResultSetTable, row: readonly unknown[]) {
  const year = parseDraftPart(optionalString(table, row, 'DRAFT_YEAR'));
  const round = parseDraftPart(optionalString(table, row, 'DRAFT_ROUND'));
  const pick = parseDraftPart(optionalString(table, row, 'DRAFT_NUMBER'));

  if (year === undefined || round === undefined || pick === undefined) {
    return undefined;
  }
  return { year, round, pick };
}

// ---------------------------------------------------------------------------------------------
// playercareerstats -> seasons, selected-season statistics, career trends
// ---------------------------------------------------------------------------------------------

const CAREER_RESULT_SET = 'SeasonTotalsRegularSeason';
const CAREER_COLUMNS = [
  'PLAYER_ID',
  'SEASON_ID',
  'LEAGUE_ID',
  'TEAM_ID',
  'TEAM_ABBREVIATION',
  'PLAYER_AGE',
  'GP',
  'GS',
  'MIN',
  'FGM',
  'FGA',
  'FG_PCT',
  'FG3M',
  'FG3A',
  'FG3_PCT',
  'FTM',
  'FTA',
  'FT_PCT',
  'OREB',
  'DREB',
  'REB',
  'AST',
  'STL',
  'BLK',
  'TOV',
  'PF',
  'PTS',
] as const;

interface CareerRow {
  season: string;
  teamId: number;
  teamAbbreviation: string | undefined;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
}

// Parsed career rows grouped by season, preserving NBA.com's chronological insertion order.
export function parseCareerSeasons(body: unknown): Map<string, CareerRow[]> {
  const table = selectResultSet(body, CAREER_RESULT_SET, CAREER_COLUMNS);
  const grouped = new Map<string, CareerRow[]>();

  for (const row of table.rows) {
    const season = requireString(table, row, 'SEASON_ID');
    if (!SEASON_ID_PATTERN.test(season)) {
      throw providerInvalidResponse('NBA Stats returned an invalid season id.', {
        stage: 'value-format',
        category: 'invalid-season-id',
        expectedResultSet: CAREER_RESULT_SET,
        rejectedColumn: 'SEASON_ID',
        valueCategory: 'string',
      });
    }

    const careerRow: CareerRow = {
      season,
      teamId: requireFiniteNumber(table, row, 'TEAM_ID'),
      teamAbbreviation: optionalString(table, row, 'TEAM_ABBREVIATION'),
      gamesPlayed: requireFiniteNumber(table, row, 'GP'),
      minutesPerGame: requireFiniteNumber(table, row, 'MIN'),
      pointsPerGame: requireFiniteNumber(table, row, 'PTS'),
      reboundsPerGame: requireFiniteNumber(table, row, 'REB'),
      assistsPerGame: requireFiniteNumber(table, row, 'AST'),
      stealsPerGame: requireFiniteNumber(table, row, 'STL'),
      blocksPerGame: requireFiniteNumber(table, row, 'BLK'),
      turnoversPerGame: requireFiniteNumber(table, row, 'TOV'),
      fieldGoalPercentage: ratioOrZero(table, row, 'FG_PCT'),
      threePointPercentage: ratioOrZero(table, row, 'FG3_PCT'),
      freeThrowPercentage: ratioOrZero(table, row, 'FT_PCT'),
    };

    const existing = grouped.get(season);
    if (existing) {
      existing.push(careerRow);
    } else {
      grouped.set(season, [careerRow]);
    }
  }

  // Fully map every season group before caching it so all career-backed operations reject the
  // same malformed response and a domain-invalid payload is never retained as a successful
  // cache value.
  for (const rows of grouped.values()) {
    toSeasonStats(rows);
  }

  return grouped;
}

function seasonStartYear(season: string): number {
  return Number.parseInt(season.slice(0, 4), 10);
}

function isAggregateRow(row: CareerRow): boolean {
  return row.teamId === 0 || row.teamAbbreviation === 'TOT';
}

// Pick the single representative row for a season: the only row, or the unique TOT/zero-team
// aggregate for a traded season. Reject multi-team data with no unique aggregate.
function selectSeasonRow(rows: CareerRow[]): CareerRow {
  if (rows.length === 1) {
    const [only] = rows;
    if (!only) {
      throw providerInvalidResponse('NBA Stats returned an empty season group.', {
        stage: 'value-format',
        category: 'empty-season-group',
        expectedResultSet: CAREER_RESULT_SET,
      });
    }
    return only;
  }

  const aggregates = rows.filter(isAggregateRow);
  if (aggregates.length !== 1) {
    throw providerInvalidResponse(
      'NBA Stats returned a multi-team season without a unique aggregate row.',
      {
        stage: 'value-format',
        category: 'multi-team-without-unique-aggregate',
        expectedResultSet: CAREER_RESULT_SET,
        rowCount: rows.length,
      },
    );
  }
  const [aggregate] = aggregates;
  if (!aggregate) {
    throw providerInvalidResponse('NBA Stats returned an empty aggregate group.', {
      stage: 'value-format',
      category: 'empty-aggregate-group',
      expectedResultSet: CAREER_RESULT_SET,
    });
  }
  return aggregate;
}

function seasonTeam(rows: CareerRow[]): TeamSummary | undefined {
  // A single-team season exposes its team; a multi-team season has no single public team.
  if (rows.length !== 1) {
    return undefined;
  }
  const [only] = rows;
  return only ? teamSummaryFor(only.teamId, only.teamAbbreviation) : undefined;
}

function toSeasonStats(rows: CareerRow[]): PlayerSeasonStats {
  const row = selectSeasonRow(rows);
  const team = seasonTeam(rows);

  const stats = {
    season: row.season,
    ...(team ? { team } : {}),
    gamesPlayed: row.gamesPlayed,
    minutesPerGame: row.minutesPerGame,
    pointsPerGame: row.pointsPerGame,
    reboundsPerGame: row.reboundsPerGame,
    assistsPerGame: row.assistsPerGame,
    stealsPerGame: row.stealsPerGame,
    blocksPerGame: row.blocksPerGame,
    turnoversPerGame: row.turnoversPerGame,
    fieldGoalPercentage: row.fieldGoalPercentage,
    threePointPercentage: row.threePointPercentage,
    freeThrowPercentage: row.freeThrowPercentage,
  };

  return validateMapped(PlayerSeasonStatsSchema, stats, 'season statistics');
}

// Parsed-and-grouped career rows; the provider caches one of these per player and derives all
// three career views from it without re-fetching.
export type CareerSeasonGroups = ReturnType<typeof parseCareerSeasons>;

export function availableSeasonsFromGroups(groups: CareerSeasonGroups): PlayerSeason[] {
  return [...groups.entries()]
    .sort((left, right) => seasonStartYear(right[0]) - seasonStartYear(left[0]))
    .map(([season, rows]) => {
      const team = seasonTeam(rows);
      return validateMapped(
        PlayerSeasonSchema,
        { season, ...(team ? { team } : {}) },
        'season summary',
      );
    });
}

export function selectedSeasonStatsFromGroups(
  groups: CareerSeasonGroups,
  season: string,
): PlayerSeasonStats | null {
  const rows = groups.get(season);
  if (!rows) {
    return null;
  }
  return toSeasonStats(rows);
}

export function careerTrendsFromGroups(
  groups: CareerSeasonGroups,
): PlayerSeasonStats[] {
  return [...groups.entries()]
    .sort((left, right) => seasonStartYear(left[0]) - seasonStartYear(right[0]))
    .map(([, rows]) => toSeasonStats(rows));
}

// Newest season start year across the groups (the keys are already validated `YYYY-YY`).
export function newestSeasonStartYear(groups: CareerSeasonGroups): number | null {
  let newest: number | null = null;
  for (const season of groups.keys()) {
    const year = seasonStartYear(season);
    if (newest === null || year > newest) {
      newest = year;
    }
  }
  return newest;
}

export function mapAvailableSeasons(body: unknown): PlayerSeason[] {
  return availableSeasonsFromGroups(parseCareerSeasons(body));
}

export function mapSelectedSeasonStats(
  body: unknown,
  season: string,
): PlayerSeasonStats | null {
  return selectedSeasonStatsFromGroups(parseCareerSeasons(body), season);
}

export function mapCareerTrends(body: unknown): PlayerSeasonStats[] {
  return careerTrendsFromGroups(parseCareerSeasons(body));
}

// ---------------------------------------------------------------------------------------------
// playergamelog -> selected-season game log
// ---------------------------------------------------------------------------------------------

const GAME_LOG_RESULT_SET = 'PlayerGameLog';
const GAME_LOG_COLUMNS = [
  'SEASON_ID',
  'Player_ID',
  'Game_ID',
  'GAME_DATE',
  'MATCHUP',
  'WL',
  'MIN',
  'REB',
  'AST',
  'PTS',
] as const;

const MONTHS: Readonly<Record<string, number>> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

// Parse the observed `MMM DD, YYYY` shape into `YYYY-MM-DD` with explicit English months and
// Gregorian validation (no locale-dependent Date string parsing).
function parseGameDate(value: string): string {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(value);
  if (!match) {
    throw providerInvalidResponse('NBA Stats returned an unrecognized game date.', {
      stage: 'value-format',
      category: 'unrecognized-game-date',
      expectedResultSet: GAME_LOG_RESULT_SET,
      rejectedColumn: 'GAME_DATE',
      valueCategory: 'string',
    });
  }
  const month = MONTHS[(match[1] ?? '').toUpperCase()];
  const day = Number.parseInt(match[2] ?? '', 10);
  const year = Number.parseInt(match[3] ?? '', 10);

  if (month === undefined || !Number.isInteger(day) || !Number.isInteger(year)) {
    throw providerInvalidResponse('NBA Stats returned an invalid game date.', {
      stage: 'value-format',
      category: 'invalid-game-date',
      expectedResultSet: GAME_LOG_RESULT_SET,
      rejectedColumn: 'GAME_DATE',
      valueCategory: 'string',
    });
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw providerInvalidResponse('NBA Stats returned a non-calendar game date.', {
      stage: 'value-format',
      category: 'non-calendar-game-date',
      expectedResultSet: GAME_LOG_RESULT_SET,
      rejectedColumn: 'GAME_DATE',
      valueCategory: 'string',
    });
  }

  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}

interface ParsedMatchup {
  team: TeamSummary;
  opponent: TeamSummary;
  location: 'home' | 'away';
}

function parseMatchup(value: string): ParsedMatchup {
  const match = /^([A-Z]{3}) (vs\.|@) ([A-Z]{3})$/.exec(value);
  if (!match) {
    throw providerInvalidResponse('NBA Stats returned an unrecognized matchup.', {
      stage: 'value-format',
      category: 'unrecognized-matchup',
      expectedResultSet: GAME_LOG_RESULT_SET,
      rejectedColumn: 'MATCHUP',
      valueCategory: 'string',
    });
  }
  const team = match[1];
  const separator = match[2];
  const opponent = match[3];
  if (team === undefined || separator === undefined || opponent === undefined) {
    throw providerInvalidResponse('NBA Stats returned an incomplete matchup.', {
      stage: 'value-format',
      category: 'incomplete-matchup',
      expectedResultSet: GAME_LOG_RESULT_SET,
      rejectedColumn: 'MATCHUP',
      valueCategory: 'string',
    });
  }
  return {
    team: { abbreviation: team },
    opponent: { abbreviation: opponent },
    location: separator === 'vs.' ? 'home' : 'away',
  };
}

export function mapGameLog(body: unknown): PlayerGame[] {
  const table = selectResultSet(body, GAME_LOG_RESULT_SET, GAME_LOG_COLUMNS);

  const games: PlayerGame[] = table.rows.map((row) => {
    const result = requireString(table, row, 'WL');
    if (result !== 'W' && result !== 'L') {
      throw providerInvalidResponse('NBA Stats returned an invalid win/loss value.', {
        stage: 'value-format',
        category: 'invalid-win-loss',
        expectedResultSet: GAME_LOG_RESULT_SET,
        rejectedColumn: 'WL',
        valueCategory: 'string',
      });
    }
    const matchup = parseMatchup(requireString(table, row, 'MATCHUP'));

    const game = {
      id: requireString(table, row, 'Game_ID'),
      date: parseGameDate(requireString(table, row, 'GAME_DATE')),
      team: matchup.team,
      opponent: matchup.opponent,
      location: matchup.location,
      result,
      minutes: requireFiniteNumber(table, row, 'MIN'),
      points: requireFiniteNumber(table, row, 'PTS'),
      rebounds: requireFiniteNumber(table, row, 'REB'),
      assists: requireFiniteNumber(table, row, 'AST'),
    };

    return validateMapped(PlayerGameSchema, game, 'game');
  });

  // Reject duplicate game ids, then sort strictly newest-first; reject a same-day collision so a
  // contract-violating ordering becomes a clean provider error rather than a generic failure.
  const ids = new Set<string>();
  for (const game of games) {
    if (ids.has(game.id)) {
      throw providerInvalidResponse('NBA Stats returned duplicate game ids.', {
        stage: 'value-format',
        category: 'duplicate-game-ids',
        expectedResultSet: GAME_LOG_RESULT_SET,
        rejectedColumn: 'Game_ID',
      });
    }
    ids.add(game.id);
  }

  games.sort((left, right) =>
    left.date < right.date ? 1 : left.date > right.date ? -1 : 0,
  );

  for (let index = 1; index < games.length; index += 1) {
    if (games[index - 1]?.date === games[index]?.date) {
      throw providerInvalidResponse('NBA Stats returned multiple games on one date.', {
        stage: 'value-format',
        category: 'multiple-games-on-one-date',
        expectedResultSet: GAME_LOG_RESULT_SET,
        rejectedColumn: 'GAME_DATE',
        rejectedRowIndex: index,
      });
    }
  }

  return games;
}
