import type { ShotResponse } from '@nba-performance-explorer/contracts';

import { MirrorBars } from '../../charts/MirrorBars';
import { Slate } from '../../ui/Slate';
import { ResearchTable } from '../research/ResearchShell';

type Group = ShotResponse['groups'][number];

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
const short = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

/**
 * Two players' shot diets side by side: each source zone's share of the player's own filtered
 * attempts, with FG% printed beside it. Shares, not counts, so different volumes compare.
 */
export function ZoneStrip({ a, b }: { a: Group; b: Group }) {
  const share = (g: Group, zone: string) => {
    const z = g.zones.find((x) => x.zone === zone);
    return g.attempts && z ? z.attempts / g.attempts : null;
  };
  const zones = a.zones
    .map((z) => z.zone)
    .filter((zone) => {
      const za = a.zones.find((x) => x.zone === zone)!;
      const zb = b.zones.find((x) => x.zone === zone);
      return za.attempts + (zb?.attempts ?? 0) > 0;
    });
  const fg = (g: Group, zone: string) =>
    g.zones.find((x) => x.zone === zone)?.fgPercentage ?? null;
  return (
    <section className="pmod zonestrip" aria-labelledby="zone-strip">
      <Slate
        id="zone-strip"
        title="Shot diet, zone by zone"
        tapes={[{ code: 'SHARE OF OWN ATTEMPTS', variant: 'derived' }]}
        meta={[`${a.label}: ${a.attempts} att`, `${b.label}: ${b.attempts} att`]}
      />
      {zones.length ? (
        <MirrorBars
          nameA={a.label}
          nameB={b.label}
          sharedMax={Math.max(
            ...zones.flatMap((zone) => [share(a, zone) ?? 0, share(b, zone) ?? 0]),
          )}
          rows={zones.map((zone) => {
            const sa = share(a, zone);
            const sb = share(b, zone);
            return {
              label: `${zone} · FG ${short(fg(a, zone))} / ${short(fg(b, zone))}`,
              a: sa,
              b: sb,
              displayA: pct(sa),
              displayB: pct(sb),
            };
          })}
        />
      ) : (
        <p className="pmod__empty">Neither player has a filtered attempt.</p>
      )}
      <p className="lchart__note">
        Bars share one scale: the share of each player&apos;s own filtered attempts. FG%
        follows each zone name (left player / right player) and is withheld below the
        minimum-attempts rule. Source zones are kept exactly as recorded.
      </p>
      <ResearchTable label="Zone share comparison">
        <table>
          <caption>
            Share of each player&apos;s filtered attempts by source zone
          </caption>
          <thead>
            <tr>
              <th scope="col">Zone</th>
              <th scope="col">{a.label} share</th>
              <th scope="col">{a.label} FG</th>
              <th scope="col">{b.label} share</th>
              <th scope="col">{b.label} FG</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone}>
                <th scope="row">{zone}</th>
                <td>{pct(share(a, zone))}</td>
                <td>{pct(fg(a, zone))}</td>
                <td>{pct(share(b, zone))}</td>
                <td>{pct(fg(b, zone))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
    </section>
  );
}
