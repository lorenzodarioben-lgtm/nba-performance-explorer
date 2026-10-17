import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { mapHistoricalAwards } from './history-awards-provider.js';
import { ArchiveSourceError, type WikiPage } from '../wiki-archive/wiki-client.js';
const html =
  '<table><tr><th>Award</th><th>Recipient(s)</th><th>Finalists</th></tr><tr><td>Fixture player award</td><td><a href="/wiki/Fixture_Winner">Fixture Winner</a> <span>(Boston Celtics)</span><sup>99</sup></td><td><a href="/wiki/Fixture_Finalist">Fixture Finalist</a></td></tr><tr><td>Fixture coach award</td><td><a href="/wiki/Fixture_Coach">Fixture Coach</a> (Los Angeles Lakers)</td><td></td></tr><tr><td>Fixture missing award</td><td></td><td>Still not a winner</td></tr></table>';
const page: WikiPage = {
  title: '2023–24 NBA season',
  revision: 1234,
  html,
  retrievedAt: '2026-10-14T08:00:00.000Z',
};
describe('licensed source-listed yearly awards', () => {
  it('keeps actual recipient column, explicit team affiliation and missing recipients without NBA identity guesses', async () => {
    const awards = mapHistoricalAwards(
      page,
      await staticTeamDirectoryProvider.listTeams(),
    );
    expect(awards).toHaveLength(3);
    expect(awards[0]?.recipients[0]).toMatchObject({
      name: 'Fixture Winner',
      team: { id: 'nba:1610612738' },
    });
    expect(awards[1]?.recipients[0]?.name).toBe('Fixture Coach');
    expect(awards[2]).toMatchObject({ recipientUnavailable: true, recipients: [] });
    expect(JSON.stringify(awards)).not.toContain('Fixture Finalist');
  });
  it('reads the 2026 Parsoid output (absolute links) exactly like the legacy output', async () => {
    const teams = await staticTeamDirectoryProvider.listTeams();
    const parsoid = {
      ...page,
      html: page.html.replaceAll(
        'href="/wiki/',
        'rel="mw:WikiLink" href="https://en.wikipedia.org/wiki/',
      ),
    };
    expect(mapHistoricalAwards(parsoid, teams)).toEqual(
      mapHistoricalAwards(page, teams),
    );
  });
  it('rejects duplicate/malformed winner tables, unsafe links and unknown affiliations', async () => {
    const teams = await staticTeamDirectoryProvider.listTeams();
    for (const bad of [
      html + html,
      html.replace('Boston Celtics', 'Unknown franchise'),
      html.replace('/wiki/Fixture_Winner', 'javascript:alert(1)'),
      html.replace('Fixture coach award', 'Fixture player award'),
    ])
      expect(() => mapHistoricalAwards({ ...page, html: bad }, teams)).toThrow(
        ArchiveSourceError,
      );
  });
  it('has strict source/API failure behavior and preserves yearly source scope/licence', async () => {
    const awards = mapHistoricalAwards(
        page,
        await staticTeamDirectoryProvider.listTeams(),
      ),
      app = createApp(undefined, {
        awardsProvider: {
          source: 'fixture',
          getAwards: async () => ({ page, awards }),
        },
      });
    const r = await request(app).get('/api/history/awards');
    expect(r.status).toBe(200);
    expect(r.body.awards[2].recipientUnavailable).toBe(true);
    expect(r.body.attribution.license).toBe('CC BY-SA 4.0');
    for (const query of [
      'season=2024-25',
      'season=2023-24&season=2023-24',
      'category=MVP',
    ])
      expect((await request(app).get('/api/history/awards?' + query)).status).toBe(400);
    expect((await request(createApp()).get('/api/history/awards')).status).toBe(503);
    expect((await request(app).post('/api/history/awards')).status).toBe(405);
    const failed = createApp(undefined, {
      awardsProvider: {
        source: 'wikipedia',
        getAwards: async () => {
          throw new ArchiveSourceError('invalid');
        },
      },
    });
    expect((await request(failed).get('/api/history/awards')).status).toBe(502);
  });
});
