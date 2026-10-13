import { useQuery } from '@tanstack/react-query';
import {
  CareerResearchResponseSchema,
  type CareerMetric,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';

export function useCareerResearch(
  playerId: string,
  metric: CareerMetric,
  minGames: number,
  enabled = true,
) {
  const params = new URLSearchParams({ metric, minGames: String(minGames) });
  return useQuery({
    queryKey: ['research', 'career', playerId, metric, minGames],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/players/${playerId}/career?${params}`,
        signal,
        CareerResearchResponseSchema.parse,
      ),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
