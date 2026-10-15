import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { mapDraftArchive, WikipediaDraftProvider } from './history-draft-provider.js';
import {
  ArchiveSourceError,
  WikiArchiveClient,
  type WikiPage,
} from '../wiki-archive/wiki-client.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
const header =
  '<tr><th>Rnd.</th><th>Pick</th><th>Player</th><th>Pos.</th><th>Nationality</th><th>Team</th><th>School / club team</th></tr>';
const picks = Array.from(
  { length: 58 },
  (_, i) =>
    `<tr><td>${i < 30 ? 1 : 2}</td><td>${i + 1}</td><td><a href="/wiki/Fixture_Player_${i + 1}">Fixture Player ${i + 1}</a>${i === 0 ? '*' : ''}</td><td>PG</td><td>Fixture country</td><td><a href="/wiki/Boston_Celtics">Boston Celtics</a> (from <a href="/wiki/Los_Angeles_Lakers">Los Angeles Lakers</a>, traded to another team)</td><td>Fixture College (Fr.)</td></tr>`,
).join('');
const forfeits = ['Chicago Bulls', 'Philadelphia 76ers']
  .map(
    (name) =>
      `<tr><td>2</td><td colspan="6"><a href="/wiki/${name.replaceAll(' ', '_')}">${name}</a> (forfeited due to source violation)</td></tr>`,
  )
  .join('');
const page: WikiPage = {
  title: '2023 NBA draft',
  revision: 1234,
  html: `<table>${header}${picks}${forfeits}</table>`,
  retrievedAt: '2026-10-14T10:00:00.000Z',
};
describe('licensed draft class identity and source scope', () => {
  it('keeps58 numbered selections, source markers/trade text andtwo unnumbered forfeitures', async () => {
    const d = mapDraftArchive(
      {
        ...page,
        html: page.html.replace(
          '/wiki/Fixture_Player_2',
          '/wiki/Fixture_Player_(basketball,_born_2002)',
        ),
      },
      await staticTeamDirectoryProvider.listTeams(),
    );
    expect(d.selections).toHaveLength(58);
    expect(d.forfeitures).toHaveLength(2);
    expect(d.selections[0]).toMatchObject({
      pick: 1,
      name: 'Fixture Player 1',
      playerLabel: 'Fixture Player 1*',
      listedTeam: { id: 'nba:1610612738' },
      nbaPlayerId: null,
    });
    expect(d.selections[0]?.teamLabel).toContain('traded to another team');
    expect(d.selections.at(-1)?.pick).toBe(58);
    expect(d.selections[1]?.articleUrl).toBe(
      'https://en.wikipedia.org/wiki/Fixture_Player_(basketball,_born_2002)',
    );
    expect(d.selections.filter((p) => p.round === 1)).toHaveLength(30);
  });
  it('reads the 2026 Parsoid output: absolute links and an empty row change nothing', async () => {
    const teams = await staticTeamDirectoryProvider.listTeams();
    const legacy = mapDraftArchive(page, teams);
    const parsoid = mapDraftArchive(
      {
        ...page,
        html: page.html
          .replaceAll(
            'href="/wiki/',
            'rel="mw:WikiLink" href="https://en.wikipedia.org/wiki/',
          )
          .replace(header, `${header}<tr></tr>`),
      },
      teams,
    );
    expect(parsoid).toEqual(legacy);
    // A row with cells of the wrong shape is still rejected.
    expect(() =>
      mapDraftArchive(
        { ...page, html: page.html.replace(header, `${header}<tr><td>1</td></tr>`) },
        teams,
      ),
    ).toThrow(ArchiveSourceError);
  });
  it('rejects duplicate/invalid picks, unknown listed teams, duplicate people and wrong table shapes', async () => {
    const teams = await staticTeamDirectoryProvider.listTeams();
    for (const html of [
      page.html.replace('<td>2</td><td>31</td>', '<td>1</td><td>31</td>'),
      page.html.replace('<td>58</td>', '<td>57</td>'),
      page.html.replaceAll('Boston Celtics', 'Unknown franchise'),
      page.html.replace('/wiki/Fixture_Player_2', '/wiki/Fixture_Player_1'),
      page.html + page.html,
    ])
      expect(() => mapDraftArchive({ ...page, html }, teams)).toThrow(
        ArchiveSourceError,
      );
  });
  it('uses exact optional mappings/cache and preserves sourced class on enrichment outage', async () => {
    const fetcher = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              parse: { title: page.title, revid: page.revision, text: page.html },
            }),
          ),
      ),
      client = new WikiArchiveClient(fetcher),
      getIdentities = vi.fn(async () => ({
        identities: new Map([
          [
            'https://en.wikipedia.org/wiki/Fixture_Player_1',
            {
              nbaPlayerId: '1631704',
              identityUrl: 'https://www.wikidata.org/wiki/Q123',
            },
          ],
        ]),
        retrievedAt: page.retrievedAt,
      }));
    const p = new WikipediaDraftProvider(client, { getIdentities }),
      d = await p.getDraft();
    expect(d.selections[0]?.nbaPlayerId).toBe('1631704');
    expect(d.selections[1]?.nbaPlayerId).toBeNull();
    expect(getIdentities.mock.calls[0]?.[0]).toHaveLength(58);
    await p.getDraft();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getIdentities).toHaveBeenCalledTimes(1);
    const failed = new WikipediaDraftProvider(client, {
      getIdentities: async () => {
        throw new ArchiveSourceError('unavailable');
      },
    });
    expect(await failed.getDraft()).toMatchObject({
      identityStatus: 'unavailable',
      identityRetrievedAt: null,
    });
    expect((await failed.getDraft()).selections).toHaveLength(58);
  });
  it('qualifies strict API filters/paging and reports unavailable source without fabricated selections', async () => {
    const d = mapDraftArchive(page, await staticTeamDirectoryProvider.listTeams()),
      app = createApp(undefined, {
        draftProvider: {
          source: 'fixture',
          getDraft: async () => ({
            ...d,
            page,
            identityStatus: 'available',
            identityRetrievedAt: null,
          }),
        },
      });
    const r = await request(app).get(
      '/api/history/draft?round=2&fromPick=50&toPick=58&pageSize=5',
    );
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(9);
    expect(r.body.selections.map((p: { pick: number }) => p.pick)).toEqual([
      50, 51, 52, 53, 54,
    ]);
    expect(r.body.forfeitures).toHaveLength(2);
    expect(r.body.missingNBAIds).toBe(58);
    for (const q of [
      'year=2024',
      'fromPick=40&toPick=3',
      'round=3',
      'year=2023&year=2023',
      'pageSize=31',
    ])
      expect((await request(app).get('/api/history/draft?' + q)).status).toBe(400);
    expect((await request(app).get('/api/history/draft?team=nba:1')).status).toBe(404);
    expect((await request(createApp()).get('/api/history/draft')).status).toBe(503);
    expect((await request(app).post('/api/history/draft')).status).toBe(405);
  });
});
