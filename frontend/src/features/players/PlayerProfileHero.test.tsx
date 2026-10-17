import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerProfileHero } from './PlayerProfileHero';

describe('player hero image identity', () => {
  it('uses a compact court composition for an unregistered player', () => {
    const { container } = render(
      <PlayerProfileHero
        profile={{
          id: '1629611',
          fullName: 'Terance Mann',
          jerseyNumber: '14',
        }}
        headingRef={createRef()}
      />,
    );
    expect(container.querySelector('.phero--plain')).not.toBeNull();
    expect(container.querySelector('.phero__court')).not.toBeNull();
    expect(container.querySelector('.phero__photo')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Terance Mann' })).toBeInTheDocument();
  });
  it('preserves registered photography and falls back if it cannot load', () => {
    const { container } = render(
      <PlayerProfileHero
        profile={{ id: '2544', fullName: 'LeBron James' }}
        headingRef={createRef()}
      />,
    );
    expect(container.querySelector('.phero--photo')).not.toBeNull();
    const photo = container.querySelector('.phero__photo img')!;
    expect(photo.getAttribute('src')).toMatch(/lebron/);
    fireEvent.error(photo);
    expect(container.querySelector('.phero--plain')).not.toBeNull();
    expect(container.querySelector('.phero__photo')).toBeNull();
  });
});
