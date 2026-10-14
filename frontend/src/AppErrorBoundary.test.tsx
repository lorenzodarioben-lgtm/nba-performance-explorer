import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';
import { AppRoot } from './AppRoot';
import { server } from './test/server';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function ThrowingChild(): never {
  throw new Error('Internal provider request details should never be rendered.');
}

function silenceExpectedReactError() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('AppErrorBoundary', () => {
  it('renders normal children normally', () => {
    render(
      <AppErrorBoundary>
        <p>Application content</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Application content')).toBeInTheDocument();
  });

  it('shows a recovery screen when a descendant throws', async () => {
    silenceExpectedReactError();

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    const heading = screen.getByRole('heading', {
      name: 'We could not display this page',
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The page could not be displayed.',
    );
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it('does not render internal thrown error text', () => {
    silenceExpectedReactError();

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    expect(
      screen.queryByText(/Internal provider request details/i),
    ).not.toBeInTheDocument();
  });

  it('provides a keyboard-focusable native reload action', () => {
    silenceExpectedReactError();

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    const reloadButton = screen.getByRole('button', {
      name: 'Reload application',
    });
    expect(reloadButton).toHaveAttribute('type', 'button');

    reloadButton.focus();

    expect(reloadButton).toHaveFocus();
  });

  it('runs the reload action without navigating during tests', () => {
    silenceExpectedReactError();
    const reload = vi.fn();

    render(
      <AppErrorBoundary onReload={reload}>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload application' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('AppRoot', () => {
  it('renders the application through the root providers', () => {
    server.use(
      http.get('http://localhost/api/health', () =>
        HttpResponse.json({
          status: 'ok',
          timestamp: '2026-06-26T00:00:00.000Z',
          service: 'nba-performance-explorer-api',
        }),
      ),
    );
    window.history.pushState({}, '', '/');

    render(<AppRoot queryClient={createTestQueryClient()} />);

    // The home h1 carries the product name alongside the "Read the game." headline.
    expect(
      screen.getByRole('heading', { level: 1, name: /NBA Performance Explorer/ }),
    ).toBeInTheDocument();
  });

  it('wraps root descendants in the error boundary', () => {
    silenceExpectedReactError();
    const reload = vi.fn();

    render(
      <AppRoot queryClient={createTestQueryClient()} onErrorReload={reload}>
        <ThrowingChild />
      </AppRoot>,
    );

    expect(
      screen.getByRole('heading', { name: 'We could not display this page' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reload application' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
