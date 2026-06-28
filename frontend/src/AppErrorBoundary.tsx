import { Component, useEffect, useRef, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: (() => void) | undefined;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

function reloadApplication() {
  window.location.reload();
}

function AppErrorFallback({ onReload }: { onReload: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl items-center px-6 py-16">
      <section aria-labelledby="application-error-heading" className="w-full">
        <p className="text-sm font-semibold uppercase text-accent">Application error</p>
        <h1
          id="application-error-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-3xl font-bold text-ink outline-none"
        >
          We could not display this page
        </h1>
        <p
          role="alert"
          className="mt-4 rounded-sm border border-edge bg-accent-quiet px-4 py-3 text-ink-2"
        >
          The page could not be displayed. Reload the application to try again.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="mt-6 inline-flex min-h-11 items-center rounded-sm border border-accent bg-accent px-4 py-2 font-semibold text-surface transition-colors hover:border-accent-strong hover:bg-accent-strong"
        >
          Reload application
        </button>
      </section>
    </main>
  );
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback onReload={this.props.onReload ?? reloadApplication} />;
    }

    return this.props.children;
  }
}
