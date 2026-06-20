import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router';

import { useDebouncedSearchTerm } from './useDebouncedSearchTerm';
import { usePlayerSearchQuery } from './usePlayerSearchQuery';

interface HighlightedOption {
  playerId: string;
  resultSetKey: string;
  searchTerm: string;
}

export function PlayerSearch() {
  const navigate = useNavigate();
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
  const players = isCurrentSearch ? (searchQuery.data?.players ?? []) : [];
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
  const isEmpty =
    isCurrentSearch &&
    searchQuery.isSuccess &&
    !searchQuery.isFetching &&
    players.length === 0;
  const hasResults = players.length > 0;
  const isExpanded =
    isOpen && isCurrentSearch && (isLoading || isError || isEmpty || hasResults);

  function selectPlayer(playerId: string) {
    setIsOpen(false);
    setHighlightedOption(null);
    navigate(`/players/${encodeURIComponent(playerId)}`);
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
          selectPlayer(highlightedPlayer.id);
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
    <div className="mt-8 max-w-xl">
      <label htmlFor={inputId} className="block text-sm font-semibold text-zinc-900">
        Search NBA players
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
        className="mt-2 w-full border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300"
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
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          Searching players...
        </p>
      ) : null}

      {isOpen && isError ? (
        <p
          role="alert"
          className="mt-3 border-l-4 border-red-600 pl-3 text-sm text-red-800"
        >
          Player search is unavailable. Please try again.
        </p>
      ) : null}

      {isOpen && isEmpty ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          No players found.
        </p>
      ) : null}

      {isOpen && isCurrentSearch && hasResults ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Player search results"
          className="mt-3 max-h-80 overflow-y-auto border border-zinc-300 bg-white"
        >
          {players.map((player) => {
            const isHighlighted = player.id === highlightedPlayer?.id;

            return (
              <li
                id={`${listboxId}-option-${player.id}`}
                key={player.id}
                role="option"
                aria-label={`${player.fullName}, ${player.team.abbreviation}${
                  player.position ? `, ${player.position}` : ''
                }`}
                aria-selected={isHighlighted}
                className={`cursor-pointer border-b border-zinc-200 px-3 py-3 last:border-b-0 ${
                  isHighlighted
                    ? 'outline-2 outline-offset-[-3px] outline-zinc-950'
                    : 'hover:bg-zinc-100'
                }`}
                onClick={() => {
                  selectPlayer(player.id);
                }}
                onPointerDown={keepInputFocus}
              >
                <span className="block font-semibold text-zinc-950">
                  {player.fullName}
                </span>
                <span className="mt-1 block text-sm text-zinc-600">
                  {player.team.abbreviation}
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
