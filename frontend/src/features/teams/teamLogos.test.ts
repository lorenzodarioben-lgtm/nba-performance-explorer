import { describe, expect, it } from 'vitest';

import { seasonOfDate, TEAM_LOGO_ERAS, teamLogo } from './teamLogos';

const key = (id: string, season?: string, name?: string) =>
  teamLogo(`nba:${id}`, season, name)?.src.replace(
    /^\/images\/teams\/|-64\.webp$/g,
    '',
  ) ?? null;

const SEA_OKC = '1610612760';
const NETS = '1610612751';
const WAS = '1610612764';
const CHA = '1610612766';
const NOP = '1610612740';
const KINGS = '1610612758';
const CLIPPERS = '1610612746';
const MEM = '1610612763';
const SAS = '1610612759';

describe('season-aware team marks', () => {
  it('gives every current franchise its current mark', () => {
    const ids = Object.keys(TEAM_LOGO_ERAS);
    expect(ids).toHaveLength(30);
    for (const id of ids) expect(key(id)).toBe(id);
  });

  it('shows Seattle as the SuperSonics of the time, and never with the Thunder mark', () => {
    expect(key(SEA_OKC, '1985-86', 'Seattle SuperSonics')).toBe(
      'supersonics-1975-1995',
    );
    expect(key(SEA_OKC, '1995-96', 'Seattle SuperSonics')).toBe(
      'supersonics-1995-2008',
    );
    // 2001-08 used a mark that was not supplied: no logo, not a neighbouring one.
    expect(key(SEA_OKC, '2005-06', 'Seattle SuperSonics')).toBeNull();
    expect(key(SEA_OKC, '2008-09', 'Oklahoma City Thunder')).toBe(SEA_OKC);
    // The name check: a Thunder mark can never be returned for a SuperSonics season.
    expect(key(SEA_OKC, '1995-96', 'Oklahoma City Thunder')).toBeNull();
  });

  it('keeps New Jersey and Brooklyn apart, and Washington’s Bullets and Wizards', () => {
    expect(key(NETS, '1985-86', 'New Jersey Nets')).toBeNull();
    expect(key(NETS, '2001-02', 'New Jersey Nets')).toBe('nets-newjersey-1990-2012');
    expect(key(NETS, '2012-13', 'Brooklyn Nets')).toBe(NETS);
    expect(key(WAS, '1984-85', 'Washington Bullets')).toBeNull();
    expect(key(WAS, '1990-91', 'Washington Bullets')).toBe('bullets-1973-1997');
    expect(key(WAS, '2000-01', 'Washington Wizards')).toBeNull();
    expect(key(WAS, '2019-20', 'Washington Wizards')).toBe(WAS);
  });

  it('follows Charlotte and New Orleans through the Hornets, Bobcats and Pelicans', () => {
    expect(key(CHA, '1992-93', 'Charlotte Hornets')).toBe(
      'hornets-charlotte-1988-2002',
    );
    expect(key(CHA, '2005-06', 'Charlotte Bobcats')).toBe('bobcats-2004-2014');
    expect(key(CHA, '2010-11', 'Charlotte Bobcats')).toBeNull();
    expect(key(CHA, '2016-17', 'Charlotte Hornets')).toBe(CHA);
    expect(key(NOP, '2003-04', 'New Orleans Hornets')).toBeNull();
    expect(key(NOP, '2006-07', 'New Orleans/Oklahoma City Hornets')).toBe(
      'hornets-nookc-2005-2007',
    );
    expect(key(NOP, '2010-11', 'New Orleans Hornets')).toBe(
      'hornets-neworleans-2002-2013',
    );
    expect(key(NOP, '2015-16', 'New Orleans Pelicans')).toBe(NOP);
  });

  it('handles Kansas City, San Diego, Vancouver and classic marks of the same name', () => {
    expect(key(KINGS, '1984-85', 'Kansas City Kings')).toBe(
      'kings-kansascity-1975-1985',
    );
    expect(key(KINGS, '1990-91', 'Sacramento Kings')).toBeNull();
    // The supplied San Diego mark (1978-82) predates the archive's single 1983-84 season.
    expect(key(CLIPPERS, '1983-84', 'San Diego Clippers')).toBeNull();
    expect(key(CLIPPERS, '2020-21', 'LA Clippers')).toBeNull();
    expect(key(CLIPPERS, '2025-26', 'LA Clippers')).toBe(CLIPPERS);
    // The team directory writes "Los Angeles Clippers"; it is the same identity.
    expect(key(CLIPPERS, undefined, 'Los Angeles Clippers')).toBe(CLIPPERS);
    expect(key(MEM, '1999-00', 'Vancouver Grizzlies')).toBe(
      'grizzlies-vancouver-1995-2001',
    );
    expect(key(MEM, '2002-03', 'Memphis Grizzlies')).toBeNull();
    expect(key(SAS, '1986-87', 'San Antonio Spurs')).toBe('spurs-classic-1976-2002');
    expect(key(SAS, '1995-96', 'San Antonio Spurs')).toBeNull();
    expect(teamLogo(`nba:${SAS}`, '1986-87')?.halo).toBe(true);
  });

  it('reaches back into franchise histories with the marks of the time', () => {
    expect(key(CLIPPERS, '1980-81', 'San Diego Clippers')).toBe(
      'clippers-sandiego-1978-1984',
    );
    expect(key('1610612762', '1977-78', 'New Orleans Jazz')).toBe(
      'jazz-neworleans-1974-1979',
    );
    expect(key('1610612762', '1985-86', 'Utah Jazz')).toBeNull();
    expect(key(SEA_OKC, '1978-79', 'Seattle SuperSonics')).toBe(
      'supersonics-1975-1995',
    );
    expect(key('1610612741', '1970-71', 'Chicago Bulls')).toBe('1610612741');
  });

  it('refuses unknown ids and keeps eras ordered without overlap', () => {
    expect(teamLogo('nba:1610612999')).toBeNull();
    expect(teamLogo('constructor')).toBeNull();
    for (const eras of Object.values(TEAM_LOGO_ERAS)) {
      const starts = eras.map((e) => Number(e.from.slice(0, 4)));
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      eras.forEach((e, i) => {
        const next = eras[i + 1];
        if (next)
          expect(e.to && Number(e.to.slice(0, 4)) < Number(next.from.slice(0, 4))).toBe(
            true,
          );
      });
      expect(eras.filter((e) => e.to === null).length).toBeLessThanOrEqual(1);
    }
  });

  it('places a date in its season', () => {
    expect(seasonOfDate('2016-06-19')).toBe('2015-16');
    expect(seasonOfDate('2015-10-27')).toBe('2015-16');
    expect(seasonOfDate('2000-01-05')).toBe('1999-00');
  });
});
