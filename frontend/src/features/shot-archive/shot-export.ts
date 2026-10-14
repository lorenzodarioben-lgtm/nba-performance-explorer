import type { ShotResponse } from '@nba-performance-explorer/contracts';
const cell = (v: string | number) =>
  `"${(typeof v === 'string' && /^[=+@\-\t\r]/.test(v) ? `'${v}` : String(v)).replaceAll('"', '""')}"`;
export function shotPageCsv(data: ShotResponse) {
  if (data.shots.length > 200) throw new Error('Shot export page cap.');
  const lines: (string | number)[][] = [
    [
      'Source',
      data.source.title,
      data.source.creator,
      data.source.url,
      data.source.licence,
      data.source.licenceUrl,
    ],
    [
      'Version',
      data.source.version,
      'Retrieved',
      data.source.retrievedAt,
      'SHA256',
      data.source.sha256,
    ],
    [
      'Coverage',
      data.provenance.coverage,
      'Filtered attempts',
      data.filteredAttempts,
      'Page',
      data.page,
      'Rows',
      data.shots.length,
    ],
    [
      'Coordinates',
      data.coordinateSystem,
      'Source zones retained; X/Y below are original units',
    ],
    [
      'Shot ID',
      'Game ID',
      'Player ID',
      'Player',
      'Team ID',
      'Team',
      'Date',
      'Period',
      'Minutes remaining',
      'Seconds remaining',
      'Type',
      'Made',
      'Source zone',
      'Distance feet',
      'Raw X',
      'Raw Y',
      'Source action',
    ],
    ...data.shots.map((r) => [
      r.id,
      r.gameId,
      r.playerId,
      r.playerName,
      r.team.id,
      r.team.abbreviation,
      r.date,
      r.period,
      r.minutesRemaining,
      r.secondsRemaining,
      r.type,
      r.made ? 1 : 0,
      r.zone,
      r.distanceFeet,
      r.x ?? 'Unknown',
      r.y ?? 'Unknown',
      r.action,
    ]),
  ];
  return lines.map((a) => a.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function shotSvgExport(svg: SVGSVGElement, data: ShotResponse, label: string) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.removeAttribute('aria-hidden');
  copy.setAttribute('role', 'img');
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${label}: recorded partial2018 playoff shots`;
  const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  desc.textContent = `${data.source.title}, ${data.source.creator}, v${data.source.version}, ${data.source.licence}, ${data.source.url}. ${data.provenance.coverage} Filtered ${data.filteredAttempts} events; event page${data.page},${data.shots.length} rows. Density uses all filtered located events,5ft cells; dots only this exact page. ${data.coordinateSystem}. ${data.source.sha256}`;
  copy.prepend(title, desc);
  return new XMLSerializer().serializeToString(copy);
}
export function downloadShotFile(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
