// Season-aware team marks. A franchise keeps one NBA.com team id through relocations and renames
// (Seattle SuperSonics -> Oklahoma City Thunder share 1610612760), so the mark is chosen by id
// *and* season, then checked against the season's own team name from the data. A season with no
// verified supplied mark gets no logo (a neutral fallback), never a later or earlier brand.
//
// Era boundaries:
// - historical marks use the actual logo years stated in the supplied manifest
//   (NBA_HISTORICAL_FRANCHISE_LOGOS/manifest.txt, after SportsLogos.Net), not the filename's range;
// - current marks start in the season the same design became the team's mark, where that is
//   well established; `confidence: 'medium'` marks a boundary the owner should confirm
//   (docs/visual-assets/INTEGRATION_REPORT.md). Where it was unclear, the earlier seasons fall back.

export interface LogoEra {
  /** First season the mark applies to, e.g. '1995-96'. */
  from: string;
  /** Last season, inclusive; null while it is still the team's mark. */
  to: string | null;
  /** File key under /images/teams/<key>-<64|256>.webp. */
  key: string;
  /** The team's full name in these seasons, as the data names it. */
  identity: string;
  confidence: 'high' | 'medium';
  /** Dark marks get a light halo so they read on the charcoal background. */
  halo?: boolean;
  note?: string;
}

const era = (
  from: string,
  to: string | null,
  key: string,
  identity: string,
  confidence: LogoEra['confidence'],
  extra: Partial<LogoEra> = {},
): LogoEra => ({ from, to, key, identity, confidence, ...extra });

// Keyed by NBA.com team id (the digits of the canonical `nba:<id>`).
export const TEAM_LOGO_ERAS: Readonly<Record<string, readonly LogoEra[]>> = {
  '1610612737': [era('2015-16', null, '1610612737', 'Atlanta Hawks', 'high')],
  '1610612738': [
    era('1998-99', null, '1610612738', 'Boston Celtics', 'medium', {
      note: 'Shamrock roundel: a Celtics mark since about 1998-99; earlier seasons fall back.',
    }),
  ],
  '1610612751': [
    era('1997-98', '2011-12', 'nets-newjersey-1990-2012', 'New Jersey Nets', 'high', {
      note: 'Supplied mark is the 1997-98 to 2011-12 primary; 1983-97 New Jersey seasons fall back.',
    }),
    era('2012-13', null, '1610612751', 'Brooklyn Nets', 'high'),
  ],
  '1610612766': [
    era(
      '1988-89',
      '2001-02',
      'hornets-charlotte-1988-2002',
      'Charlotte Hornets',
      'high',
    ),
    era('2004-05', '2006-07', 'bobcats-2004-2014', 'Charlotte Bobcats', 'high', {
      note: 'Supplied mark is the 2004-05 to 2006-07 primary; 2007-14 Bobcats seasons fall back.',
    }),
    era('2014-15', null, '1610612766', 'Charlotte Hornets', 'high'),
  ],
  '1610612741': [era('1966-67', null, '1610612741', 'Chicago Bulls', 'high')],
  '1610612739': [
    era('2022-23', null, '1610612739', 'Cleveland Cavaliers', 'medium', {
      note: 'Current "C" mark; earlier seasons fall back.',
    }),
  ],
  '1610612742': [era('2001-02', null, '1610612742', 'Dallas Mavericks', 'medium')],
  '1610612743': [era('2018-19', null, '1610612743', 'Denver Nuggets', 'high')],
  '1610612765': [
    era('1983-84', '1995-96', '1610612765', 'Detroit Pistons', 'medium', {
      note: 'The 2017 mark revived the 1979-96 basketball roundel.',
    }),
    era('2017-18', null, '1610612765', 'Detroit Pistons', 'high'),
  ],
  '1610612744': [era('2010-11', null, '1610612744', 'Golden State Warriors', 'high')],
  '1610612745': [
    era('1995-96', '2002-03', 'rockets-classic-1995-2003', 'Houston Rockets', 'high'),
    era('2019-20', null, '1610612745', 'Houston Rockets', 'high'),
  ],
  '1610612754': [era('2005-06', null, '1610612754', 'Indiana Pacers', 'medium')],
  '1610612746': [
    era(
      '1978-79',
      '1981-82',
      'clippers-sandiego-1978-1984',
      'San Diego Clippers',
      'high',
      {
        note: 'Supplied mark is the 1978-79 to 1981-82 primary; the 1982-84 San Diego seasons fall back.',
      },
    ),
    era('2024-25', null, '1610612746', 'LA Clippers', 'high'),
  ],
  '1610612747': [
    era('1983-84', null, '1610612747', 'Los Angeles Lakers', 'medium', {
      note: 'Same wordmark-on-ball design throughout; colours and lettering refined over time.',
    }),
  ],
  '1610612763': [
    era(
      '1995-96',
      '2000-01',
      'grizzlies-vancouver-1995-2001',
      'Vancouver Grizzlies',
      'high',
    ),
    era('2004-05', null, '1610612763', 'Memphis Grizzlies', 'medium'),
  ],
  '1610612748': [era('1988-89', null, '1610612748', 'Miami Heat', 'high')],
  '1610612749': [era('2015-16', null, '1610612749', 'Milwaukee Bucks', 'high')],
  '1610612750': [era('2017-18', null, '1610612750', 'Minnesota Timberwolves', 'high')],
  '1610612740': [
    era(
      '2005-06',
      '2006-07',
      'hornets-nookc-2005-2007',
      'New Orleans/Oklahoma City Hornets',
      'high',
      {
        note: 'Official Oklahoma City alternate mark of those two seasons.',
      },
    ),
    era(
      '2008-09',
      '2012-13',
      'hornets-neworleans-2002-2013',
      'New Orleans Hornets',
      'high',
      {
        note: 'Supplied mark is the 2008-09 to 2012-13 primary; 2002-05 and 2007-08 fall back.',
      },
    ),
    era('2013-14', null, '1610612740', 'New Orleans Pelicans', 'high'),
  ],
  '1610612752': [era('1992-93', null, '1610612752', 'New York Knicks', 'medium')],
  '1610612760': [
    era('1975-76', '1994-95', 'supersonics-1975-1995', 'Seattle SuperSonics', 'high'),
    era('1995-96', '2000-01', 'supersonics-1995-2008', 'Seattle SuperSonics', 'high', {
      note: 'Supplied mark is the 1995-96 to 2000-01 primary; 2001-08 Seattle seasons fall back.',
    }),
    era('2008-09', null, '1610612760', 'Oklahoma City Thunder', 'high'),
  ],
  '1610612753': [era('2010-11', null, '1610612753', 'Orlando Magic', 'high')],
  '1610612755': [era('2015-16', null, '1610612755', 'Philadelphia 76ers', 'medium')],
  '1610612756': [
    era('1992-93', '1999-00', 'suns-classic-1992-2000', 'Phoenix Suns', 'high'),
    era('2013-14', null, '1610612756', 'Phoenix Suns', 'high'),
  ],
  '1610612757': [era('2017-18', null, '1610612757', 'Portland Trail Blazers', 'high')],
  '1610612758': [
    era(
      '1975-76',
      '1984-85',
      'kings-kansascity-1975-1985',
      'Kansas City Kings',
      'high',
    ),
    era('2016-17', null, '1610612758', 'Sacramento Kings', 'high'),
  ],
  '1610612759': [
    era('1976-77', '1988-89', 'spurs-classic-1976-2002', 'San Antonio Spurs', 'high', {
      halo: true,
      note: 'Supplied mark is the 1976-77 to 1988-89 primary; 1989-2002 seasons fall back.',
    }),
    era('2002-03', null, '1610612759', 'San Antonio Spurs', 'medium'),
  ],
  '1610612761': [era('2015-16', null, '1610612761', 'Toronto Raptors', 'high')],
  '1610612762': [
    era('1974-75', '1978-79', 'jazz-neworleans-1974-1979', 'New Orleans Jazz', 'high'),
    era('2025-26', null, '1610612762', 'Utah Jazz', 'medium', {
      note: 'Purple note mark supplied as current (the 2025-26 return to purple); earlier seasons fall back.',
    }),
  ],
  '1610612764': [
    era('1987-88', '1996-97', 'bullets-1973-1997', 'Washington Bullets', 'high', {
      halo: true,
      note: 'Supplied mark is the 1987-88 to 1996-97 primary; 1983-87 Bullets seasons fall back.',
    }),
    era('2015-16', null, '1610612764', 'Washington Wizards', 'high'),
  ],
};

const startYear = (season: string) => Number(season.slice(0, 4));

/** The season a date falls in (seasons start in August for this purpose). */
export function seasonOfDate(date: string): string {
  const y = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 8 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// Names differ only in how Los Angeles is written ("LA Clippers" / "Los Angeles Clippers").
const normalise = (name: string) =>
  name
    .toLowerCase()
    .replace(/^los angeles /, 'la ')
    .replace(/\s+/g, ' ')
    .trim();

export interface ResolvedLogo {
  src: string;
  srcLarge: string;
  identity: string;
  halo: boolean;
}

/**
 * The verified mark for a team in a season, or null. `season` omitted means the current season.
 * `name`, when given, must match the era's identity, so data and logo can never disagree.
 */
export function teamLogo(
  teamId: string,
  season?: string | null,
  name?: string | null,
): ResolvedLogo | null {
  const id = teamId.startsWith('nba:') ? teamId.slice(4) : teamId;
  const eras = Object.prototype.hasOwnProperty.call(TEAM_LOGO_ERAS, id)
    ? TEAM_LOGO_ERAS[id]!
    : [];
  const found = season
    ? eras.find(
        (e) =>
          startYear(season) >= startYear(e.from) &&
          (e.to === null || startYear(season) <= startYear(e.to)),
      )
    : eras.find((e) => e.to === null);
  if (!found) return null;
  if (name && normalise(name) !== normalise(found.identity)) return null;
  return {
    src: `/images/teams/${found.key}-64.webp`,
    srcLarge: `/images/teams/${found.key}-256.webp`,
    identity: found.identity,
    halo: Boolean(found.halo),
  };
}
