import type {
  ComparisonMetric,
  ComparisonResponse,
  RecordedPlayerComparisonResponse,
} from '@nba-performance-explorer/contracts';

import { csvCell } from '../workbench/workbench-config';

const csv = (rows: (string | number | null)[][]) =>
  rows.map((r) => r.map((v) => csvCell(v)).join(',')).join('\r\n') + '\r\n';

/** The comparison lab's exact table: one column per selected player-season. */
export function comparisonLabCsv(
  data: ComparisonResponse,
  metrics: readonly { key: ComparisonMetric; label: string; unit: string }[],
) {
  const name = (r: ComparisonResponse['rows'][number]) =>
    r.player?.fullName ?? `NBA player ${r.playerId}`;
  return csv([
    ['# NBA Performance Explorer comparison lab'],
    [`# Source: ${data.provenance.source}; ${data.provenance.coverage}`],
    [
      `# Served ${data.provenance.servedAt}; live feed: ${data.provenance.isLive ? 'yes' : 'no'}`,
    ],
    ['metric', 'unit', ...data.rows.map((r) => `${name(r)} ${r.season}`)],
    [
      'team',
      '',
      ...data.rows.map(
        (r) => r.stats?.team?.abbreviation ?? 'Multiple or not supplied',
      ),
    ],
    ...metrics.map((m) => [
      m.label,
      m.unit,
      ...data.rows.map((r) => (r.stats ? r.stats[m.key] : `Unavailable (${r.status})`)),
    ]),
  ]);
}

/** The comparison studio's exact values: value, cohort percentile and z per player. */
export function comparisonStudioCsv(data: RecordedPlayerComparisonResponse) {
  return csv([
    [`# NBA Performance Explorer comparison studio, ${data.season} regular season`],
    [`# Cohort: ${data.population} players with at least ${data.minGames} games`],
    [
      '# Percentile = 100 x (strictly lower + half of ties) / cohort; z uses the population SD',
    ],
    [
      '# Source: recorded 2023-24 Wikipedia team pages (CC BY-SA 4.0); identifiers from Wikidata (CC0).',
    ],
    [
      'player',
      'teams',
      'games',
      'in cohort',
      ...data.metrics.flatMap((m) => [m, `${m} percentile`, `${m} z`]),
    ],
    ...data.players.map((p) => [
      p.name,
      p.teams.join('/'),
      p.gamesPlayed,
      p.qualified ? 'yes' : 'no',
      ...data.metrics.flatMap((_, i) => [
        p.values[i] ?? null,
        p.percentiles[i] === null || p.percentiles[i] === undefined
          ? null
          : Number(p.percentiles[i]!.toFixed(2)),
        p.zScores[i] === null || p.zScores[i] === undefined
          ? null
          : Number(p.zScores[i]!.toFixed(4)),
      ]),
    ]),
  ]);
}

/**
 * A standalone copy of an on-screen chart: namespaced, labelled with a title and a source
 * description, interactive-only attributes removed. Text goes in as text nodes, so names cannot
 * inject markup.
 */
export function chartSvgExport(svg: SVGSVGElement, title: string, description: string) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.removeAttribute('aria-hidden');
  copy.setAttribute('role', 'img');
  copy.setAttributeNS(
    'http://www.w3.org/2000/xmlns/',
    'xmlns',
    'http://www.w3.org/2000/svg',
  );
  if (!copy.getAttribute('viewBox') && copy.getAttribute('width'))
    copy.setAttribute(
      'viewBox',
      `0 0 ${copy.getAttribute('width')} ${copy.getAttribute('height')}`,
    );
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  t.textContent = title;
  const d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  d.textContent = description;
  copy.prepend(t, d);
  // A dark plate keeps the light marks legible outside the page.
  const plate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  plate.setAttribute('width', '100%');
  plate.setAttribute('height', '100%');
  plate.setAttribute('fill', '#111114');
  copy.insertBefore(plate, d.nextSibling);
  return new XMLSerializer().serializeToString(copy);
}
