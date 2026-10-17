import { describe, expect, it } from 'vitest';

import { EMBED_CONCURRENCY, paced } from './embed-pacing';

describe('story embed pacing', () => {
  it('keeps at most two requests in flight, runs every task once and survives failures', async () => {
    let active = 0;
    let peak = 0;
    const order: number[] = [];
    const task =
      (n: number, fail = false) =>
      () =>
        new Promise<number>((resolve, reject) => {
          active++;
          peak = Math.max(peak, active);
          setTimeout(() => {
            active--;
            order.push(n);
            if (fail) reject(new Error(`task ${n}`));
            else resolve(n);
          }, 10);
        });
    const results = await Promise.allSettled([
      paced(task(1)),
      paced(task(2, true)),
      paced(task(3)),
      paced(task(4)),
      paced(task(5)),
    ]);
    expect(peak).toBe(EMBED_CONCURRENCY);
    expect(order.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(results.map((r) => r.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
      'fulfilled',
    ]);
    // The pacer is free again afterwards.
    expect(await paced(async () => 'next')).toBe('next');
  });
});
