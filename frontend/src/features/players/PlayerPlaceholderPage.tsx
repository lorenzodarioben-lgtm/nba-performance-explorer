import { Link, useParams } from 'react-router';

export function PlayerPlaceholderPage() {
  const { playerId } = useParams();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section aria-labelledby="player-profile-title" className="w-full">
        <p className="text-sm font-semibold uppercase text-zinc-600">
          Player route placeholder
        </p>
        <h1 id="player-profile-title" className="mt-2 text-3xl font-bold text-zinc-950">
          Player profile
        </h1>
        <p className="mt-5 text-zinc-700">
          Selected player ID: <strong>{playerId}</strong>
        </p>
        <p className="mt-2 text-zinc-700">
          The full player profile is planned for a later task.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block font-semibold text-red-700 underline underline-offset-4"
        >
          Return to player search
        </Link>
      </section>
    </main>
  );
}
