import type { DigestRow, RunStatus } from './types.js';

export type NightCounts = Record<RunStatus, number>;

export function countByLastStatus(rows: DigestRow[]): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of rows) counts[row.lastStatus] += 1;
  return counts;
}
