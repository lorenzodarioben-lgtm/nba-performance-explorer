import { useId } from 'react';
import { Link } from 'react-router';

import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import { CourtLines } from '../foundation/CourtLines';
import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { PlayerProfileError } from '../players/api';
import { getPlayerImage } from '../players/playerImages';
import type { usePlayerProfileQuery } from '../players/usePlayerProfileQuery';
import type { PlayerSlotUrlState } from './comparison-state';

type SlotKind = 'empty' | 'invalid' | 'loading' | 'known' | 'unknown' | 'duplicate';

// A text button/link action on the dark panels: white text with a red underline keeps strong
// contrast over the scrimmed photography (the brand red alone is too dark for text here).
const actionClass =
  'eyebrow text-white/75 underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-white';

const messageClass =
  'mt-3 rounded-sm border border-white/10 bg-accent/15 px-3 py-2 text-sm text-red-100';

export interface ComparisonPlayerSlotProps {
  slotName: string;
  comboboxLabel: string;
  slot: PlayerSlotUrlState;
  isDuplicate: boolean;
  profileQuery: ReturnType<typeof usePlayerProfileQuery>;
  isActive: boolean;
  excludePlayerId: string | undefined;
  // The effective common season, shown as a technical label on a confirmed panel (null until both
  // players and a common season are in effect).
  season: string | null;
  // Staggered load-rise delay for the panel entrance (motion only).
  revealDelayMs?: number;
  onActivate: () => void;
  onCancel: () => void;
  onSelect: (player: PlayerSummary) => void;
  onClear: () => void;
}

// A controlled, presentational dark identity panel. The page owns the URL state and the single
// active-slot state; the panel shows the matching view: a cinematic player identity (mapped photo or
// an intentional photo-free fallback, with jersey number, name link, and technical labels), a
// loading status, a per-slot recovery for invalid/unknown/duplicate ids, or - only when this slot is
// the staged active one - the shared dark search combobox. All logic and control labels are
// preserved; only presentation changes.
export function ComparisonPlayerSlot({
  slotName,
  comboboxLabel,
  slot,
  isDuplicate,
  profileQuery,
  isActive,
  excludePlayerId,
  season,
  revealDelayMs,
  onActivate,
  onCancel,
  onSelect,
  onClear,
}: ComparisonPlayerSlotProps) {
  const headingId = useId();

  // Order matters: empty/invalid/duplicate are determined from the URL before the profile
  // query, because a disabled query (no request id) also reports `isPending`.
  const kind: SlotKind = isDuplicate
    ? 'duplicate'
    : slot.status === 'empty'
      ? 'empty'
      : slot.status === 'invalid'
        ? 'invalid'
        : profileQuery.isPending
          ? 'loading'
          : profileQuery.isError
            ? 'unknown'
            : 'known';

  const showIdentity = kind === 'known' && !isActive;
  const canClear = slot.status !== 'empty';
  // A confirmed player gets a solid panel; an empty or unresolved slot gets a dashed panel, so
  // selected and awaiting slots are distinguished by border style rather than colour alone.
  const hasPlayer = kind === 'known';

  const notFound =
    profileQuery.error instanceof PlayerProfileError &&
    profileQuery.error.kind === 'not-found';

  const activateLabel =
    kind === 'unknown'
      ? `Replace ${slotName}`
      : kind === 'duplicate'
        ? `Choose a different ${slotName}`
        : `Select ${slotName}`;

  const profile =
    showIdentity && profileQuery.isSuccess ? profileQuery.data : undefined;
  const image = profile ? getPlayerImage(profile.id) : undefined;

  return (
    <section
      aria-labelledby={headingId}
      style={revealDelayMs ? { animationDelay: `${revealDelayMs}ms` } : undefined}
      className={`panel-rise relative flex min-h-[21rem] flex-col overflow-hidden rounded-md border p-5 sm:min-h-[24rem] sm:p-6 ${
        hasPlayer
          ? 'border-white/15 bg-coal'
          : 'border-dashed border-white/25 bg-white/[0.02]'
      }`}
    >
      {/* Decorative background for a confirmed player: the mapped photo (masked, scrimmed) or a
          photo-free dark composition. Hidden from assistive tech; the name link conveys identity. */}
      {profile ? (
        <div aria-hidden="true" className="absolute inset-0">
          {image ? (
            <>
              <img
                src={image.src}
                width={image.width}
                height={image.height}
                alt=""
                decoding="async"
                style={{ objectPosition: image.objectPosition }}
                className="hero-photo absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/85 to-coal/25" />
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_72%_18%,rgba(185,28,28,0.24),transparent_62%)]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(65%_60%_at_70%_28%,rgba(185,28,28,0.18),transparent_66%)]" />
              <CourtLines className="absolute -right-8 top-1/2 h-[130%] -translate-y-1/2 text-white/[0.06]" />
            </>
          )}
        </div>
      ) : null}

      {/* Faint atmospheric backdrop for an awaiting or active panel, so the empty head-to-head still
          feels intentionally designed rather than a blank form card. */}
      {!profile ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_75%_25%,rgba(185,28,28,0.08),transparent_70%)]" />
          <CourtLines className="absolute -right-10 top-1/2 h-[130%] -translate-y-1/2 text-white/[0.04]" />
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col">
        <h2 id={headingId} className="eyebrow text-white/55">
          {slotName}
        </h2>

        {kind === 'loading' ? (
          <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
            Loading {slotName}...
          </p>
        ) : null}

        {kind === 'invalid' ? (
          <p role="alert" className={messageClass}>
            That player link is not valid. Search for a player to compare.
          </p>
        ) : null}

        {kind === 'unknown' ? (
          <p role="alert" className={messageClass}>
            {notFound
              ? 'We could not find that player. Search for another to compare.'
              : 'That player could not be loaded. Search for another to compare.'}
          </p>
        ) : null}

        {profile ? (
          <div className="mt-auto pt-8">
            {profile.jerseyNumber !== undefined ? (
              <span className="display block text-5xl font-extrabold leading-none text-accent sm:text-6xl">
                {profile.jerseyNumber}
              </span>
            ) : null}
            <Link
              to={`/players/${encodeURIComponent(profile.id)}`}
              className="display mt-2 block text-3xl font-extrabold uppercase leading-[0.9] text-chalk underline decoration-transparent decoration-2 underline-offset-4 transition-colors hover:decoration-accent sm:text-4xl"
            >
              {profile.fullName}
            </Link>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <span className="eyebrow text-white/70">
                {profile.team ? profile.team.abbreviation : 'No current team'}
              </span>
              {profile.position !== undefined ? (
                <span className="eyebrow text-white/70">{profile.position}</span>
              ) : null}
              {season !== null ? (
                <span className="eyebrow text-white/70">{season}</span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-5">
              <button type="button" onClick={onActivate} className={actionClass}>
                Replace {slotName}
              </button>
              <button type="button" onClick={onClear} className={actionClass}>
                Clear {slotName}
              </button>
            </div>
          </div>
        ) : null}

        {isActive ? (
          <div className="mt-3">
            <PlayerCombobox
              label={comboboxLabel}
              tone="dark"
              excludePlayerId={excludePlayerId}
              onSelect={onSelect}
            />
            <div className="mt-3 flex flex-wrap gap-5">
              {kind === 'known' ? (
                <button type="button" onClick={onCancel} className={actionClass}>
                  Cancel
                </button>
              ) : null}
              {canClear && kind !== 'known' ? (
                <button type="button" onClick={onClear} className={actionClass}>
                  Clear {slotName}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isActive && !showIdentity && kind !== 'loading' ? (
          <div className="mt-auto pt-8">
            {kind === 'empty' ? (
              <p className="max-w-xs text-sm text-white/60">
                Search and choose {slotName} to build the matchup.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={onActivate}
                className="eyebrow inline-flex items-center border border-white/25 px-4 py-2.5 text-chalk transition-colors hover:border-white hover:bg-white/5"
              >
                {activateLabel}
              </button>
              {canClear ? (
                <button type="button" onClick={onClear} className={actionClass}>
                  Clear {slotName}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
