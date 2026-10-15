import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import {
  mapTeamArchive,
  WikipediaTeamArchiveProvider,
} from './team-archive-provider.js';
import { ArchiveSourceError, WikiArchiveClient, type WikiPage } from './wiki-client.js';
import { mapRosterIdentities, WikidataRosterIdentities } from './roster-identities.js';
import { archiveProvenance, attribution } from './archive-provider.js';
async function fixture() {
  const teams = await staticTeamDirectoryProvider.listTeams(),
    team = teams.find((t) => t.abbreviation === 'LAL')!,
    opponent = teams.find((t) => t.abbreviation === 'BOS')!;
  let wins = 0,
    losses = 0;
  const results = Array.from({ length: 82 }, (_, i) => {
    const date = new Date(Date.UTC(2023, 9, 1 + i));
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
    const win = i % 2 === 0;
    if (win) wins++;
    else losses++;
    return `<tr><td>${i + 1}</td><td>${months[date.getUTCMonth()]} ${date.getUTCDate()}</td><td><a href="/wiki/2023%E2%80%9324_Boston_Celtics_season">${win ? '' : '@ '}Boston</a></td><td><a href="https://www.nba.com/game/00223${String(i).padStart(5, '0')}">${win ? 'W 110–100' : 'L 100–110'}</a></td><td></td><td></td><td></td><td>Fixture arena</td><td>${wins}–${losses}</td></tr>`;
  }).join('');
  const stats = (scope: string, gp: number) =>
    `<h3>${scope}</h3><table><tr>${['Player', 'GP', 'GS', 'MPG', 'FG%', '3P%', 'FT%', 'RPG', 'APG', 'SPG', 'BPG', 'PPG'].map((h) => `<th>${h}</th>`).join('')}</tr><tr><td><a href="/wiki/Fixture_player_A">Fixture player A</a></td><td>${gp}</td><td>0</td><td>30</td><td>.500</td><td></td><td>.800</td><td>5</td><td>6</td><td>1</td><td>.5</td><td>20</td></tr></table>`;
  const html = `<h2>Roster</h2><table><caption>2023–24 Los Angeles Lakers roster</caption><tr><th>Pos.</th><th>No.</th><th>Player</th><th>Height</th><th>Weight</th><th>DOB</th><th>From</th></tr><tr><td>F</td><td>23</td><td><a href="/wiki/Fixture_player_A">Fixture player A</a> (TW)</td><td></td><td></td><td>1984-12-30</td><td></td></tr></table><h2>Game log</h2><h3>Regular season</h3><table><tr>${['Game', 'Date', 'Team', 'Score', 'High points', 'High rebounds', 'High assists', 'Location Attendance', 'Record'].map((s) => `<th>${s}</th>`).join('')}</tr>${results}</table><h2>Player statistics</h2>${stats('Regular season', 82)}${stats('Playoffs', 5)}`;
  const page: WikiPage = {
    title: '2023–24 Los Angeles Lakers season',
    html,
    revision: 1234,
    retrievedAt: '2026-10-13T21:00:00.000Z',
  };
  return { team, opponent, teams, page };
}
describe('historical team archive', () => {
  it('requires explicit historical roster scope and reconciles82 results/source cumulative records', async () => {
    const f = await fixture(),
      data = mapTeamArchive(f.page, f.team, f.teams);
    expect(data.roster[0]).toMatchObject({
      name: 'Fixture player A',
      ageOnOctober1: 38,
      nbaPlayerId: null,
    });
    expect(data.statistics['regular-season'][0]?.gamesPlayed).toBe(82);
    expect(data.statistics.playoffs[0]?.gamesPlayed).toBe(5);
    expect(data.statistics['regular-season'][0]?.threePointPercentage).toBeNull();
    const wholePercent = mapTeamArchive(
      { ...f.page, html: f.page.html.replaceAll('>.500<', '>50.0%<') },
      f.team,
      f.teams,
    );
    expect(wholePercent.statistics['regular-season'][0]?.fieldGoalPercentage).toBe(0.5);
    const totals =
      '<h2>Player statistics</h2><table><tr>' +
      ['Player', 'Pos.', 'GP', 'GS', 'MP', 'Reb.', 'Ast.', 'Stl.', 'Blk.', 'Pts.']
        .map((h) => `<th>${h}</th>`)
        .join('') +
      '</tr><tr><td><a href="/wiki/Fixture_player_B">Fixture B</a></td><td>G</td><td>20</td><td>0</td><td>1,000</td><td>100</td><td>80</td><td>20</td><td>10</td><td>400</td></tr></table>';
    const withTotals = mapTeamArchive(
      { ...f.page, html: f.page.html + totals },
      f.team,
      f.teams,
    );
    expect(withTotals.statistics['source-unspecified'][0]).toMatchObject({
      valueBasis: 'derived-from-raw-totals',
      pointsPerGame: 20,
      minutesPerGame: 50,
      rawTotals: { points: 400, minutes: 1000 },
      fieldGoalPercentage: null,
    });
    expect(withTotals.statistics['regular-season']).toEqual(
      data.statistics['regular-season'],
    );
    expect(data.results).toHaveLength(82);
    const unlinked = f.page.html.replace(
      '<a href="/wiki/2023%E2%80%9324_Boston_Celtics_season">Boston</a>',
      'Boston',
    );
    expect(
      mapTeamArchive({ ...f.page, html: unlinked }, f.team, f.teams).results[0]
        ?.opponent.id,
    ).toBe(f.opponent.id);
    expect(() =>
      mapTeamArchive(
        {
          ...f.page,
          html: unlinked.replace('<td>Boston</td>', '<td>Unlinked unknown</td>'),
        },
        f.team,
        f.teams,
      ),
    ).toThrow(ArchiveSourceError);
    expect(data.results.filter((g) => g.result === 'W')).toHaveLength(41);
    expect(data.results[1]).toMatchObject({
      location: 'away',
      result: 'L',
      opponent: f.opponent,
    });
    for (const html of [
      f.page.html.replace(
        '2023–24 Los Angeles Lakers roster',
        '2025–26 Los Angeles Lakers roster',
      ),
      f.page.html.replace('1984-12-30', '1984-02-30'),
      f.page.html.replace('>1–0<', '>0–1<'),
      f.page.html.replace('W 110–100', 'W 90–100'),
      f.page.html.replace('0022300001', '0022300000'),
      f.page.html.replace(
        '2023%E2%80%9324_Boston_Celtics_season',
        '2023%E2%80%9324_Unknown_team_season',
      ),
    ])
      expect(() => mapTeamArchive({ ...f.page, html }, f.team, f.teams)).toThrow(
        ArchiveSourceError,
      );
  });
  it('maps exact article/external IDs, preserving missing mappings and rejecting ambiguity', () => {
    const article = 'https://en.wikipedia.org/wiki/Fixture_player_A';
    const row = {
      article: { type: 'uri', value: article },
      item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1' },
      nbaId: { type: 'literal', value: '2544' },
    };
    expect(
      mapRosterIdentities({ results: { bindings: [row] } }, [article]).get(article),
    ).toEqual({ nbaPlayerId: '2544', identityUrl: 'https://www.wikidata.org/wiki/Q1' });
    expect(mapRosterIdentities({ results: { bindings: [] } }, [article]).size).toBe(0);
    for (const bindings of [
      [row, row],
      [{ ...row, nbaId: { type: 'literal', value: 'bad' } }],
      [{ ...row, article: { type: 'uri', value: 'https://evil.test/' } }],
    ])
      expect(() => mapRosterIdentities({ results: { bindings } }, [article])).toThrow();
  });
  it('uses bounded exact article queries, deduplicates reads and honors rate limits', async () => {
    let now = new Date('2026-10-13T21:00:00.000Z');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
      )
      .mockResolvedValue(new Response(JSON.stringify({ results: { bindings: [] } })));
    const client = new WikidataRosterIdentities(fetcher, () => now),
      article = 'https://en.wikipedia.org/wiki/D%27Angelo_Russell';
    await expect(client.getIdentities([article])).rejects.toMatchObject({
      kind: 'unavailable',
    });
    await expect(client.getIdentities([article])).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = new Date(now.getTime() + 120001);
    const [a, b] = await Promise.all([
      client.getIdentities([article]),
      client.getIdentities([article]),
    ]);
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('query.wikidata.org');
    expect(
      new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get('query'),
    ).toContain(`<${article}>`);
    expect(() => client.getIdentities(['https://evil.test/'])).toThrow();
  });
  it('preserves roster/statistics if identity enrichment is temporarily unavailable', async () => {
    const f = await fixture();
    const client = {
      getPage: vi.fn().mockResolvedValue(f.page),
    } as unknown as WikiArchiveClient;
    const provider = new WikipediaTeamArchiveProvider(client, {
      getIdentities: vi.fn().mockRejectedValue(new ArchiveSourceError('timeout')),
    });
    const data = await provider.getTeam(f.team);
    expect(data.identityStatus).toBe('unavailable');
    expect(data.roster[0]?.nbaPlayerId).toBeNull();
    expect(data.results).toHaveLength(82);
    await provider.getTeam(f.team);
    expect(client.getPage).toHaveBeenCalledTimes(1);
  });
  it('validates IDs/seasons before source calls, sanitizes failures and never enables fixtures by default', async () => {
    const f = await fixture(),
      getTeam = vi.fn(async () => ({
        team: f.team,
        season: '2023-24' as const,
        ...mapTeamArchive(f.page, f.team, f.teams),
        identityStatus: 'unavailable' as const,
        identityRetrievedAt: null,
        attribution: attribution(f.page),
        provenance: archiveProvenance(f.page, 'regular-season', 'fixture'),
      }));
    const app = createApp(undefined, { teamArchiveProvider: { getTeam } });
    for (const path of [
      '/api/teams/evil/archive',
      '/api/teams/nba:1610612747/archive?season=2025-26',
      '/api/teams/nba:1610612747/archive?unknown=1',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    expect(getTeam).not.toHaveBeenCalled();
    expect((await request(app).get('/api/teams/nba:999/archive')).status).toBe(404);
    const r = await request(app).get('/api/teams/nba:1610612747/archive');
    expect(r.status).toBe(200);
    expect(r.body.provenance.source).toBe('fixture');
    expect(r.body.results).toHaveLength(82);
    expect(
      (await request(createApp()).get('/api/teams/nba:1610612747/archive')).status,
    ).toBe(503);
    getTeam.mockRejectedValueOnce(new ArchiveSourceError('invalid'));
    expect((await request(app).get('/api/teams/nba:1610612747/archive')).status).toBe(
      502,
    );
    expect((await request(app).post('/api/teams/nba:1610612747/archive')).status).toBe(
      405,
    );
  });
  it('reads headings in the newer mw-heading wrapper exactly like bare headings', async () => {
    const f = await fixture();
    const wrapped = f.page.html.replace(
      /<(h[234])>(.*?)<\/\1>/g,
      '<div class="mw-heading mw-heading3"><$1 id="x">$2</$1><span class="mw-editsection">edit</span></div>',
    );
    expect(wrapped).not.toEqual(f.page.html);
    expect(mapTeamArchive({ ...f.page, html: wrapped }, f.team, f.teams)).toEqual(
      mapTeamArchive(f.page, f.team, f.teams),
    );
    // A playoff game table under a wrapped "Playoffs" heading must not join the regular season.
    const playoffTable = wrapped.replace(
      '<h2>Player statistics</h2>',
      '<div class="mw-heading"><h3>Playoffs</h3></div><table><tr><th>Game</th><th>Date</th><th>Team</th><th>Score</th><th>High points</th><th>High rebounds</th><th>High assists</th><th>Location Attendance</th><th>Record</th></tr><tr><td>1</td><td>April 20</td><td>@ X</td><td>W 1–0</td><td></td><td></td><td></td><td></td><td>1–0</td></tr></table><h2>Player statistics</h2>',
    );
    expect(
      mapTeamArchive({ ...f.page, html: playoffTable }, f.team, f.teams).results,
    ).toHaveLength(82);
  });

  it('reads another recorded season only with its own title, roster heading and game IDs', async () => {
    const f = await fixture();
    expect(() => mapTeamArchive(f.page, f.team, f.teams, '2022-23')).toThrow();
  });

  it('rejects unapproved page titles without source traffic', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new WikiArchiveClient(fetcher);
    await expect(client.getPage('2023–24 Arbitrary page season')).rejects.toMatchObject(
      { kind: 'invalid' },
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
