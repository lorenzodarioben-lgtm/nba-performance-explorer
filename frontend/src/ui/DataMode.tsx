import type { DataProvenance } from '@nba-performance-explorer/contracts';
import { useEffect, useSyncExternalStore } from 'react';

import { Icon } from './Icon';

// Demonstration mode is a property of the running server (fixture provider), so it is learnt from
// the provenance any response reports and then shown on every page for the rest of the visit.
let fixtureSeen = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function markFixture() {
  if (fixtureSeen) return;
  fixtureSeen = true;
  listeners.forEach((listener) => listener());
}

/** Report a response's provenance; fixture data switches the demonstration band on. */
export function useReportProvenance(provenance: DataProvenance | undefined) {
  const isFixture = provenance?.source === 'fixture';
  useEffect(() => {
    if (isFixture) markFixture();
  }, [isFixture]);
}

export function useFixtureMode() {
  return useSyncExternalStore(
    subscribe,
    () => fixtureSeen,
    () => false,
  );
}

/** Persistent band under the masthead while demonstration fixtures are being served. */
export function DemoBand() {
  const fixture = useFixtureMode();
  if (!fixture) return null;
  return (
    <div className="demo-band">
      <div className="wrap">
        <Icon name="info" size={15} />
        <span>
          Demo mode · player figures are deterministic fixtures, not real NBA results.
          Archive data stays genuine.
        </span>
      </div>
    </div>
  );
}
