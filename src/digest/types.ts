// Plan morning-digest § 1. The contract every part of § 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// `null` when runs/<night>.jsonl doesn't exist. Rows are sorted by job.
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

export type ReadNight = (runsDir: string, night: string) => Night | null;
