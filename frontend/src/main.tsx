import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from './AppRoot';
import './styles.css';

// Enable the JS-gated motion system (scroll reveals, hero load animation). Set before first render
// so the pre-reveal hidden states apply on the first paint. A no-JS or reduced-motion visitor never
// receives these classes, so the final layout is always shown statically.
document.documentElement.classList.add('js');

const queryClient = new QueryClient();
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRoot queryClient={queryClient} />
  </StrictMode>,
);
