# Historical table attribution and reuse

The optional historical snapshot provider adapts structured tables from
[2023–24 NBA season](https://en.wikipedia.org/wiki/2023%E2%80%9324_NBA_season)
and [2024 NBA playoffs](https://en.wikipedia.org/wiki/2024_NBA_playoffs), by
Wikipedia contributors. Each response and page links its exact source revision,
contributor history and [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The adapted snapshot data is offered under that same licence. This notice applies
to adapted Wikipedia data, not unrelated application code or NBA.com data.

Adaptations: extracted table cells, normalized namespaced NBA team/game IDs from
explicit identities/source recap links, validated calendar dates, final scores and
period sums, calculated W/GP and recorded game scoring summaries. Source standings
rank, leader ties and displayed leader units remain as published. Original page
layout, prose, photographs, logos, video and other media are not reproduced.

Rights/access basis: [Wikimedia Terms of Use section 7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
and [Foundation API usage guidelines](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines).
Normal public MediaWiki parse API requests use a truthful project User-Agent,
two fixed page titles, maxlag, a 10-second timeout, a 2 MB decoded limit, a 24-hour
bounded deduplicated cache, and Retry-After cooldown. No accounts, paid keys,
scraping evasion or media downloads. Failed sources remain unavailable.

Scope: one recorded 2023–24 regular season with 30 standings and published category
winners, plus recorded 2024 playoff finals. This is a community-maintained historical
source, not official/live NBA results. Publication as-of time and game time zones
are unknown. No full player box scores, roster, possession events or shot locations
are supplied. Runtime failures never substitute the explicitly synthetic test data.

Safe HTML parsing requires the free MIT-licensed parse5 runtime dependency.
Its package includes its [MIT licence](https://github.com/inikulin/parse5/blob/master/LICENSE).
The package and lockfile changes are intentional and leave the existing NBA provider intact.

The team extension also adapts the30 fixed2023–24 NBA team-season pages. Every view/response credits its exact revision and Wikipedia contributors under the same CC BY-SA4.0 terms. Thirty-title whitelist replaces the initial two-title-only scope; same timeout/body/cache/cooldown protections apply. Extracted roster DOB/positions, regular results and participant tables carry adaptation notice. Exact article-to-NBA-ID joins separately use Wikidata CC0 facts and entity evidence; source names never guess NBA identifiers. Chicago participant scope remains unspecified.
