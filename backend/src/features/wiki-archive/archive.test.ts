import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { mapLeagueArchive, mapPlayoffArchive } from './archive-provider.js';
import { ArchiveSourceError, WikiArchiveClient, type WikiPage } from './wiki-client.js';
import { expandedRows, isElement, parsePage, text } from './html-tables.js';
const page = (title: string, html: string): WikiPage => ({
  title,
  html,
  revision: 1234,
  retrievedAt: '2026-10-13T21:00:00.000Z',
});
async function leagueFixture() {
  const teams = await staticTeamDirectoryProvider.listTeams();
  const standings = ['Eastern', 'Western']
    .map(
      (c, i) =>
        `<table><tr><th colspan="7">${c} Conference</th></tr><tr>${['#', 'Team', 'W', 'L', 'PCT', 'GB', 'GP'].map((s) => `<th>${s}</th>`).join('')}</tr>${teams
          .slice(i * 15, i * 15 + 15)
          .map(
            (t, j) =>
              `<tr><td>${j + 1}</td><td><a href="/wiki/${t.name.replaceAll(' ', '_')}">${t.name}</a></td><td>40</td><td>42</td><td>.488</td><td>–</td><td>82</td></tr>`,
          )
          .join('')}</table>`,
    )
    .join('');
  const leaders =
    '<table><tr><th>Category</th><th>Player</th><th>Team(s)</th><th>Statistic</th></tr><tr><td rowspan="2">Points per game</td><td>Fixture player A</td><td>Fixture team</td><td>20</td></tr><tr><td>Fixture player B</td><td>Fixture team</td><td>20</td></tr></table><table><tr><th>Category</th><th>Team</th><th>Statistic</th></tr><tr><td>+/−</td><td>Fixture team</td><td>+1.2</td></tr></table>';
  return { teams, page: page('2023–24 NBA season', standings + leaders) };
}
function gameFixture({
  overtime = false,
  homeScore = 100,
  sourceId = '0042300101',
} = {}) {
  const quarters = overtime
    ? '20–25, 20–25, 20–25, 20–25, 15–10'
    : '20–25, 20–25, 20–25, 20–25';
  return `<div><table><tr><td>April 21<br />1:00 pm</td></tr></table><table><tr><td><a href="https://www.nba.com/game/bos-vs-lal-${sourceId}">Recap</a></td></tr></table><table><tr><td><a href="/wiki/Boston_Celtics">Boston Celtics</a> ${overtime ? 95 : 80}, <a href="/wiki/Los_Angeles_Lakers">Los Angeles Lakers</a> ${homeScore}${overtime ? ' (OT)' : ''}</td></tr><tr><td>Scoring by quarter: ${quarters}</td></tr><tr><td>Pts: Fixture player A 20<br/>Rebs: Two players 8 each<br/>Asts: Fixture player A 5</td><td></td><td>Pts: Fixture player B 30<br/>Rebs: Fixture player B 10<br/>Asts: Fixture player C 7</td></tr></table><table><tr><td>Fixture arena<br/>Attendance: 100</td></tr></table></div>`;
}
describe('licensed historical snapshot integrity', () => {
  it('maps30 unique teams and keeps source ranks, rounded percentages and published ties', async () => {
    const fixture = await leagueFixture();
    const result = mapLeagueArchive(fixture.page, fixture.teams);
    expect(result.standings).toHaveLength(30);
    expect(result.standings[0]?.winPercentage).toBe(40 / 82);
    expect(result.leaders.filter((r) => r.category === 'Points per game')).toHaveLength(
      2,
    );
    expect(result.leaders.at(-1)?.value).toBe(1.2);
  });
  it('rejects incomplete/duplicate standings, inconsistent GP or unknown team identities', async () => {
    const fixture = await leagueFixture();
    for (const html of [
      fixture.page.html.replace('<td>82</td>', '<td>81</td>'),
      fixture.page.html.replace('>.488<', '>.990<'),
      fixture.page.html.replaceAll('Atlanta Hawks', 'Unknown team'),
      fixture.page.html.replace('<td>15</td>', '<td>14</td>'),
    ])
      expect(() => mapLeagueArchive({ ...fixture.page, html }, fixture.teams)).toThrow(
        ArchiveSourceError,
      );
  });
  it('maps exact recorded IDs/calendar dates and verifies overtime and final score sums', async () => {
    const teams = await staticTeamDirectoryProvider.listTeams();
    const games = mapPlayoffArchive(
      page('2024 NBA playoffs', gameFixture({ overtime: true, homeScore: 110 })),
      teams,
    );
    expect(games[0]).toMatchObject({
      id: 'nba:0042300101',
      date: '2024-04-21',
      awayScore: 95,
      homeScore: 110,
      tipoffUtc: null,
      reportedTime: '1:00 pm',
    });
    expect(games[0]?.quarters).toHaveLength(5);
    expect(games[0]?.leaders[0]?.rebounds).toBe('Two players 8 each');
    for (const html of [
      gameFixture({ homeScore: 101 }),
      gameFixture() + gameFixture(),
      gameFixture().replace('April 21', 'April 31'),
      gameFixture().replaceAll('Boston Celtics', 'Unknown team'),
    ])
      expect(() => mapPlayoffArchive(page('2024 NBA playoffs', html), teams)).toThrow();
  });
  it('handles rowspans without taking nested layout rows as duplicate data and ignores scripts/media', () => {
    const table = parsePage(
      '<table><tr><td rowspan="2">A<script>evil</script><img alt="not data"/></td><td>1</td></tr><tr><td>2</td></tr></table>',
    ).find((n) => isElement(n) && n.tagName === 'table');
    if (!table || !isElement(table)) throw new Error('Fixture table missing');
    expect(expandedRows(table).map((r) => r.map(text))).toEqual([
      ['A', '1'],
      ['A', '2'],
    ]);
  });
  it('deduplicates fixed page reads and respects cooldown without changing agents or endpoints', async () => {
    let now = new Date('2026-10-13T21:00:00.000Z');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
      )
      .mockImplementation(async () =>
        Response.json({
          parse: { title: '2023–24 NBA season', revid: 1234, text: '<table></table>' },
        }),
      );
    const client = new WikiArchiveClient(fetcher, () => now);
    await expect(client.getPage('2023–24 NBA season')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    await expect(client.getPage('2024 NBA playoffs')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = new Date(now.getTime() + 120000);
    await Promise.all([
      client.getPage('2023–24 NBA season'),
      client.getPage('2023–24 NBA season'),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((fetcher.mock.calls[1]![0] as URL).hostname).toBe('en.wikipedia.org');
    expect(fetcher.mock.calls[1]![1].headers['User-Agent']).toContain(
      'github.com/lorenzodarioben-lgtm',
    );
  });
  it('rejects mismatched titles, large payloads and HTML errors without silent source substitution', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ parse: { title: 'wrong', revid: 1, text: '' } }),
      )
      .mockResolvedValueOnce(new Response('x'.repeat(2000001)))
      .mockResolvedValueOnce(new Response('<html>blocked</html>'));
    const client = new WikiArchiveClient(fetcher);
    for (let i = 0; i < 3; i++)
      await expect(client.getPage('2023–24 NBA season')).rejects.toMatchObject({
        kind: 'invalid',
      });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('validates API filters before loading source and returns attribution on source-backed detail', async () => {
    const fixture = await leagueFixture(),
      gamesPage = page('2024 NBA playoffs', gameFixture());
    const getLeague = vi.fn().mockResolvedValue({
      ...mapLeagueArchive(fixture.page, fixture.teams),
      page: fixture.page,
    });
    const getGames = vi.fn().mockResolvedValue({
      games: mapPlayoffArchive(gamesPage, fixture.teams),
      page: gamesPage,
    });
    const app = createApp(undefined, {
      archiveProvider: { source: 'fixture', getLeague, getGames },
    });
    for (const path of [
      '/api/standings?season=2025-26',
      '/api/standings?extra=x',
      '/api/games?date=2024-02-30',
      '/api/games/nba:0042300101?team=nba:1610612738',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    expect(getLeague).not.toHaveBeenCalled();
    expect(getGames).not.toHaveBeenCalled();
    const standings = await request(app).get('/api/standings');
    expect(standings.status).toBe(200);
    expect(standings.body.attribution.license).toBe('CC BY-SA 4.0');
    expect(standings.body.provenance.source).toBe('fixture');
    const detail = await request(app).get('/api/games/nba:0042300101');
    expect(detail.body.games).toHaveLength(1);
    expect(detail.body.games[0].tipoffUtc).toBeNull();
    expect((await request(app).get('/api/games?date=2024-04-22')).body.games).toEqual(
      [],
    );
    expect((await request(app).get('/api/games/nba:0042300102')).status).toBe(404);
    expect((await request(createApp()).get('/api/standings')).status).toBe(503);
    getGames.mockRejectedValueOnce(new ArchiveSourceError('timeout'));
    expect((await request(app).get('/api/games')).status).toBe(504);
    expect((await request(app).post('/api/games')).status).toBe(405);
  });
});
