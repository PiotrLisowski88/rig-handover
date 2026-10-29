import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night, RunLine } from '../src/digest/types.js';

const baseConfig = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

const line = (at: string, job: string, status: RunLine['status'], error?: string): string =>
  JSON.stringify({ at, job, status, owner: 'team-a', ...(error ? { error } : {}) });

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  const write = (night: string, content: string) => fs.writeFileSync(path.join(runsDir, `${night}.jsonl`), content);

  write(
    '2026-10-01',
    [
      line('2026-10-01T01:00:00+01:00', 'zeta-sync', 'ok'),
      line('2026-10-01T01:05:00+01:00', 'alpha-backup', 'retry', 'timeout'),
      line('2026-10-01T01:10:00+01:00', 'alpha-backup', 'retry', 'timeout'),
      line('2026-10-01T01:15:00+01:00', 'alpha-backup', 'retry', 'timeout'),
      line('2026-10-01T01:20:00+01:00', 'alpha-backup', 'ok'),
      line('2026-10-01T02:00:00+01:00', 'mid-report', 'fail', 'boom'),
    ].join('\n') + '\n',
  );
  write('2026-10-02', '');
  write(
    '2026-10-03',
    [line('2026-10-03T01:00:00+01:00', 'beta-job', 'ok'), '{"at":"2026-10-03T01:05:00+01:00","job":"gam'].join('\n') + '\n',
  );

  app = createApp({ ...baseConfig, runsDir });
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

const jobsInOrder = (html: string, jobs: string[]): boolean => {
  const positions = jobs.map((j) => html.indexOf(j));
  return positions.every((p) => p >= 0) && positions.every((p, i) => i === 0 || p > positions[i - 1]);
};

describe('GET /digest/:night', () => {
  it('renders a normal night with 200 and its jobs', async () => {
    const res = await app.request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['alpha-backup', 'mid-report', 'zeta-sync']) expect(html).toContain(job);
  });

  it('sorts jobs by name', async () => {
    const html = await (await app.request('/digest/2026-10-01')).text();
    expect(jobsInOrder(html, ['alpha-backup', 'mid-report', 'zeta-sync'])).toBe(true);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-10-09');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night with a bad line and reports it', async () => {
    const res = await app.request('/digest/2026-10-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('beta-job');
    expect(html).toMatch(/1 line/);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-10-09');
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('still returns 200 for a night with a bad line and counts it', async () => {
    const res = await app.request('/api/digest/2026-10-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['beta-job']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-01')).text();
    const body = (await (await app.request('/api/digest/2026-10-01')).json()) as Night;
    const jobs = body.rows.map((r) => r.job);
    expect(jobs.length).toBe(3);
    expect(jobsInOrder(html, jobs)).toBe(true);
  });
});
