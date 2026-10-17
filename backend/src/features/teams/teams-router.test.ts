import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  TeamDetailResponseSchema,
  TeamDirectoryResponseSchema,
} from '@nba-performance-explorer/contracts';

import { createApp } from '../../app.js';

describe('sourced current-team directory', () => {
  it('accounts for all 30 unique NBA identities with source attribution', async () => {
    const response = await request(createApp()).get('/api/teams');
    const data = TeamDirectoryResponseSchema.parse(response.body);
    expect(data.teams).toHaveLength(30);
    expect(new Set(data.teams.map((t) => t.id)).size).toBe(30);
    expect(new Set(data.teams.map((t) => t.abbreviation)).size).toBe(30);
    expect(data.provenance.source).toBe('nba-api-static');
    expect(data.provenance.scope).toBe('directory');
    expect(data.teams.find((t) => t.abbreviation === 'OKC')?.id).toBe('nba:1610612760');
  });
  it('filters names/abbreviations case-insensitively and keeps empty matches honest', async () => {
    const found = await request(createApp()).get('/api/teams?search=gsw');
    expect(found.body.teams.map((t: { name: string }) => t.name)).toEqual([
      'Golden State Warriors',
    ]);
    expect(
      (await request(createApp()).get('/api/teams?search=SuperSonics')).body.teams,
    ).toEqual([]);
  });
  it('returns a canonical detail with explicitly unavailable season capabilities', async () => {
    const response = await request(createApp()).get('/api/teams/nba:1610612744');
    const data = TeamDetailResponseSchema.parse(response.body);
    expect(data.team.sourceId).toBe('1610612744');
    expect(data.availability).toMatchObject({
      roster: false,
      schedule: false,
      statistics: false,
    });
  });
  it.each([
    '/api/teams/espn:9',
    '/api/teams/1610612744',
    '/api/teams?search=GSW&search=LAL',
    '/api/teams?season=2023-24',
  ])('rejects ID namespace or unsupported query %s', async (path) => {
    expect((await request(createApp()).get(path)).status).toBe(400);
  });
  it('uses typed 404 and method errors', async () => {
    expect((await request(createApp()).get('/api/teams/nba:99999')).status).toBe(404);
    expect((await request(createApp()).post('/api/teams')).status).toBe(405);
  });
});
