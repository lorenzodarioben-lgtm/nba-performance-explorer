import { motion, useInView, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import { BasketballCourt } from '../../charts/BasketballCourt';
import { KineticHeadline, Reveal, usePointerDepth } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { Tape } from '../../ui/Tape';
import { useHubHero } from '../player-hub/hub-context';
import { formatDraft, formatHeight, formatTeamName, formatWeight } from './format';
import { getPlayerImage } from './playerImages';

interface ProfileRow {
  label: string;
  value: string;
}

// Bio metadata as label/value pairs. The shared contracts store raw/structured values; the
// formatters turn them into display strings. Only fields the provider returned are included,
// so no player fact is invented and no "undefined" can render.
function buildProfileRows(profile: PlayerProfile): ProfileRow[] {
  const rows: ProfileRow[] = profile.team
    ? [
        { label: 'Team', value: formatTeamName(profile.team) },
        { label: 'Abbreviation', value: profile.team.abbreviation },
      ]
    : [{ label: 'Team', value: 'No current team' }];

  if (profile.position !== undefined) {
    rows.push({ label: 'Position', value: profile.position });
  }
  if (profile.jerseyNumber !== undefined) {
    rows.push({ label: 'Jersey number', value: profile.jerseyNumber });
  }
  if (profile.heightInches !== undefined) {
    rows.push({ label: 'Height', value: formatHeight(profile.heightInches) });
  }
  if (profile.weightPounds !== undefined) {
    rows.push({ label: 'Weight', value: formatWeight(profile.weightPounds) });
  }
  if (profile.country !== undefined) {
    rows.push({ label: 'Country', value: profile.country });
  }
  if (profile.draft !== undefined) {
    rows.push({ label: 'Draft', value: formatDraft(profile.draft) });
  }

  return rows;
}

/** Split a name into display lines: given names on the first, the family name on the second. */
function nameLines(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [fullName];
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1] ?? ''];
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/**
 * The Arena introduction of a player: a full-bleed composition with the mapped photograph (or
 * an intentional photo-free court composition), an outlined jersey number in depth, the name as
 * the route heading in kinetic display type and the bio as a broadcast strip. Pointer depth and
 * scroll parallax move only transforms; the data is present whatever the motion setting.
 */
export function PlayerProfileHero({
  profile,
  headingRef,
  actions,
}: {
  profile: PlayerProfile;
  headingRef: RefObject<HTMLHeadingElement | null>;
  actions?: ReactNode;
}) {
  const image = getPlayerImage(profile.id);
  const rows = buildProfileRows(profile);
  const jersey = profile.jerseyNumber;
  const allowed = useMotionAllowed();
  const stage = useRef<HTMLElement>(null);
  const depth = usePointerDepth(stage);
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ['start start', 'end start'],
  });

  const photoX = useTransform(depth.x, [-1, 1], [14, -14]);
  const photoY = useTransform(depth.y, [-1, 1], [10, -10]);
  const ghostX = useTransform(depth.x, [-1, 1], [-26, 26]);
  const scrollPhotoY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.1]);
  const scrollFade = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);
  const ghostY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  // The hub's score bug appears once the hero has left the screen.
  const setHeroInView = useHubHero();
  const inView = useInView(stage, { margin: '-120px 0px 0px 0px' });
  useEffect(() => {
    setHeroInView?.(inView);
    return () => setHeroInView?.(false);
  }, [inView, setHeroInView]);

  return (
    <section
      ref={stage}
      aria-labelledby="player-profile-heading"
      className={`phero ${image ? 'phero--photo' : 'phero--plain'}`}
    >
      <div className="phero__stage">
        <motion.span
          aria-hidden="true"
          className="phero__ghost"
          style={allowed ? { x: ghostX, y: ghostY } : {}}
          initial={allowed ? { opacity: 0, scale: 1.08 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: easings.arena }}
        >
          {jersey ?? initials(profile.fullName)}
        </motion.span>
        {image ? (
          <motion.div
            className={`phero__photo phero__photo--${image.kind}`}
            style={allowed ? { y: scrollPhotoY, opacity: scrollFade } : {}}
          >
            <motion.img
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 767px) 100vw, min(64vw, 980px)"
              width={image.width}
              height={image.height}
              alt={image.alt}
              fetchPriority="high"
              decoding="async"
              style={{
                objectPosition: image.objectPosition,
                ...(allowed ? { x: photoX, y: photoY, scale: scrollScale } : {}),
              }}
              initial={
                allowed ? { opacity: 0, clipPath: 'inset(0% 0% 0% 100%)' } : false
              }
              animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
              transition={{ duration: 1.2, ease: easings.arena, delay: 0.1 }}
            />
          </motion.div>
        ) : (
          <motion.div
            aria-hidden="true"
            className="phero__court"
            style={allowed ? { y: scrollPhotoY, opacity: scrollFade } : {}}
          >
            <BasketballCourt side="bottom" depth={300} floor={false} />
          </motion.div>
        )}
        <span className="phero__glow" aria-hidden="true" />
        <span className="phero__shade" aria-hidden="true" />
      </div>

      <div className="wrap phero__content">
        <Reveal variant="fade" className="phero__eyebrow">
          <span className="t-eyebrow is-red">Player profile</span>
          <Tape code="NBA.com" source="Queried" variant="queried" />
        </Reveal>
        <KineticHeadline
          lines={nameLines(profile.fullName)}
          id="player-profile-heading"
          headingRef={headingRef}
          tabIndex={-1}
          className="phero__name"
          delay={0.15}
        />

        <motion.dl
          className="phero__bio"
          initial={allowed ? 'hidden' : false}
          animate="shown"
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: 0.05, delayChildren: 0.55 } },
          }}
        >
          {rows.map((row) => (
            <motion.div
              key={row.label}
              className="phero__fact"
              variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: easings.arena }}
            >
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </motion.div>
          ))}
        </motion.dl>
        {actions ? (
          <Reveal delay={0.8} variant="fade" className="phero__actions">
            {actions}
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
