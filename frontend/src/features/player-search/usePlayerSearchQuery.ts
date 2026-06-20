import { useQuery } from '@tanstack/react-query';

import { searchPlayers } from './api';
import { minimumPlayerSearchLength } from './useDebouncedSearchTerm';

export function usePlayerSearchQuery(normalizedSearchTerm: string) {
  return useQuery({
    queryKey: ['players', 'search', normalizedSearchTerm],
    queryFn: ({ signal }) => searchPlayers(normalizedSearchTerm, signal),
    enabled: normalizedSearchTerm.length >= minimumPlayerSearchLength,
    retry: false,
  });
}
