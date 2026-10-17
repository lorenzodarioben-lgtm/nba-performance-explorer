import { describe, expect, it, vi } from 'vitest';

import { providerUnavailable } from '../features/players/provider-error.js';
import { runSourceProbe } from './probe-free-sources.js';

describe('opt-in source probe budget', () => {
  it('stops after two consecutive failures and emits sanitized categories', async () => {
    const run = vi.fn().mockRejectedValue(providerUnavailable('private body'));
    const report = await runSourceProbe(
      Array.from({ length: 12 }, (_, i) => ({ name: String(i), run })),
    );
    expect(run).toHaveBeenCalledTimes(2);
    expect(report.stoppedEarly).toBe(true);
    expect(JSON.stringify(report)).not.toContain('private body');
    expect(report.productionHostTested).toBe(false);
  });
  it('distinguishes parsed emptiness from genuine nonempty data, bounds checks to twelve', async () => {
    const run = vi.fn().mockResolvedValueOnce(0).mockResolvedValue(10);
    const report = await runSourceProbe(
      Array.from({ length: 20 }, (_, i) => ({ name: String(i), run })),
    );
    expect(run).toHaveBeenCalledTimes(12);
    expect(report.results[0]?.status).toBe('PARSED_EMPTY');
    expect(report.results[1]?.status).toBe('PARSED_NONEMPTY');
  });
});
