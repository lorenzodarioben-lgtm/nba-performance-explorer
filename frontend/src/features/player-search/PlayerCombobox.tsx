import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';

import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import { useDebouncedSearchTerm } from './useDebouncedSearchTerm';
import { usePlayerSearchQuery } from './usePlayerSearchQuery';

interface HighlightedOption {
  playerId: string;
  resultSetKey: string;
  searchTerm: string;
}

type ComboboxTone = 'light' | 'dark';

// Presentational class sets only. The two tones differ purely in colour so the same accessible
// combobox can sit on the light data views (default) or the dark editorial hero (`dark`). No markup,
// role, ARIA, keyboard, or query behaviour changes between tones.
const TONES: Record<
  ComboboxTone,
  {
    label: string;
    input: string;
    hint: string;
    alert: string;
    listbox: string;
    option: string;
    optionActive: string;
    optionIdle: string;
    optionName: string;
    optionMeta: string;
  }
> = {
  light: {
    label: 'text-ink',
    input:
      'border-edge-strong bg-surface text-ink placeholder:text-ink-3 focus-visible:border-ink',
    hint: 'text-ink-2',
    alert: 'border-edge bg-accent-quiet text-danger',
    listbox: 'border-edge bg-surface shadow-popover',
    option: 'border-edge',
    optionActive: 'bg-accent-quiet outline-2 outline-offset-[-2px] outline-accent',
    optionIdle: 'hover:bg-surface-sunken',
    optionName: 'text-ink',
    optionMeta: 'text-ink-2',
  },
  dark: {
    label: 'text-white/70',
    input:
      'border-white/25 bg-white/[0.06] text-chalk placeholder:text-white/45 focus-visible:border-white',
    hint: 'text-white/70',
    alert: 'border-white/10 bg-accent/20 text-red-200',
    listbox: 'border-white/15 bg-coal shadow-popover',
    option: 'border-white/10',
    optionActive: 'bg-accent/25 outline-2 outline-offset-[-2px] outline-accent',
    optionIdle: 'hover:bg-white/[0.06]',
    optionName: 'text-chalk',
    optionMeta: 'text-white/60',
  },
};

interface PlayerComboboxProps {
  // Visible label and accessible name for the input. Distinct per usage (home search,
  // comparison Player A, comparison Player B) so each combobox is individually identifiable.
  label: string;
  onSelect: (player: PlayerSummary) => void;
  // Optional class for the outer container so callers control layout without affecting the
  // combobox internals.
  className?: string;
  // When set, this player id is excluded from selectable results (used to prevent picking the
  // player already chosen in the other comparison slot). If the excluded player is the only
  // match, an accessible "already selected" message is announced.
  excludePlayerId?: string | undefined;
  // Colour tone only. Defaults to the light data-view styling; the dark hero passes `dark`.
  tone?: ComboboxTone;
}

// The accessible, debounced search combobox shared by the home page and the comparison page.
// It owns only ephemeral interaction state (input value, open/highlight); selection is handled
// by the caller through `onSelect`.
export function PlayerCombobox({
  label,
  onSelect,
  className,
  excludePlayerId,
  tone = 'light',
}: PlayerComboboxProps) {
  const t = TONES[tone];
  const generatedId = useId().replaceAll(':', '');
  const inputId = `player-search-${generatedId}`;
  const listboxId = `${inputId}-results`;
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState<HighlightedOption | null>(
    null,
  );
  const { debouncedTerm, normalizedTerm } = useDebouncedSearchTerm(inputValue);
  const searchQuery = usePlayerSearchQuery(debouncedTerm);
  const isCurrentSearch = debouncedTerm.length > 0 && debouncedTerm === normalizedTerm;
  const allPlayers = isCurrentSearch ? (searchQuery.data?.players ?? []) : [];
  // Hide the other slot's player from the selectable results; visual filtering alone is not
  // relied on — the page keeps a defensive duplicate guard too.
  const players =
    excludePlayerId !== undefined
      ? allPlayers.filter((player) => player.id !== excludePlayerId)
      : allPlayers;
  const resultSetKey = players.map((player) => player.id).join('|');
  const highlightedIndex =
    highlightedOption?.searchTerm === debouncedTerm &&
    highlightedOption.resultSetKey === resultSetKey
      ? players.findIndex((player) => player.id === highlightedOption.playerId)
      : -1;
  const highlightedPlayer =
    highlightedIndex >= 0 ? players[highlightedIndex] : undefined;
  const isLoading = isCurrentSearch && searchQuery.isFetching;
  const isError = isCurrentSearch && searchQuery.isError;
  const isSettled = isCurrentSearch && searchQuery.isSuccess && !searchQuery.isFetching;
  const isEmpty = isSettled && allPlayers.length === 0;
  // The only matches were the player already selected in the other slot.
  const isAlreadySelected = isSettled && allPlayers.length > 0 && players.length === 0;
  const hasResults = players.length > 0;
  const isExpanded =
    isOpen &&
    isCurrentSearch &&
    (isLoading || isError || isEmpty || isAlreadySelected || hasResults);

  function selectPlayer(player: PlayerSummary) {
    setIsOpen(false);
    setHighlightedOption(null);
    onSelect(player);
  }

  function moveHighlight(direction: 1 | -1) {
    if (players.length === 0) {
      return;
    }

    const nextIndex =
      highlightedIndex < 0
        ? direction === 1
          ? 0
          : players.length - 1
        : (highlightedIndex + direction + players.length) % players.length;
    const nextPlayer = players[nextIndex];

    if (nextPlayer) {
      setIsOpen(true);
      setHighlightedOption({
        playerId: nextPlayer.id,
        resultSetKey,
        searchTerm: debouncedTerm,
      });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        if (players.length > 0) {
          event.preventDefault();
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        if (players.length > 0) {
          event.preventDefault();
          moveHighlight(-1);
        }
        break;
      case 'Enter':
        if (isOpen && highlightedPlayer) {
          event.preventDefault();
          selectPlayer(highlightedPlayer);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setHighlightedOption(null);
        }
        break;
    }
  }

  function keepInputFocus(event: PointerEvent<HTMLElement>) {
    event.preventDefault();
  }

  return (
    <div className={className}>
      <label htmlFor={inputId} className={`block text-sm font-semibold ${t.label}`}>
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        type="search"
        value={inputValue}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isExpanded}
        aria-controls={isExpanded && hasResults ? listboxId : undefined}
        aria-activedescendant={
          isExpanded && highlightedPlayer
            ? `${listboxId}-option-${highlightedPlayer.id}`
            : undefined
        }
        className={`mt-2 w-full rounded-sm border px-4 py-3 text-base ${t.input}`}
        placeholder="Enter at least 2 characters"
        onBlur={() => {
          setIsOpen(false);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setInputValue(nextValue);
          setIsOpen(nextValue.trim().length >= 2);
          setHighlightedOption(null);
        }}
        onFocus={() => {
          if (normalizedTerm.length >= 2) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && isLoading ? (
        <p role="status" aria-live="polite" className={`mt-3 text-sm ${t.hint}`}>
          Searching players...
        </p>
      ) : null}

      {isOpen && isError ? (
        <p
          role="alert"
          className={`mt-3 rounded-sm border px-3 py-2 text-sm ${t.alert}`}
        >
          Player search is unavailable. Please try again.
        </p>
      ) : null}

      {isOpen && isEmpty ? (
        <p role="status" aria-live="polite" className={`mt-3 text-sm ${t.hint}`}>
          No players found.
        </p>
      ) : null}

      {isOpen && isAlreadySelected ? (
        <p role="status" aria-live="polite" className={`mt-3 text-sm ${t.hint}`}>
          That player is already selected.
        </p>
      ) : null}

      {isOpen && isCurrentSearch && hasResults ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Player search results"
          className={`mt-2 max-h-80 overflow-y-auto rounded-sm border ${t.listbox}`}
        >
          {players.map((player) => {
            const isHighlighted = player.id === highlightedPlayer?.id;
            const teamLabel = player.team
              ? player.team.abbreviation
              : 'No current team';

            return (
              <li
                id={`${listboxId}-option-${player.id}`}
                key={player.id}
                role="option"
                aria-label={`${player.fullName}, ${teamLabel}${
                  player.position ? `, ${player.position}` : ''
                }`}
                aria-selected={isHighlighted}
                className={`cursor-pointer border-b px-3.5 py-2.5 last:border-b-0 ${t.option} ${
                  isHighlighted ? t.optionActive : t.optionIdle
                }`}
                onClick={() => {
                  selectPlayer(player);
                }}
                onPointerDown={keepInputFocus}
              >
                <span className={`block font-semibold ${t.optionName}`}>
                  {player.fullName}
                </span>
                <span className={`mt-0.5 block text-sm ${t.optionMeta}`}>
                  {teamLabel}
                  {player.position ? ` | ${player.position}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
