import { useId } from 'react';
import { Link } from 'react-router';

import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { PlayerProfileError } from '../players/api';
import type { usePlayerProfileQuery } from '../players/usePlayerProfileQuery';
import type { PlayerSlotUrlState } from './comparison-state';

type SlotKind = 'empty' | 'invalid' | 'loading' | 'known' | 'unknown' | 'duplicate';

const linkButtonClass =
  'font-semibold text-red-700 underline underline-offset-4 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-400';

const messageClass = 'mt-3 border-l-4 border-red-600 pl-3 text-sm text-red-800';

export interface ComparisonPlayerSlotProps {
  slotName: string;
  comboboxLabel: string;
  slot: PlayerSlotUrlState;
  isDuplicate: boolean;
  profileQuery: ReturnType<typeof usePlayerProfileQuery>;
  isActive: boolean;
  excludePlayerId: string | undefined;
  onActivate: () => void;
  onCancel: () => void;
  onSelect: (player: PlayerSummary) => void;
  onClear: () => void;
}

// A controlled, presentational slot. The page owns the URL state and the single active-slot
// state; the slot shows the matching view: an identity with replace/clear, a loading status,
// a per-slot recovery for invalid/unknown/duplicate ids, or — only when this slot is the
// staged active one — the shared search combobox.
export function ComparisonPlayerSlot({
  slotName,
  comboboxLabel,
  slot,
  isDuplicate,
  profileQuery,
  isActive,
  excludePlayerId,
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

  const notFound =
    profileQuery.error instanceof PlayerProfileError &&
    profileQuery.error.kind === 'not-found';

  const activateLabel =
    kind === 'unknown'
      ? `Replace ${slotName}`
      : kind === 'duplicate'
        ? `Choose a different ${slotName}`
        : `Select ${slotName}`;

  return (
    <section
      aria-labelledby={headingId}
      className="border-t-4 border-zinc-900 pt-4 sm:border-t-0 sm:border-l-4 sm:pt-0 sm:pl-6"
    >
      <h2 id={headingId} className="text-xl font-bold text-zinc-950">
        {slotName}
      </h2>

      {kind === 'loading' ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
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

      {showIdentity && profileQuery.isSuccess ? (
        <div className="mt-3">
          <p className="text-sm uppercase text-zinc-500">Selected</p>
          <Link
            to={`/players/${encodeURIComponent(profileQuery.data.id)}`}
            className={`mt-1 inline-block text-lg ${linkButtonClass}`}
          >
            {profileQuery.data.fullName}
          </Link>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={onActivate} className={linkButtonClass}>
              Replace {slotName}
            </button>
            <button type="button" onClick={onClear} className={linkButtonClass}>
              Clear {slotName}
            </button>
          </div>
        </div>
      ) : null}

      {isActive ? (
        <div className="mt-3">
          <PlayerCombobox
            label={comboboxLabel}
            excludePlayerId={excludePlayerId}
            onSelect={onSelect}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {kind === 'known' ? (
              <button type="button" onClick={onCancel} className={linkButtonClass}>
                Cancel
              </button>
            ) : null}
            {canClear && kind !== 'known' ? (
              <button type="button" onClick={onClear} className={linkButtonClass}>
                Clear {slotName}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isActive && !showIdentity && kind !== 'loading' ? (
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <button type="button" onClick={onActivate} className={linkButtonClass}>
            {activateLabel}
          </button>
          {canClear ? (
            <button type="button" onClick={onClear} className={linkButtonClass}>
              Clear {slotName}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
