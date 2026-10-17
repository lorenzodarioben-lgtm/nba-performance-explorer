import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlayerAvatar } from './PlayerAvatar';
import { TeamLogo } from './TeamLogo';

const sonics = {
  id: 'nba:1610612760',
  name: 'Seattle SuperSonics',
  abbreviation: 'SEA',
};

describe('TeamLogo', () => {
  it('shows the season’s mark, decorative beside a printed name', () => {
    const { container } = render(<TeamLogo team={sonics} season="1990-91" size={24} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/images/teams/supersonics-1975-1995-64.webp');
    expect(img.getAttribute('alt')).toBe('');
    expect(img).toHaveAttribute('width', '24');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.getAttribute('data-team-logo')).toBe('Seattle SuperSonics');
  });

  it('uses the large file for big marks and names the mark when it stands alone', () => {
    const { container } = render(
      <TeamLogo
        team={{ id: 'nba:1610612738', name: 'Boston Celtics' }}
        size={96}
        label
        priority
      />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/images/teams/1610612738-256.webp');
    expect(img.getAttribute('alt')).toBe('Boston Celtics logo');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('keeps the footprint, shows the abbreviation, or nothing when no verified mark exists', () => {
    const blank = render(<TeamLogo team={sonics} season="2005-06" size={20} />);
    expect(blank.container.querySelector('img')).toBeNull();
    expect(blank.container.querySelector('[data-team-logo="fallback"]')).toHaveStyle({
      width: '20px',
    });
    const abbr = render(<TeamLogo team={sonics} season="2005-06" fallback="abbr" />);
    expect(abbr.container.textContent).toBe('SEA');
    const none = render(<TeamLogo team={sonics} season="2005-06" fallback="none" />);
    expect(none.container.innerHTML).toBe('');
  });

  it('never shows a modern mark for an older identity of the same franchise', () => {
    const { container } = render(
      <TeamLogo team={{ ...sonics, name: 'Oklahoma City Thunder' }} season="1990-91" />,
    );
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PlayerAvatar', () => {
  it('shows the verified face thumbnail for a mapped player', () => {
    const { container } = render(<PlayerAvatar playerId="893" name="Michael Jordan" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/images/players/thumbs/893.webp');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('shows initials, never another face, for a player without a photo', () => {
    const { container } = render(
      <PlayerAvatar playerId="121" name="Patrick Ewing" size={28} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('PE');
    expect(container.querySelector('[data-player-photo="none"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
