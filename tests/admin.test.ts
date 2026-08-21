import { describe, it, expect } from 'vitest';
import {
  calculateDeploySyncState,
  findFailedStep,
  formatRelativeTime,
  parseCommitMessage,
  type WorkflowJob,
} from '../src/admin/statusHelper';

describe('statusHelper: parseCommitMessage', () => {
  it('parses single line commit message', () => {
    const res = parseCommitMessage('feat: add admin dashboard');
    expect(res.title).toBe('feat: add admin dashboard');
    expect(res.body).toBe('');
  });

  it('splits title and body on multiple lines', () => {
    const res = parseCommitMessage('fix: level generation\n\nDetailed explanation of the fix.');
    expect(res.title).toBe('fix: level generation');
    expect(res.body).toBe('Detailed explanation of the fix.');
  });
});

describe('statusHelper: formatRelativeTime', () => {
  const base = new Date('2026-08-21T12:00:00Z');

  it('formats seconds ago', () => {
    const d = new Date('2026-08-21T11:59:45Z').toISOString();
    expect(formatRelativeTime(d, base)).toBe('15 сек. назад');
  });

  it('formats just now', () => {
    const d = new Date('2026-08-21T11:59:58Z').toISOString();
    expect(formatRelativeTime(d, base)).toBe('только что');
  });

  it('formats minutes ago', () => {
    const d = new Date('2026-08-21T11:50:00Z').toISOString();
    expect(formatRelativeTime(d, base)).toBe('10 мин. назад');
  });

  it('formats hours ago', () => {
    const d = new Date('2026-08-21T09:00:00Z').toISOString();
    expect(formatRelativeTime(d, base)).toBe('3 ч. назад');
  });

  it('formats days ago', () => {
    const d = new Date('2026-08-19T12:00:00Z').toISOString();
    expect(formatRelativeTime(d, base)).toBe('2 дн. назад');
  });
});

describe('statusHelper: calculateDeploySyncState', () => {
  it('returns building when action is in_progress or queued', () => {
    const res = calculateDeploySyncState({
      headSha: 'abc12345',
      deployedSha: 'abc12345',
      latestRunStatus: 'in_progress',
    });
    expect(res.state).toBe('building');
  });

  it('returns failed when CI run failed', () => {
    const res = calculateDeploySyncState({
      headSha: 'abc12345',
      deployedSha: 'abc12345',
      latestRunConclusion: 'failure',
    });
    expect(res.state).toBe('failed');
  });

  it('returns synced when SHAs match and CI is successful', () => {
    const res = calculateDeploySyncState({
      headSha: 'abc1234567',
      deployedSha: 'abc1234888', // first 7 chars match: abc1234
      latestRunStatus: 'completed',
      latestRunConclusion: 'success',
    });
    expect(res.state).toBe('synced');
    expect(res.label).toBe('Актуален');
  });

  it('returns pending when SHAs do not match', () => {
    const res = calculateDeploySyncState({
      headSha: '1111111',
      deployedSha: '2222222',
      latestRunStatus: 'completed',
      latestRunConclusion: 'success',
    });
    expect(res.state).toBe('pending');
    expect(res.label).toBe('Ожидает деплоя');
  });
});

describe('statusHelper: findFailedStep', () => {
  it('finds failed step in workflow jobs', () => {
    const jobs: WorkflowJob[] = [
      {
        id: 1,
        name: 'check',
        status: 'completed',
        conclusion: 'success',
        steps: [{ name: 'Run check', status: 'completed', conclusion: 'success', number: 1 }],
      },
      {
        id: 2,
        name: 'build',
        status: 'completed',
        conclusion: 'failure',
        steps: [
          { name: 'npm ci', status: 'completed', conclusion: 'success', number: 1 },
          { name: 'npm run lint', status: 'completed', conclusion: 'failure', number: 2 },
        ],
      },
    ];

    const failed = findFailedStep(jobs);
    expect(failed).toEqual({
      jobName: 'build',
      stepName: 'npm run lint',
      conclusion: 'failure',
    });
  });

  it('returns null if all jobs succeeded', () => {
    const jobs: WorkflowJob[] = [
      {
        id: 1,
        name: 'check',
        status: 'completed',
        conclusion: 'success',
      },
    ];
    expect(findFailedStep(jobs)).toBeNull();
  });
});
