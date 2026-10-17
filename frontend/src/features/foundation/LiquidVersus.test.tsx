import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionPreferenceProvider } from '../../motion/MotionPreference';
import { LiquidVersus } from './LiquidVersus';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem('npe.motion-preference.v1');
});

describe('liquid fallback', () => {
  it('keeps the decorative VS label and static surface on a coarse pointer', () => {
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const { container } = render(<LiquidVersus />);
    expect(screen.getByText('VS').closest('[aria-hidden]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(context).not.toHaveBeenCalled();
    expect(container.querySelector('[data-liquid="ready"]')).toBeNull();
  });
  it('does not initialize a canvas with the in-app reduced-motion setting', () => {
    localStorage.setItem('npe.motion-preference.v1', 'reduced');
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    render(
      <MotionPreferenceProvider>
        <LiquidVersus />
      </MotionPreferenceProvider>,
    );
    expect(context).not.toHaveBeenCalled();
    expect(screen.getByText('VS')).toBeInTheDocument();
  });
  it('retains the circle when canvas is unavailable or throws', () => {
    const media = window.matchMedia('(pointer: fine)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    const context = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    const { container, unmount } = render(<LiquidVersus />);
    expect(context).toHaveBeenCalled();
    expect(container.querySelector('[data-liquid="ready"]')).toBeNull();
    unmount();
    context.mockImplementation(() => {
      throw new Error('No canvas');
    });
    expect(() => render(<LiquidVersus />)).not.toThrow();
  });
});
