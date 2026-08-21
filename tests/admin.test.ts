import { describe, it, expect } from 'vitest';
import {
  buildTimeline,
  calculateDeploySyncState,
  calculateDuration,
  findFailedStep,
  formatRelativeTime,
  getAllFailedSteps,
  parseCommitMessage,
  resolveAuthorInfo,
  type GitHubCommit,
  type GitHubRun,
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

describe('statusHelper: calculateDuration', () => {
  it('calculates seconds duration', () => {
    const start = '2026-08-21T12:00:00Z';
    const end = '2026-08-21T12:00:35Z';
    expect(calculateDuration(start, end)).toBe('35с');
  });

  it('calculates minutes and seconds duration', () => {
    const start = '2026-08-21T12:00:00Z';
    const end = '2026-08-21T12:01:25Z';
    expect(calculateDuration(start, end)).toBe('1м 25с');
  });

  it('returns empty string on empty input', () => {
    expect(calculateDuration(undefined)).toBe('');
  });
});

describe('statusHelper: getAllFailedSteps', () => {
  it('returns list of all failed steps', () => {
    const jobs: WorkflowJob[] = [
      {
        id: 1,
        name: 'build',
        status: 'completed',
        conclusion: 'failure',
        steps: [
          { name: 'npm ci', status: 'completed', conclusion: 'success', number: 1 },
          { name: 'npm run lint', status: 'completed', conclusion: 'failure', number: 2 },
          { name: 'npm run test', status: 'completed', conclusion: 'failure', number: 3 },
        ],
      },
    ];

    const result = getAllFailedSteps(jobs);
    expect(result).toEqual([
      { jobName: 'build', stepName: 'npm run lint', number: 2 },
      { jobName: 'build', stepName: 'npm run test', number: 3 },
    ]);
  });
});

describe('statusHelper: resolveAuthorInfo', () => {
  it('resolves degtyarikup-ui', () => {
    const res = resolveAuthorInfo({ login: 'degtyarikup-ui', email: 'degtyarik.up@gmail.com' });
    expect(res.displayName).toBe('degtyarikup-ui');
    expect(res.tag).toBe('@degtyarikup-ui');
    expect(res.colorType).toBe('gold');
    expect(res.isDegtyarik).toBe(true);
    expect(res.isMrKadoku).toBe(false);
  });

  it('resolves MrKadoku by login and email', () => {
    const res = resolveAuthorInfo({ login: 'MrKadoku', email: 'ec1ipse_god@mail.ru' });
    expect(res.displayName).toBe('MrKadoku');
    expect(res.tag).toBe('@MrKadoku');
    expect(res.colorType).toBe('blue');
    expect(res.isMrKadoku).toBe(true);
    expect(res.isDegtyarik).toBe(false);
  });
});

describe('statusHelper: buildTimeline', () => {
  it('combines commits and runs chronologically', () => {
    const commits: GitHubCommit[] = [
      {
        sha: 'aaa1111',
        commit: {
          message: 'feat: add first feature',
          author: { name: 'degtyarikup-ui', email: 'degtyarik.up@gmail.com', date: '2026-08-21T10:00:00Z' },
        },
        author: { login: 'degtyarikup-ui', avatar_url: '', html_url: '' },
        html_url: 'https://github.com/.../aaa1111',
      },
      {
        sha: 'bbb2222',
        commit: {
          message: 'feat: add second feature',
          author: { name: 'MrKadoku', email: 'ec1ipse_god@mail.ru', date: '2026-08-21T12:00:00Z' },
        },
        author: { login: 'MrKadoku', avatar_url: '', html_url: '' },
        html_url: 'https://github.com/.../bbb2222',
      },
    ];

    const runs: GitHubRun[] = [
      {
        id: 101,
        name: 'Deploy',
        head_sha: 'aaa1111',
        head_branch: 'main',
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/.../run/101',
        created_at: '2026-08-21T10:02:00Z',
        updated_at: '2026-08-21T10:03:00Z',
        jobs_url: '',
      },
    ];

    const timeline = buildTimeline({ commits, runs, deployedSha: 'bbb2222' });
    expect(timeline.length).toBe(3);
    expect(timeline[0].id).toBe('commit-bbb2222'); // 12:00
    expect(timeline[0].isDeployed).toBe(true);
    expect(timeline[1].id).toBe('run-101'); // 10:03
    expect(timeline[2].id).toBe('commit-aaa1111'); // 10:00
  });

  it('attributes build to the commit author (e.g. MrKadoku)', () => {
    const commits: GitHubCommit[] = [
      {
        sha: 'kadoku1',
        commit: {
          message: 'feat: add dark forest expansion',
          author: { name: 'MrKadoku', email: 'ec1ipse_god@mail.ru', date: '2026-08-21T12:26:00Z' },
        },
        author: { login: 'MrKadoku', avatar_url: 'https://github.com/MrKadoku.png', html_url: '' },
        html_url: 'https://github.com/.../kadoku1',
      },
    ];

    const runs: GitHubRun[] = [
      {
        id: 202,
        name: 'Deploy',
        head_sha: 'kadoku1',
        head_branch: 'main',
        event: 'workflow_dispatch',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/.../run/202',
        created_at: '2026-08-21T12:27:00Z',
        updated_at: '2026-08-21T12:28:00Z',
        jobs_url: '',
      },
    ];

    const timeline = buildTimeline({ commits, runs });
    expect(timeline[0].id).toBe('run-202');
    expect(timeline[0].authorName).toBe('MrKadoku');
    expect(timeline[0].authorAvatar).toBe('https://github.com/MrKadoku.png');
  });

  it('omits empty scheduled checks where build was skipped', () => {
    const commits: GitHubCommit[] = [];
    const runs: GitHubRun[] = [
      {
        id: 303,
        name: 'Deploy',
        head_sha: 'any111',
        head_branch: 'main',
        event: 'schedule',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/.../run/303',
        created_at: '2026-08-21T14:00:00Z',
        updated_at: '2026-08-21T14:00:08Z',
        jobs_url: '',
        jobs: [
          { id: 1, name: 'check', status: 'completed', conclusion: 'success' },
          { id: 2, name: 'build', status: 'completed', conclusion: 'skipped' },
        ],
      },
    ];

    const timeline = buildTimeline({ commits, runs });
    expect(timeline.length).toBe(0);
  });
});


