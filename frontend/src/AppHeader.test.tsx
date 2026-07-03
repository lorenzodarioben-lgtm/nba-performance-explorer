import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from './test/renderApp';
import { server } from './test/server';

const healthUrl = 'http://localhost/api/health';

// The landing (rendered by renderApp at '/') mounts the service-status health query. Keep it pending
// so the header tests are not affected by an unhandled request.
function mockHealthPending() {
  server.use(
    http.get(healthUrl, async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  );
}

// Open the mobile menu. Focus the toggle first (as a real click would) so focus restoration on close
// has a real element to return to.
function openMenu() {
  const toggle = screen.getByRole('button', { name: 'Menu' });
  toggle.focus();
  fireEvent.click(toggle);
  return toggle;
}

function menuEdges(dialog: HTMLElement): { first: HTMLElement; last: HTMLElement } {
  const focusables = [
    ...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  ];
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) {
    throw new Error('expected focusable elements in the menu');
  }
  return { first, last };
}

describe('app header mobile menu', () => {
  it('opens the modal dialog and moves focus into it', async () => {
    mockHealthPending();
    renderApp();

    openMenu();

    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  it('cycles Tab from the last focusable back to the first', () => {
    mockHealthPending();
    renderApp();

    openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    const { first, last } = menuEdges(dialog);

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
  });

  it('cycles Shift+Tab from the first focusable to the last', () => {
    mockHealthPending();
    renderApp();

    openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    const { first, last } = menuEdges(dialog);

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('closes on Escape and restores focus to the toggle', async () => {
    mockHealthPending();
    renderApp();

    const toggle = openMenu();
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument(),
    );
    expect(toggle).toHaveFocus();
  });
});

describe('app header branding', () => {
  it('renders the NBA logo mark in the masthead and keeps the application name', () => {
    mockHealthPending();
    renderApp();

    const banner = screen.getByRole('banner');
    const logo = banner.querySelector('img[src="/images/nba-logo.png"]');
    expect(logo).not.toBeNull();
    // The mark is decorative (empty alt), so the identity link carries the full accessible name.
    expect(logo).toHaveAttribute('alt', '');
    expect(within(banner).getAllByText('Performance Explorer').length).toBeGreaterThan(
      0,
    );
    expect(
      within(banner).getByRole('link', { name: 'NBA Performance Explorer' }),
    ).toBeInTheDocument();
    expect(
      within(banner).getByText(/Unofficial player analytics/i),
    ).toBeInTheDocument();
  });

  it('keeps the non-affiliation notice and the NBA.com data attribution present', () => {
    mockHealthPending();
    renderApp();

    expect(
      screen.getByText(/Unofficial project, not affiliated with the NBA/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Statistics sourced from\s+NBA\.com/)).toBeInTheDocument();
  });
});
