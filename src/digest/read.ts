import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunLine, RunStatus } from './types.js';

const statuses: readonly RunStatus[] = ['ok', 'retry', 'fail'];

function parseLine(text: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const status = statuses.find((s) => s === v.status);
  if (typeof v.at !== 'string' || typeof v.job !== 'string' || !status) return null;
  if (!('owner' in v) || (v.owner !== null && typeof v.owner !== 'string')) return null;
  if (v.error !== undefined && typeof v.error !== 'string') return null;
  return { at: v.at, job: v.job, status, owner: v.owner, error: v.error };
}

export const readNight: ReadNight = (runsDir, night) => {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    const line = parseLine(text);
    if (!line) {
      badLines++;
      continue;
    }
    const row = rows.get(line.job);
    const retry = line.status === 'retry' ? 1 : 0;
    const lastError = line.error ?? null;
    if (row) {
      row.runs++;
      row.retries += retry;
      row.lastStatus = line.status;
      row.lastError = lastError;
      row.lastAt = line.at;
    } else {
      rows.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: retry,
        lastStatus: line.status,
        lastError,
        firstAt: line.at,
        lastAt: line.at,
      });
    }
  }

  return {
    night,
    rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)),
    badLines,
  };
};
