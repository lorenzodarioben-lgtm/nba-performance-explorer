import { useEffect, useRef, type RefObject } from 'react';
import { Link } from 'react-router';

import { PlayerSearch } from '../player-search/PlayerSearch';
import { CourtLines } from './CourtLines';
import { LandingMarquee } from './LandingMarquee';
import { Reveal } from './Reveal';
import { useHealthQuery } from './useHealthQuery';

// The public landing page: a dark, broadcast-editorial experience built entirely around the app's
// real features. The player search is the primary action inside the hero; every section maps to an
// existing capability (profiles, season statistics, career trends, game logs, comparison). No
// fabricated data or invented features appear.
const capabilities = [
  'Player profiles with bio and team details',
  'Regular-season statistics for any season',
  'Career trends for points, rebounds, and assists',
  'Game-by-game logs',
  'Two-player season comparisons',
  'Shareable comparison links',
];

// A small, unobtrusive service-status line. It reflects whether the application's data API is
// responding — which also gives useful feedback during a free-tier cold start — and never exposes
// internal service identifiers. Loading and failure states stay accessible (polite live region).
function ServiceStatus() {
  const healthQuery = useHealthQuery();

  if (healthQuery.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-white/60">
        Connecting to live data…
      </p>
    );
  }

  if (healthQuery.isError) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-white/60">
        Live data service temporarily unavailable. You can still try a search.
      </p>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-white/70"
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-ok" />
      Live data service available
    </p>
  );
}

function Hero({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-hidden bg-night text-chalk"
    >
      {/* Background: the athlete photograph, masked so its edges dissolve into the night, plus a
          left-to-dark scrim for headline legibility and a restrained red broadcast glow. */}
      <div className="absolute inset-0">
        <img
          src="/images/wembanyama-hero.webp"
          width={1140}
          height={760}
          alt="Victor Wembanyama of the San Antonio Spurs holding the ball above a defender"
          fetchPriority="high"
          decoding="async"
          className="hero-photo absolute inset-0 h-full w-full object-cover object-[62%_18%] sm:left-auto sm:right-0 sm:w-[64%] sm:object-[center_22%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/60" />
        <div className="absolute inset-0 bg-[radial-gradient(58%_48%_at_74%_36%,rgba(185,28,28,0.30),transparent_62%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[80rem] flex-col justify-center px-6 pb-24 pt-28 sm:px-8">
        <p className="eyebrow text-white/60">Live NBA.com data / 2025-26 season</p>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="display mt-5 text-[clamp(2.75rem,11vw,9rem)] font-extrabold uppercase leading-[0.84] text-chalk outline-none"
        >
          <span className="hero-line">
            <span>NBA</span>
          </span>{' '}
          <span className="hero-line">
            <span>Performance</span>
          </span>{' '}
          <span className="hero-line">
            <span>Explorer</span>
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-white/75 sm:text-xl">
          Search any NBA player and explore their profile, season statistics, career
          trends, game logs, and head-to-head comparisons.
        </p>

        <div className="mt-10 w-full max-w-2xl border-l-2 border-accent pl-5">
          <PlayerSearch tone="dark" className="w-full" />
          <div className="mt-4">
            <ServiceStatus />
          </div>
        </div>
      </div>

      {/* Scroll affordance. */}
      <a
        href="#explore"
        className="eyebrow absolute inset-x-0 bottom-6 z-10 mx-auto flex w-max flex-col items-center gap-2 text-white/45 transition-colors hover:text-white"
      >
        Scroll
        <span
          aria-hidden="true"
          className="scroll-cue-dot block h-2 w-2 rounded-full bg-accent"
        />
      </a>
    </section>
  );
}

function ExploreSection() {
  return (
    <section
      id="explore"
      className="relative bg-night px-6 py-24 text-chalk sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            Profiles built
            <br />
            like a box score
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal>
            <p className="max-w-xl text-lg text-white/70">
              Open any player to read their bio, team, and a full season line: points,
              rebounds, assists, and the complete shooting splits. Then move season by
              season through their career.
            </p>
            <ul className="mt-8 border-y border-white/10">
              {capabilities.map((capability, index) => (
                <li
                  key={capability}
                  className="flex items-baseline gap-4 border-b border-white/10 py-3 last:border-b-0"
                >
                  <span className="font-mono text-xs text-white/35">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-base text-chalk">{capability}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayMs={120}>
            <figure className="relative">
              <div className="absolute -left-3 -top-3 h-16 w-16 border-l-2 border-t-2 border-accent" />
              <img
                src="/images/luka-doncic.jpg"
                width={1200}
                height={915}
                loading="lazy"
                decoding="async"
                alt="Luka Doncic during an NBA game"
                className="aspect-[4/5] w-full rounded-sm object-cover object-[center_25%] grayscale-[0.15] sm:aspect-[4/3]"
              />
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TrendsSection() {
  return (
    <section
      id="trends"
      className="relative overflow-hidden bg-coal px-6 py-24 text-chalk sm:px-8 sm:py-32"
    >
      {/* Cinematic depth on the dark surface: a restrained red broadcast glow plus the court-line
          motif, both decorative. The section is charcoal (coal) so it reads as its own beat between
          the near-black sections without leaving the dark theme. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_18%_30%,rgba(185,28,28,0.14),transparent_62%)]"
      />
      <Reveal className="pointer-events-none absolute -right-16 top-1/2 hidden h-[560px] -translate-y-1/2 text-white/[0.06] lg:block">
        <CourtLines className="h-full w-auto" />
      </Reveal>

      <div className="relative mx-auto max-w-[80rem]">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <figure className="relative">
              <img
                src="/images/giannis.avif"
                width={1920}
                height={1080}
                loading="lazy"
                decoding="async"
                alt="Giannis Antetokounmpo during an NBA game"
                className="aspect-square w-full rounded-sm object-cover object-[center_25%]"
              />
            </figure>
          </Reveal>

          <Reveal delayMs={120}>
            <h2 className="display text-5xl font-extrabold uppercase leading-[0.9] text-chalk sm:text-7xl">
              Watch a career
              <br />
              take shape
            </h2>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Points, rebounds, and assists per game across every season, drawn as an
              interactive chart and mirrored in a full data table so the same numbers
              are available to screen readers and keyboards.
            </p>
            <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.14em] text-white/55">
              <span>Points per game</span>
              <span>Rebounds per game</span>
              <span>Assists per game</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CompareSection() {
  return (
    <section className="relative overflow-hidden bg-night px-6 py-24 text-chalk sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[80rem]">
        <Reveal className="text-center">
          <p className="eyebrow text-white/60">Head to head</p>

          <div className="mt-10 flex items-center justify-center gap-5 sm:gap-10">
            <figure className="h-36 w-32 overflow-hidden rounded-sm border border-white/10 sm:h-56 sm:w-48">
              <img
                src="/images/shai-gilgeous-alexander.webp"
                width={1067}
                height={1600}
                loading="lazy"
                decoding="async"
                alt="Shai Gilgeous-Alexander"
                className="h-full w-full object-cover object-top"
              />
            </figure>
            <span className="display text-6xl font-extrabold uppercase leading-none text-accent-bright sm:text-8xl">
              VS
            </span>
            <figure className="h-36 w-32 overflow-hidden rounded-sm border border-white/10 sm:h-56 sm:w-48">
              <img
                src="/images/harden.avif"
                width={980}
                height={1174}
                loading="lazy"
                decoding="async"
                alt="James Harden"
                className="h-full w-full object-cover object-top"
              />
            </figure>
          </div>

          <h2 className="display mx-auto mt-12 text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            Put two players
            <br />
            side by side
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
            Line up a season they both played, compare every number in a neutral table,
            and share the link.
          </p>
          <Link
            to="/compare"
            className="display mt-10 inline-flex items-center gap-3 bg-accent px-8 py-4 text-lg font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-strong"
          >
            Compare two players
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function ClosingSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-night px-6 py-28 text-chalk sm:px-8">
      <div className="mx-auto max-w-[80rem] text-center">
        <Reveal>
          <p className="display text-[clamp(3rem,14vw,10rem)] font-extrabold uppercase leading-[0.82]">
            Tip
            <br />
            off
          </p>
          <a
            href="#top"
            className="display mt-10 inline-flex items-center gap-3 border border-white/25 px-8 py-4 text-lg font-bold uppercase tracking-wide text-chalk transition-colors hover:border-white hover:bg-white/5"
          >
            Search a player
            <span aria-hidden="true">&uarr;</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function FoundationPage() {
  // Move focus to the page heading on entry, matching the profile and comparison routes, so keyboard
  // and screen-reader users land on the <h1> after client-side navigation to the landing. Runs on
  // mount only, so it never steals focus during a search or on a background rerender.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="bg-night">
      <Hero headingRef={headingRef} />
      <LandingMarquee />
      <ExploreSection />
      <TrendsSection />
      <CompareSection />
      <ClosingSection />
    </main>
  );
}
