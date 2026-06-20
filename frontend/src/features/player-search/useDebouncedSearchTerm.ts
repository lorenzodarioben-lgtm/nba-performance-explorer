import { useEffect, useState } from 'react';

export const playerSearchDebounceMilliseconds = 300;
export const minimumPlayerSearchLength = 2;

export function useDebouncedSearchTerm(inputValue: string) {
  const normalizedTerm = inputValue.trim();
  const [settledTerm, setSettledTerm] = useState('');

  useEffect(() => {
    const isEligible = normalizedTerm.length >= minimumPlayerSearchLength;
    const delay = isEligible ? playerSearchDebounceMilliseconds : 0;

    const timeoutId = window.setTimeout(() => {
      setSettledTerm(isEligible ? normalizedTerm : '');
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedTerm]);

  const debouncedTerm =
    normalizedTerm.length >= minimumPlayerSearchLength && normalizedTerm === settledTerm
      ? settledTerm
      : '';

  return {
    debouncedTerm,
    normalizedTerm,
  };
}
