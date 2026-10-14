import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { type HistoricalAwardsResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
const body: HistoricalAwardsResponse = {
  season: '2023-24',
  awards: [
    {
      category: 'Fixture winner award',
      recipients: [
        {
          name: 'Fixture Winner',
          articleUrl: 'https://en.wikipedia.org/wiki/Fixture_Winner',
          team: homeTeam,
        },
      ],
      recipientUnavailable: false,
    },
    { category: 'Fixture missing award', recipients: [], recipientUnavailable: true },
  ],
  attribution: leagueFixture.attribution,
  provenance: leagueFixture.provenance,
};
describe('historical yearly awards UI', () => {
  it('preserves missing source recipients and searches/saves exact query state without NBA identity guesses', async () => {
    server.use(
      http.get('http://localhost/api/history/awards', () => HttpResponse.json(body)),
    );
    renderApp('/history/awards');
    await screen.findByRole('group', { name: 'Historical award recipients' });
    expect(screen.getByText('Unavailable in source')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fixture Winner' })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Fixture_Winner',
    );
    fireEvent.change(screen.getByLabelText('Search recorded award/recipient/team'), {
      target: { value: 'winner' },
    });
    expect(screen.queryByText('Fixture missing award')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable award URL') as HTMLInputElement).value,
    ).toContain('search=winner');
  });
  it('rejects unsupported/repeated source states before requests and shows source failure', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/history/awards', read));
    const v = renderApp('/history/awards?season=2024-25');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    v.unmount();
    renderApp('/history/awards');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
