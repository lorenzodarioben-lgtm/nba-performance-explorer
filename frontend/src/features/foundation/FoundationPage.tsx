import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import { Link } from 'react-router';

import { BasketballCourt } from '../../charts/BasketballCourt';
import {
  Reveal,
  Stagger,
  StaggerItem,
  usePointerDepth,
} from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { SECTIONS } from '../../shell/sections';
import { Icon } from '../../ui/Icon';
import { PlayerSearch } from '../player-search/PlayerSearch';
import { HomePreviews } from './HomePreviews';
import { useHealthQuery } from './useHealthQuery';

// The public landing: the Arena front door. Every block maps to a real capability and every
// preview reads a genuine, labelled archive; nothing here claims to be live.

// A small service-status line. It reflects whether the application's data API is responding
// (useful during a free-tier cold start) and never exposes internal service identifiers.
function ServiceStatus() {
  const healthQuery = useHealthQuery();

  if (healthQuery.isPending) {
    return (
      <p role="status" aria-live="polite" className="home-status">
        Connecting to the data service…
      </p>
    );
  }

  if (healthQuery.isError) {
    return (
      <p role="status" aria-live="polite" className="home-status">
        Data service temporarily unavailable. You can still try a search.
      </p>
    );
  }

  return (
    <p role="status" aria-live="polite" className="home-status is-ok">
      <span aria-hidden="true" className="home-status__ring" />
      Data service available
    </p>
  );
}

function Hero({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }) {
  const allowed = useMotionAllowed();
  const stage = useRef<HTMLElement>(null);
  const depth = usePointerDepth(stage);
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ['start start', 'end start'],
  });
  const photoX = useTransform(depth.x, [-1, 1], [18, -18]);
  const photoY = useTransform(depth.y, [-1, 1], [12, -12]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const typeLift = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={stage} id="top" className="homehero">
      <div className="homehero__stage">
        <motion.div
          className="homehero__photo"
          style={allowed ? { y: lift, opacity: fade } : {}}
        >
          <motion.img
            src="/images/wembanyama-hero.webp"
            width={1140}
            height={760}
            alt="Victor Wembanyama of the San Antonio Spurs holding the ball above a defender"
            fetchPriority="high"
            decoding="async"
            style={allowed ? { x: photoX, y: photoY } : {}}
            initial={
              allowed ? { clipPath: 'inset(0% 0% 0% 100%)', scale: 1.08 } : false
            }
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }}
            transition={{ duration: 1.4, ease: easings.arena, delay: 0.15 }}
          />
        </motion.div>
        <span className="homehero__glow" aria-hidden="true" />
        <span className="homehero__shade" aria-hidden="true" />
        <span className="homehero__lines" aria-hidden="true">
          <BasketballCourt side="bottom" depth={300} floor={false} />
        </span>
      </div>

      <motion.div
        className="wrap homehero__content"
        style={allowed ? { y: typeLift } : {}}
      >
        <motion.p
          className="t-eyebrow is-red"
          initial={allowed ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easings.arena }}
        >
          NBA.com player data · historical archives · nothing live
        </motion.p>
        <h1 ref={headingRef} tabIndex={-1} className="homehero__title">
          <span className="homehero__brand">NBA Performance Explorer</span>{' '}
          {['Read', 'the game.'].map((line, index) => (
            <span key={line} className="kinetic-line homehero__line">
              <motion.span
                className="kinetic-line__inner"
                initial={allowed ? { y: '108%', rotate: 3 } : false}
                animate={{ y: '0%', rotate: 0 }}
                transition={{
                  duration: 1.1,
                  ease: easings.arena,
                  delay: 0.2 + index * 0.13,
                }}
              >
                {line}
              </motion.span>{' '}
            </span>
          ))}
        </h1>

        <Reveal delay={0.55} variant="fade">
          <p className="homehero__lede">
            Search any NBA player and explore their profile, form, career and shooting.
            Compare careers, study recorded games and seasons, and read archived shot
            charts. Player figures are queried from NBA.com when you ask; archives are
            labelled by source.
          </p>
        </Reveal>

        <Reveal delay={0.7} variant="rise" className="homehero__search">
          <PlayerSearch tone="dark" className="w-full" />
          <ServiceStatus />
        </Reveal>
      </motion.div>

      <a href="#rundown" className="homehero__cue">
        The rundown
        <span aria-hidden="true" />
      </a>
    </section>
  );
}

const capabilities = [
  'Player hubs: profile, form, game research, career and shooting',
  'Two-player season comparisons',
  'Career curves and percentile profiles',
  'Archived 2018 playoff shot charts',
  'Recorded 2023–24 standings, leaders and playoff games',
  'Season archive: champions, awards, drafts and records',
];

function Rundown() {
  return (
    <section id="rundown" className="rundown wrap" aria-labelledby="rundown-title">
      <div className="rundown__head">
        <Reveal variant="mask">
          <h2 id="rundown-title" className="rundown__title">
            The rundown
          </h2>
        </Reveal>
        <Reveal variant="fade" delay={0.2}>
          <ul className="rundown__caps" aria-label="What you can do">
            {capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </Reveal>
      </div>
      <Stagger as="ol" className="rundown__list" gap={0.07}>
        {SECTIONS.map((section, index) => (
          <StaggerItem as="li" key={section.id} variant="from-left">
            <Link to={section.to} className="rundown__row">
              <span className="rundown__num">{String(index + 1).padStart(2, '0')}</span>
              <span className="rundown__name">{section.label}</span>
              <span className="rundown__blurb">{section.blurb}</span>
              <span className="rundown__go" aria-hidden="true">
                <Icon name="arrowRight" size={20} />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function OnTape() {
  return (
    <section className="ontape wrap" aria-labelledby="ontape-title">
      <div className="ontape__head">
        <Reveal variant="mask">
          <h2 id="ontape-title" className="rundown__title">
            On tape now
          </h2>
        </Reveal>
        <Reveal variant="fade" delay={0.15}>
          <p className="ontape__note">
            Three real archives, read straight from the sources the platform labels.
            None of it is live.
          </p>
        </Reveal>
      </div>
      <HomePreviews />
    </section>
  );
}

function CompareSection() {
  const allowed = useMotionAllowed();
  return (
    <section className="homecmp" aria-labelledby="homecmp-title">
      <div className="wrap homecmp__inner">
        <Reveal variant="from-left" className="homecmp__photo">
          <img
            src="/images/shai-gilgeous-alexander.webp"
            width={1067}
            height={1600}
            loading="lazy"
            decoding="async"
            alt="Shai Gilgeous-Alexander"
          />
        </Reveal>
        <div className="homecmp__copy">
          <motion.span
            className="homecmp__vs"
            aria-hidden="true"
            initial={allowed ? { scale: 1.8, opacity: 0 } : false}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, ease: easings.arena }}
          >
            VS
          </motion.span>
          <Reveal variant="mask">
            <h2 id="homecmp-title" className="homecmp__title">
              Put two players side by side
            </h2>
          </Reveal>
          <Reveal variant="fade" delay={0.15}>
            <p className="homecmp__lede">
              Line up a season they both played, read a tale of the tape and their
              career arcs, and share the link. No winner is declared for you.
            </p>
            <Link to="/compare" className="btn btn--primary homecmp__cta">
              Compare two players
              <Icon name="arrowRight" size={16} />
            </Link>
          </Reveal>
        </div>
        <Reveal variant="from-right" className="homecmp__photo">
          <img
            src="/images/harden.avif"
            width={980}
            height={1174}
            loading="lazy"
            decoding="async"
            alt="James Harden"
          />
        </Reveal>
      </div>
    </section>
  );
}

export function FoundationPage() {
  // Move focus to the page heading on entry, matching the profile and comparison routes, so
  // keyboard and screen-reader users land on the <h1> after client-side navigation to the
  // landing. Runs on mount only, so it never steals focus during a search.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="home">
      <Hero headingRef={headingRef} />
      <Rundown />
      <OnTape />
      <CompareSection />
    </main>
  );
}
