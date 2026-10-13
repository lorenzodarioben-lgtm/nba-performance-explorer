# Expansion API catalog

Static directory additions:

- `GET /api/teams?search=`: optional 80-character search, alphabetic results,
  at most 30; TeamDirectoryResponse with static provenance.
- `GET /api/teams/:teamId`: `nba:` numeric namespace; TeamDetailResponse with
  explicit false roster/schedule/statistics capability flags.
- Invalid/repeated/unknown directory query or namespace 400; missing ID 404;
  unsupported methods 405. No upstream/statistical fallback.

My NBA has no backend mutations. Storage key `nba-explorer.research.v1`;
version 1, at most 100 bookmarks / 100,000 JSON characters, safe internal routes.
Import merges and preserves existing entries. Corrupt/blocked/quota-limited
storage has session recovery. Export is selectable JSON to copy to a file;
no statistical bulk export, accounts or telemetry.

Existing `/api/players` behavior stays intact. New strict shared schemas:
`packages/contracts/src/research.ts`. Browser requests remain same-origin.

| GET endpoint                      | Parameters / bounds                                                                                                                                                                                                                              | Response / errors                                                                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/data-sources/status`        | None                                                                                                                                                                                                                                             | Configured source, conditional/blocked capabilities. Configuration only, not live health; production host unverified.                                                                                                                                                                      |
| `/api/players/:playerId/insights` | NBA decimal ID max 12; optional season (newest observed default); window 1–20 (5 default); inclusive from/to; three-letter opponent; home/away; W/L; sort date/points/rebounds/assists/minutes; asc/desc; page 1–100; pageSize 1–50 (20 default) | PlayerInsightsResponse with profile/seasons, nullable summary, paginated games, full-filtered averages/splits/rolling/extrema/provenance. 400 invalid/repeated/unknown filters; 404 player missing; absent season summary is nullable; 502 malformed source; 503 unavailable; 504 timeout. |
| `/api/analytics/compare`          | 2–4 distinct comma-separated NBA IDs; aligned valid comma-separated seasons                                                                                                                                                                      | ComparisonResponse with nullable per-player values and available/player-not-found/season-unavailable/source-unavailable statuses. 400 invalid, duplicate, repeated or unknown query. Sequential slots bound concurrency.                                                                   |

No fixture fallback. Local defaults explicitly labeled. Existing 500-entry LRU
deduplicates source requests: current logs 5 minutes; historical logs 7 days; empty
1 minute. Client staleTime 1 minute, no retries/focus refetch, navigation cancellation.
Legacy source timestamps are unknown: retrievedAt/asOf null, isLive false.
servedAt is response generation, never a claim of upstream freshness.
No bulk statistics export until redistribution rights are established.
