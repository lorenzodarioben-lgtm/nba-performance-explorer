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
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section aria-labelledby="application-error-heading" className="w-full">
        <p className="text-sm font-semibold uppercase text-red-700">
          Application error
        </p>
        <h1
          id="application-error-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-3xl font-bold text-zinc-950 outline-none"
        >
          We could not display this page
        </h1>
        <p role="alert" className="mt-4 border-l-4 border-red-600 pl-4 text-zinc-700">
          The page could not be displayed. Reload the application to try again.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="mt-6 inline-flex min-h-11 items-center border border-zinc-950 bg-zinc-950 px-4 py-2 font-semibold text-white focus:outline-2 focus:outline-offset-2 focus:outline-zinc-500"
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
