/**
 * A story opens several analyses at once, and the API deliberately refuses source work beyond a
 * small concurrency budget rather than queueing it. Stories therefore pace themselves: at most
 * two embed requests are in flight; the rest wait their turn in the browser.
 */
export const EMBED_CONCURRENCY = 2;
let inFlight = 0;
const waiting: (() => void)[] = [];
export async function paced<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= EMBED_CONCURRENCY) await new Promise<void>((go) => waiting.push(go));
  inFlight++;
  try {
    return await task();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}
