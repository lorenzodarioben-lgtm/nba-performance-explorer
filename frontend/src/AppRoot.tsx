import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';

import { App } from './App';
import { AppErrorBoundary } from './AppErrorBoundary';

interface AppRootProps {
  queryClient: QueryClient;
  children?: ReactNode;
  onErrorReload?: (() => void) | undefined;
}

export function AppRoot({ queryClient, children, onErrorReload }: AppRootProps) {
  return (
    <AppErrorBoundary onReload={onErrorReload}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children ?? <App />}
        </QueryClientProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
