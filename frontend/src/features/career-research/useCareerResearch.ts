import { useQuery } from '@tanstack/react-query';
import {
  CareerResearchResponseSchema,
  type CareerMetric,
  type SeasonScope,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';

export function useCareerResearch(
  playerId: string,
  metric: CareerMetric,
  minGames: number,
  enabled = true,
  scope: SeasonScope = 'regular-season',
) {
  const params = new URLSearchParams({ metric, minGames: String(minGames), scope });
  return useQuery({
    queryKey: ['research', 'career', playerId, metric, minGames, scope],
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
