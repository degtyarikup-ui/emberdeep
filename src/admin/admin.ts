import './admin.css';
import {
  calculateDeploySyncState,
  findFailedStep,
  formatRelativeTime,
  parseCommitMessage,
  type GitHubCommit,
  type GitHubDeployment,
  type GitHubRun,
  type WorkflowJob,
} from './statusHelper';

const REPO_OWNER = 'degtyarikup-ui';
const REPO_NAME = 'emberdeep';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const TOKEN_KEY = 'emberdeep_gh_token';
const AUTH_KEY = 'emberdeep_admin_auth';
const REQUIRED_PIN = '2255';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(url: string): Promise<{ data: T | null; rateLimitRemaining?: string; error?: string }> {
  try {
    const res = await fetch(url, { headers: getAuthHeader() });
    const rateLimitRemaining = res.headers.get('x-ratelimit-remaining') || undefined;

    if (!res.ok) {
      if (res.status === 403) {
        return {
          data: null,
          rateLimitRemaining,
          error: 'Лимит запросов GitHub API исчерпан (403). Укажите GitHub Token в настройках ниже.',
        };
      }
      return {
        data: null,
        rateLimitRemaining,
        error: `Ошибка GitHub API: HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as T;
    return { data, rateLimitRemaining };
  } catch (err) {
    return {
      data: null,
      error: `Сетевая ошибка: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

interface DashboardState {
  commits: GitHubCommit[];
  latestRun: GitHubRun | null;
  latestJobs: WorkflowJob[];
  deployments: GitHubDeployment[];
  rateLimitRemaining: string;
  errorMessage: string | null;
  lastLoadedTime: string;
}

class DashboardManager {
  private state: DashboardState = {
    commits: [],
    latestRun: null,
    latestJobs: [],
    deployments: [],
    rateLimitRemaining: '—',
    errorMessage: null,
    lastLoadedTime: '',
  };

  private isAuthenticated = false;
  private isFetching = false;
  private refreshTimer: number | null = null;
  private countdownInterval: number | null = null;
  private secondsUntilNextRefresh = 30;

  constructor() {
    this.isAuthenticated = localStorage.getItem(AUTH_KEY) === REQUIRED_PIN;
  }

  public init(): void {
    if (this.isAuthenticated) {
      void this.refresh();
    } else {
      this.renderLockScreen();
    }
  }

  public tryLogin(pin: string): boolean {
    if (pin.trim() === REQUIRED_PIN) {
      this.isAuthenticated = true;
      localStorage.setItem(AUTH_KEY, REQUIRED_PIN);
      void this.refresh();
      return true;
    }
    return false;
  }

  public logout(): void {
    this.isAuthenticated = false;
    localStorage.removeItem(AUTH_KEY);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.renderLockScreen();
  }

  public async refresh(): Promise<void> {
    if (!this.isAuthenticated) {
      this.renderLockScreen();
      return;
    }

    if (this.isFetching) return;
    this.isFetching = true;
    this.updateRefreshButton(true);

    try {
      const [commitsRes, runsRes, deploysRes] = await Promise.all([
        apiFetch<GitHubCommit[]>(`${API_BASE}/commits?per_page=15`),
        apiFetch<{ workflow_runs: GitHubRun[] }>(`${API_BASE}/actions/runs?per_page=5`),
        apiFetch<GitHubDeployment[]>(`${API_BASE}/deployments?environment=github-pages&per_page=5`),
      ]);

      const latestRun = runsRes.data?.workflow_runs ? runsRes.data.workflow_runs[0] ?? null : this.state.latestRun;

      let latestJobs: WorkflowJob[] = [];
      if (latestRun && latestRun.conclusion === 'failure') {
        const jobsRes = await apiFetch<{ jobs: WorkflowJob[] }>(latestRun.jobs_url);
        if (jobsRes.data?.jobs) {
          latestJobs = jobsRes.data.jobs;
        }
      }

      this.state = {
        commits: commitsRes.data ?? this.state.commits,
        rateLimitRemaining: commitsRes.rateLimitRemaining ?? this.state.rateLimitRemaining,
        latestRun,
        deployments: deploysRes.data ?? this.state.deployments,
        errorMessage: commitsRes.error || runsRes.error || deploysRes.error || null,
        latestJobs,
        lastLoadedTime: new Date().toLocaleTimeString(),
      };
    } finally {
      this.isFetching = false;
      this.updateRefreshButton(false);
      this.renderDashboard();
      this.scheduleNextRefresh();
    }
  }

  private scheduleNextRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const isBuilding =
      this.state.latestRun?.status === 'in_progress' || this.state.latestRun?.status === 'queued';
    this.secondsUntilNextRefresh = isBuilding ? 10 : 30;

    this.updateCountdownDisplay();

    this.countdownInterval = window.setInterval(() => {
      this.secondsUntilNextRefresh--;
      if (this.secondsUntilNextRefresh <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
      }
      this.updateCountdownDisplay();
    }, 1000);

    this.refreshTimer = window.setTimeout(() => {
      void this.refresh();
    }, this.secondsUntilNextRefresh * 1000);
  }

  private updateCountdownDisplay(): void {
    const el = document.getElementById('auto-refresh-counter');
    if (el) {
      el.textContent = `Обновление через ${Math.max(0, this.secondsUntilNextRefresh)}с`;
    }
  }

  private updateRefreshButton(loading: boolean): void {
    const btn = document.getElementById('refresh-btn') as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.innerHTML = '<span class="loading-spinner"></span> Обновление...';
    } else {
      btn.innerHTML = 'Обновить данные';
    }
  }

  public renderLockScreen(errorMessage = ''): void {
    const root = document.getElementById('admin-app');
    if (!root) return;

    root.innerHTML = `
      <div class="lock-screen-container">
        <div id="lock-card" class="lock-card ${errorMessage ? 'shake' : ''}">
          <div class="lock-logo">E</div>
          <h2 class="lock-title">Emberdeep Admin</h2>
          <div class="lock-subtitle">Доступ для разработчиков. Введите 4-значный PIN-код:</div>
          <form class="pin-form" onsubmit="window.__adminSubmitPin(event)">
            <input
              id="pin-input"
              type="password"
              maxlength="4"
              inputmode="numeric"
              pattern="[0-9]*"
              class="pin-input"
              placeholder="••••"
              autofocus
            />
            <div id="pin-error" class="lock-error">${escapeHtml(errorMessage)}</div>
            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px;">
              Войти
            </button>
          </form>
        </div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById('pin-input') as HTMLInputElement | null;
      input?.focus();
    }, 50);
  }

  public renderDashboard(): void {
    const root = document.getElementById('admin-app');
    if (!root) return;

    const headCommit = this.state.commits[0];
    const headSha = headCommit?.sha;
    const deployedSha = this.state.deployments[0]?.sha;

    const syncState = calculateDeploySyncState({
      headSha,
      deployedSha,
      latestRunStatus: this.state.latestRun?.status,
      latestRunConclusion: this.state.latestRun?.conclusion,
    });

    const failedStep =
      this.state.latestRun?.conclusion === 'failure' ? findFailedStep(this.state.latestJobs) : null;

    let badgeClass = 'badge-pending';
    if (syncState.state === 'synced') badgeClass = 'badge-success';
    else if (syncState.state === 'failed') badgeClass = 'badge-failure';
    else if (syncState.state === 'building') badgeClass = 'badge-running';

    const savedToken = localStorage.getItem(TOKEN_KEY) || '';

    const lastAuthorAvatar =
      headCommit?.author?.avatar_url ||
      'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    const lastAuthorLogin = headCommit?.author?.login || headCommit?.commit.author.name || 'Неизвестно';
    const lastAuthorName = headCommit?.commit.author.name || '';
    const lastAuthorDisplay =
      lastAuthorLogin === lastAuthorName || !lastAuthorName
        ? `@${lastAuthorLogin}`
        : `@${lastAuthorLogin} (${lastAuthorName})`;
    const lastCommitTitle = headCommit ? parseCommitMessage(headCommit.commit.message).title : '';
    const lastCommitTime = headCommit ? formatRelativeTime(headCommit.commit.author.date) : '';

    root.innerHTML = `
      <div class="dashboard-container">
        <header class="dashboard-header">
          <div class="header-brand">
            <div class="logo-icon">E</div>
            <div>
              <h1 class="header-title">Emberdeep — Панель версий</h1>
              <div class="header-subtitle">Отслеживание пушей, сборок GitHub Actions и деплоев на Pages</div>
            </div>
          </div>
          <div class="header-actions">
            <a href="./" class="btn">Открыть игру</a>
            <button id="refresh-btn" class="btn btn-primary" onclick="window.__adminRefresh()">
              Обновить данные
            </button>
            <button class="btn" onclick="window.__adminLogout()" title="Выйти из админки">
              Выйти
            </button>
          </div>
        </header>

        ${
          headCommit
            ? `
          <div class="author-hero-banner">
            <div class="author-hero-left">
              <img class="author-hero-avatar" src="${lastAuthorAvatar}" alt="${escapeHtml(lastAuthorLogin)}" />
              <div class="author-hero-info">
                <div class="author-hero-label">Последний пуш сделал:</div>
                <div class="author-hero-name">
                  ${escapeHtml(lastAuthorDisplay)}
                  <span class="author-pill">HEAD</span>
                </div>
                <div class="author-hero-message" title="${escapeHtml(headCommit.commit.message)}">
                  «${escapeHtml(lastCommitTitle)}»
                </div>
              </div>
            </div>
            <div class="author-hero-right">
              <div style="display: flex; gap: 8px; align-items: center;">
                <a class="sha-tag" href="${headCommit.html_url}" target="_blank">${headSha?.slice(0, 7)}</a>
                <span class="badge ${badgeClass}"><span class="badge-dot"></span>${escapeHtml(syncState.label)}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted);">${lastCommitTime}</div>
            </div>
          </div>
        `
            : ''
        }

        ${
          this.state.errorMessage
            ? `
          <div class="alert-banner">
            <div class="alert-title">Внимание при загрузке</div>
            <div class="alert-content">${escapeHtml(this.state.errorMessage)}</div>
          </div>
        `
            : ''
        }

        <div class="status-grid">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Статус деплоя</span>
              <span class="badge ${badgeClass}">
                <span class="badge-dot"></span>
                ${escapeHtml(syncState.label)}
              </span>
            </div>
            <div class="card-main-stat">
              ${
                deployedSha
                  ? `<a class="sha-tag" href="https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${deployedSha}" target="_blank">${deployedSha.slice(0, 7)}</a>`
                  : '—'
              }
            </div>
            <div class="card-desc">${escapeHtml(syncState.description)}</div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Автор последнего пуша</span>
              <span class="badge badge-pending">Main</span>
            </div>
            <div class="card-main-stat" style="font-size: 17px; font-weight: 600;">
              ${escapeHtml(lastAuthorLogin)}
            </div>
            <div class="card-desc">
              ${headCommit ? `${lastCommitTime} · ${headSha?.slice(0, 7)}` : 'Нет данных'}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">GitHub Actions CI</span>
              ${
                this.state.latestRun
                  ? `
                <span class="badge ${this.state.latestRun.conclusion === 'success' ? 'badge-success' : this.state.latestRun.status === 'in_progress' ? 'badge-running' : this.state.latestRun.conclusion === 'failure' ? 'badge-failure' : 'badge-pending'}">
                  <span class="badge-dot"></span>
                  ${this.state.latestRun.status === 'in_progress' ? 'Сборка' : this.state.latestRun.conclusion === 'success' ? 'Успешно' : this.state.latestRun.conclusion === 'failure' ? 'Ошибка' : this.state.latestRun.status}
                </span>
              `
                  : ''
              }
            </div>
            <div class="card-main-stat" style="font-size: 16px;">
              ${
                this.state.latestRun
                  ? `<a href="${this.state.latestRun.html_url}" target="_blank" style="color: inherit; text-decoration: none;">Run #${this.state.latestRun.id}</a>`
                  : '—'
              }
            </div>
            <div class="card-desc">
              ${
                this.state.latestRun
                  ? `Событие: ${this.state.latestRun.event} · ${formatRelativeTime(this.state.latestRun.updated_at)}`
                  : 'Нет запусков'
              }
            </div>
          </div>
        </div>

        ${
          failedStep
            ? `
          <div class="alert-banner">
            <div class="alert-title">Ошибка при сборке в GitHub Actions</div>
            <div class="alert-content">
              Упал шаг: <strong>${escapeHtml(failedStep.stepName)}</strong> (Job: ${escapeHtml(failedStep.jobName)})<br />
              <a href="${this.state.latestRun?.html_url}" target="_blank" style="color: #fff; text-decoration: underline; margin-top: 6px; display: inline-block;">
                Открыть логи ошибки на GitHub Actions &rarr;
              </a>
            </div>
          </div>
        `
            : ''
        }

        <div class="section-title">История коммитов и пушей</div>

        <div class="commit-list">
          ${
            this.state.commits.length === 0
              ? '<div class="card-desc">Загрузка коммитов...</div>'
              : this.state.commits
                  .map((c) => {
                    const { title } = parseCommitMessage(c.commit.message);
                    const isDeployed = deployedSha && c.sha.startsWith(deployedSha.slice(0, 7));
                    const avatar =
                      c.author?.avatar_url ||
                      'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                    const authorLogin = c.author?.login || c.commit.author.name;
                    const authorName = c.commit.author.name;
                    const authorLabel =
                      authorLogin === authorName ? authorLogin : `${authorLogin} (${authorName})`;

                    return `
              <div class="commit-item ${isDeployed ? 'is-deployed' : ''}">
                <div class="commit-left">
                  <img class="author-avatar" src="${avatar}" alt="${escapeHtml(authorLogin)}" />
                  <div class="commit-details">
                    <div class="commit-message-title" title="${escapeHtml(c.commit.message)}">${escapeHtml(title)}</div>
                    <div class="commit-meta">
                      <span class="author-pill">${escapeHtml(authorLabel)}</span>
                      <span>·</span>
                      <span>${formatRelativeTime(c.commit.author.date)}</span>
                    </div>
                  </div>
                </div>
                <div class="commit-right">
                  ${isDeployed ? '<span class="deployed-chip">Сейчас на сайте</span>' : ''}
                  <a class="sha-tag" href="${c.html_url}" target="_blank">${c.sha.slice(0, 7)}</a>
                </div>
              </div>
            `;
                  })
                  .join('')
          }
        </div>

        <details class="settings-box">
          <summary style="cursor: pointer; font-weight: 600; color: var(--accent-gold); font-size: 13px;">
            Настройки GitHub API Token (опционально)
          </summary>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
            Если исчерпан публичный лимит (60 запросов/час), вы можете ввести GitHub Personal Access Token (classic или fine-grained с правами чтения). Он сохраняется только в вашем браузере (localStorage).
          </div>
          <div class="settings-row" style="margin-top: 8px;">
            <input
              id="gh-token-input"
              type="password"
              class="token-input"
              placeholder="ghp_..."
              value="${escapeHtml(savedToken)}"
            />
            <button class="btn" onclick="window.__adminSaveToken()">Сохранить</button>
            <button class="btn" onclick="window.__adminClearToken()">Сбросить</button>
          </div>
        </details>

        <footer class="footer-info">
          <div>
            Репозиторий: <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}" target="_blank">${REPO_OWNER}/${REPO_NAME}</a>
            <span> · </span>
            Осталось запросов API: <strong>${escapeHtml(this.state.rateLimitRemaining)}</strong>
          </div>
          <div id="auto-refresh-counter">Обновление через ${this.secondsUntilNextRefresh}с</div>
        </footer>
      </div>
    `;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const dashboard = new DashboardManager();

// Global hooks for inline event handlers
declare global {
  interface Window {
    __adminRefresh: () => void;
    __adminLogout: () => void;
    __adminSubmitPin: (event: Event) => void;
    __adminSaveToken: () => void;
    __adminClearToken: () => void;
  }
}

window.__adminRefresh = () => {
  void dashboard.refresh();
};

window.__adminLogout = () => {
  dashboard.logout();
};

window.__adminSubmitPin = (event: Event) => {
  event.preventDefault();
  const input = document.getElementById('pin-input') as HTMLInputElement | null;
  const pin = input?.value || '';
  const success = dashboard.tryLogin(pin);
  if (!success) {
    dashboard.renderLockScreen('Неверный PIN-код. Попробуйте еще раз.');
  }
};

window.__adminSaveToken = () => {
  const input = document.getElementById('gh-token-input') as HTMLInputElement | null;
  const token = input?.value.trim() || '';
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  void dashboard.refresh();
};

window.__adminClearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  const input = document.getElementById('gh-token-input') as HTMLInputElement | null;
  if (input) input.value = '';
  void dashboard.refresh();
};

// Initial boot
dashboard.init();
