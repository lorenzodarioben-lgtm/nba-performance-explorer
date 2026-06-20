import { useHealthQuery } from './useHealthQuery';

export function FoundationPage() {
  const healthQuery = useHealthQuery();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section
        aria-labelledby="project-title"
        className="w-full border-l-4 border-red-600 pl-6"
      >
        <p className="text-sm font-semibold uppercase text-zinc-600">
          Project foundation
        </p>
        <h1 id="project-title" className="mt-2 text-4xl font-bold text-zinc-950">
          NBA Performance Explorer
        </h1>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          {healthQuery.isPending ? (
            <p role="status" aria-live="polite" className="text-zinc-700">
              Checking backend status...
            </p>
          ) : null}

          {healthQuery.isError ? (
            <div role="alert" className="border-l-4 border-red-600 pl-4 text-red-800">
              <p className="font-semibold">Backend status unavailable</p>
              <p className="mt-1 text-sm">The health check could not be completed.</p>
            </div>
          ) : null}

          {healthQuery.isSuccess ? (
            <div role="status" aria-live="polite" className="text-zinc-800">
              <p className="font-semibold text-green-800">Backend status: ok</p>
              <p className="mt-1 text-sm text-zinc-600">
                Service: {healthQuery.data.service}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
