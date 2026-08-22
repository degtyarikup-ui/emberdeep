export interface WorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  number: number;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  steps?: WorkflowStep[];
  started_at?: string;
  completed_at?: string;
  html_url?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  html_url: string;
}

export interface GitHubRun {
  id: number;
  name: string;
  head_sha: string;
  head_branch: string;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'stale' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  jobs_url: string;
  actor?: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  head_commit?: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  } | null;
  display_title?: string;
  jobs?: WorkflowJob[];
}

export interface GitHubDeployment {
  id: number;
  sha: string;
  ref: string;
  task: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export type DeploySyncState = 'synced' | 'building' | 'deploying' | 'pending' | 'failed' | 'unknown';

export function resolveAuthorInfo(params: {
  login?: string;
  name?: string;
  email?: string;
}): {
  displayName: string;
  tag: string;
  colorType: 'gold' | 'blue' | 'default';
  isMrKadoku: boolean;
  isDegtyarik: boolean;
} {
  const loginLower = (params.login || '').toLowerCase();
  const emailLower = (params.email || '').toLowerCase();
  const nameLower = (params.name || '').toLowerCase();

  if (loginLower === 'mrkadoku' || emailLower.includes('ec1ipse') || nameLower.includes('kadoku')) {
    return {
      displayName: 'MrKadoku',
      tag: '@MrKadoku',
      colorType: 'blue',
      isMrKadoku: true,
      isDegtyarik: false,
    };
  }

  if (loginLower === 'degtyarikup-ui' || emailLower.includes('degtyarik') || nameLower.includes('degtyarik')) {
    return {
      displayName: 'degtyarikup-ui',
      tag: '@degtyarikup-ui',
      colorType: 'gold',
      isMrKadoku: false,
      isDegtyarik: true,
    };
  }

  const fallback = params.login || params.name || 'Developer';
  return {
    displayName: fallback,
    tag: `@${fallback}`,
    colorType: 'default',
    isMrKadoku: false,
    isDegtyarik: false,
  };
}

export function parseCommitMessage(message: string): { title: string; body: string } {
  const parts = message.split('\n');
  const title = parts[0]?.trim() ?? '';
  const body = parts.slice(1).join('\n').trim();
  return { title, body };
}

export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const target = new Date(dateString);
  const diffMs = now.getTime() - target.getTime();
  if (isNaN(diffMs)) return dateString;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return 'только что';
  if (seconds < 60) return `${seconds} сек. назад`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;

  return target.toISOString().slice(0, 10);
}

export function calculateDuration(startStr?: string, endStr?: string): string {
  if (!startStr) return '';
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  if (isNaN(start) || isNaN(end)) return '';

  const totalSec = Math.max(1, Math.round((end - start) / 1000));
  if (totalSec < 60) return `${totalSec}с`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}м ${secs}с`;
}

export function calculateDeploySyncState(params: {
  headSha?: string;
  deployedSha?: string;
  latestRunStatus?: string;
  latestRunConclusion?: string | null;
}): {
  state: DeploySyncState;
  label: string;
  description: string;
} {
  const { headSha, deployedSha, latestRunStatus, latestRunConclusion } = params;

  if (latestRunStatus === 'in_progress' || latestRunStatus === 'queued') {
    return {
      state: 'building',
      label: 'Идет сборка',
      description: 'GitHub Actions выполняет проверку и деплой.',
    };
  }

  if (latestRunConclusion === 'failure' || latestRunConclusion === 'timed_out' || latestRunConclusion === 'cancelled') {
    return {
      state: 'failed',
      label: 'Сборка упала',
      description: 'Последний запуск CI завершился ошибкой. Изменения не попали на сайт.',
    };
  }

  if (!headSha || !deployedSha) {
    return {
      state: 'unknown',
      label: 'Определяется...',
      description: 'Получение данных от GitHub API...',
    };
  }

  const shortHead = headSha.slice(0, 7);
  const shortDeployed = deployedSha.slice(0, 7);

  if (shortHead === shortDeployed) {
    return {
      state: 'synced',
      label: 'Актуален',
      description: `Сайт работает на последнем коммите (${shortDeployed}).`,
    };
  }

  return {
    state: 'pending',
    label: 'Ожидает деплоя',
    description: `На сайте коммит ${shortDeployed}, а в репозитории уже ${shortHead}. Деплой запустится по расписанию.`,
  };
}

export function findFailedStep(jobs: WorkflowJob[]): {
  jobName: string;
  stepName: string;
  conclusion: string;
} | null {
  for (const job of jobs) {
    if (job.conclusion === 'failure') {
      const failedStep = job.steps?.find((step) => step.conclusion === 'failure');
      return {
        jobName: job.name,
        stepName: failedStep ? failedStep.name : job.name,
        conclusion: 'failure',
      };
    }
  }
  return null;
}

export function getAllFailedSteps(jobs: WorkflowJob[]): Array<{
  jobName: string;
  stepName: string;
  number?: number;
}> {
  const result: Array<{ jobName: string; stepName: string; number?: number }> = [];
  for (const job of jobs) {
    if (job.conclusion === 'failure') {
      const failedSteps = job.steps?.filter((s) => s.conclusion === 'failure') ?? [];
      if (failedSteps.length > 0) {
        for (const step of failedSteps) {
          result.push({ jobName: job.name, stepName: step.name, number: step.number });
        }
      } else {
        result.push({ jobName: job.name, stepName: job.name });
      }
    }
  }
  return result;
}

export type TimelineEventType = 'commit' | 'run';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  dateStr: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  body?: string;
  status?: 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled';
  statusLabel?: string;
  sha?: string;
  url: string;
  duration?: string;
  isDeployed?: boolean;
  eventTrigger?: string;
  failedSteps?: Array<{ jobName: string; stepName: string }>;
  jobs?: WorkflowJob[];
}

export function buildTimeline(params: {
  commits: GitHubCommit[];
  runs: GitHubRun[];
  deployedSha?: string;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const commitMap = new Map<string, GitHubCommit>();

  for (const c of params.commits) {
    commitMap.set(c.sha, c);
    const authInfo = resolveAuthorInfo({
      login: c.author?.login,
      name: c.commit.author.name,
      email: c.commit.author.email,
    });
    const parsed = parseCommitMessage(c.commit.message);
    const isDeployed = params.deployedSha ? c.sha.startsWith(params.deployedSha.slice(0, 7)) : false;

    events.push({
      id: `commit-${c.sha}`,
      type: 'commit',
      date: new Date(c.commit.author.date),
      dateStr: c.commit.author.date,
      authorName: authInfo.displayName,
      authorAvatar:
        c.author?.avatar_url || (authInfo.isMrKadoku ? 'https://github.com/MrKadoku.png' : 'https://github.com/degtyarikup-ui.png'),
      title: parsed.title,
      body: parsed.body,
      sha: c.sha.slice(0, 7),
      url: c.html_url,
      isDeployed,
    });
  }

  for (const run of params.runs) {
    // If this was an automated scheduled check that skipped build, omit it from the timeline
    const buildJob = run.jobs?.find((j) => j.name.toLowerCase().includes('build'));
    const isSkippedByJob = buildJob && buildJob.conclusion === 'skipped';
    const isShortNoopSchedule = run.event === 'schedule' && run.conclusion === 'success' && (!run.jobs || isSkippedByJob);
    if (isSkippedByJob || isShortNoopSchedule) {
      continue;
    }

    const matchedCommit = run.head_sha ? commitMap.get(run.head_sha) : undefined;
    const authorParam = {
      login: matchedCommit?.author?.login || run.head_commit?.author?.name || (run.event === 'schedule' ? undefined : run.actor?.login),
      name: matchedCommit?.commit.author.name || run.head_commit?.author?.name || (run.event === 'schedule' ? undefined : run.actor?.login),
      email: matchedCommit?.commit.author.email || run.head_commit?.author?.email,
    };
    const actorInfo = resolveAuthorInfo(authorParam);
    const authorAvatar =
      matchedCommit?.author?.avatar_url ||
      (actorInfo.isMrKadoku ? 'https://github.com/MrKadoku.png' : actorInfo.isDegtyarik ? 'https://github.com/degtyarikup-ui.png' : (run.event === 'schedule' ? '' : run.actor?.avatar_url || ''));

    const isFailed = run.conclusion === 'failure';
    const isSuccess = run.conclusion === 'success';
    const isCancelled = run.conclusion === 'cancelled';
    const isRunning = run.status === 'in_progress';
    const isQueued = run.status === 'queued';
    const status = isSuccess
      ? 'success'
      : isFailed
        ? 'failure'
        : isRunning
          ? 'in_progress'
          : isCancelled
            ? 'cancelled'
            : isQueued
              ? 'queued'
              : 'cancelled';
    const statusLabel = isSuccess
      ? 'Сборка успешна'
      : isFailed
        ? 'Сборка упала'
        : isRunning
          ? 'Идет сборка'
          : isCancelled
            ? 'Отменена'
            : isQueued
              ? 'В очереди'
              : String(run.conclusion || run.status);
    const duration = calculateDuration(run.run_started_at || run.created_at, run.updated_at);
    const failedSteps = run.jobs ? getAllFailedSteps(run.jobs) : [];

    events.push({
      id: `run-${run.id}`,
      type: 'run',
      date: new Date(run.updated_at || run.created_at),
      dateStr: run.updated_at || run.created_at,
      authorName: actorInfo.displayName,
      authorAvatar,
      title: run.display_title || matchedCommit?.commit.message || run.name,
      status,
      statusLabel,
      sha: run.head_sha ? run.head_sha.slice(0, 7) : undefined,
      url: run.html_url,
      duration,
      eventTrigger: run.event === 'schedule' ? 'auto-deploy' : run.event,
      failedSteps,
      jobs: run.jobs,
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
