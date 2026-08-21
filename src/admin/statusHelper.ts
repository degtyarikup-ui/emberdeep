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
      description: 'GitHub Actions в процессе выполнения проверки и сборки.',
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
