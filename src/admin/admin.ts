import './admin.css';
import { ICONS } from './icons';
import { MapEditor } from './mapEditor';
import {
  buildTimeline,
  calculateDeploySyncState,
  formatRelativeTime,
  resolveAuthorInfo,
  type GitHubCommit,
  type GitHubDeployment,
  type GitHubRun,
  type TimelineEvent,
  type WorkflowJob,
} from './statusHelper';

const REPO_OWNER = 'degtyarikup-ui';
const REPO_NAME = 'emberdeep';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const TOKEN_KEY = 'emberdeep_gh_token';
const AUTH_KEY = 'emberdeep_admin_auth';
const REQUIRED_PIN = '2255';

type EventFilter = 'all' | 'commits' | 'runs' | 'errors' | 'degtyarikup-ui' | 'MrKadoku';

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
          error: 'Лимит запросов GitHub API исчерпан (403). Укажите GitHub Token в настройках.',
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
  runs: GitHubRun[];
  deployments: GitHubDeployment[];
  rateLimitRemaining: string;
  errorMessage: string | null;
  lastLoadedTime: string;
  activeFilter: EventFilter;
}

class DashboardManager {
  private state: DashboardState = {
    commits: [],
    runs: [],
    deployments: [],
    rateLimitRemaining: '—',
    errorMessage: null,
    lastLoadedTime: '',
    activeFilter: 'all',
  };

  private isAuthenticated = false;
  private isFetching = false;
  private refreshTimer: number | null = null;
  private countdownInterval: number | null = null;
  private secondsUntilNextRefresh = 30;
  private activeTab: 'cicd' | 'map' = (localStorage.getItem('emberdeep_admin_tab') as 'cicd' | 'map') || 'map';

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

  public switchTab(tab: 'cicd' | 'map'): void {
    this.activeTab = tab;
    localStorage.setItem('emberdeep_admin_tab', tab);
    this.renderDashboard();
  }

  public setFilter(filter: EventFilter): void {
    this.state.activeFilter = filter;
    this.renderDashboard();
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
        apiFetch<GitHubCommit[]>(`${API_BASE}/commits?per_page=35`),
        apiFetch<{ workflow_runs: GitHubRun[] }>(`${API_BASE}/actions/runs?per_page=15`),
        apiFetch<GitHubDeployment[]>(`${API_BASE}/deployments?environment=github-pages&per_page=5`),
      ]);

      const runs = runsRes.data?.workflow_runs ?? this.state.runs;

      const runsWithJobs = await Promise.all(
        runs.map(async (run) => {
          if (run.conclusion === 'failure' || run.status === 'in_progress' || run.event === 'schedule') {
            const jobsRes = await apiFetch<{ jobs: WorkflowJob[] }>(run.jobs_url);
            if (jobsRes.data?.jobs) {
              return { ...run, jobs: jobsRes.data.jobs };
            }
          }
          return run;
        })
      );

      this.state = {
        ...this.state,
        commits: commitsRes.data ?? this.state.commits,
        runs: runsWithJobs,
        rateLimitRemaining: commitsRes.rateLimitRemaining ?? this.state.rateLimitRemaining,
        deployments: deploysRes.data ?? this.state.deployments,
        errorMessage: commitsRes.error || runsRes.error || deploysRes.error || null,
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

    const latestRun = this.state.runs[0];
    const isBuilding = latestRun?.status === 'in_progress' || latestRun?.status === 'queued';
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
      btn.innerHTML = `${ICONS.refresh} Обновить`;
    }
  }

  public renderLockScreen(errorMessage = ''): void {
    const root = document.getElementById('admin-app');
    if (!root) return;

    root.innerHTML = `
      <div class="lock-screen-container">
        <div id="lock-card" class="lock-card ${errorMessage ? 'shake' : ''}">
          <div style="color: var(--text-secondary); margin-bottom: 2px;">${ICONS.lock}</div>
          <h2 class="lock-title">Emberdeep Admin</h2>
          <div class="lock-subtitle">Введите 4-значный PIN-код</div>
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
            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 8px;">
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
    const latestRun = this.state.runs[0] ?? null;

    const syncState = calculateDeploySyncState({
      headSha,
      deployedSha,
      latestRunStatus: latestRun?.status,
      latestRunConclusion: latestRun?.conclusion,
    });

    const savedToken = localStorage.getItem(TOKEN_KEY) || '';

    const headAuthorInfo = resolveAuthorInfo({
      login: headCommit?.author?.login,
      name: headCommit?.commit.author.name,
      email: headCommit?.commit.author.email,
    });

    const allEvents = buildTimeline({
      commits: this.state.commits,
      runs: this.state.runs,
      deployedSha,
    });

    const filteredEvents = allEvents.filter((ev) => {
      if (this.state.activeFilter === 'all') return true;
      if (this.state.activeFilter === 'commits') return ev.type === 'commit';
      if (this.state.activeFilter === 'runs') return ev.type === 'run';
      if (this.state.activeFilter === 'errors') return ev.type === 'run' && ev.status === 'failure';
      if (this.state.activeFilter === 'degtyarikup-ui') {
        const info = resolveAuthorInfo({ login: ev.authorName });
        return info.isDegtyarik;
      }
      if (this.state.activeFilter === 'MrKadoku') {
        const info = resolveAuthorInfo({ login: ev.authorName });
        return info.isMrKadoku;
      }
      return true;
    });

    const errorRunsCount = this.state.runs.filter((r) => r.conclusion === 'failure').length;

    let dotClass = 'dot-pending';
    if (syncState.state === 'synced') dotClass = 'dot-success';
    else if (syncState.state === 'failed') dotClass = 'dot-error';
    else if (syncState.state === 'building') dotClass = 'dot-running';

    root.innerHTML = `
      <div class="dashboard-container ${this.activeTab === 'map' ? 'map-mode' : ''}">
        <header class="dashboard-header">
          <div class="header-brand">
            <h1 class="header-title">Emberdeep</h1>
            <div class="admin-tabs-nav">
              <button class="admin-tab-nav-btn ${this.activeTab === 'cicd' ? 'active' : ''}" onclick="window.__adminSwitchTab('cicd')">
                ${ICONS.terminal} CI/CD и Релизы
              </button>
              <button class="admin-tab-nav-btn ${this.activeTab === 'map' ? 'active' : ''}" onclick="window.__adminSwitchTab('map')">
                ${ICONS.map} Конструктор карт
              </button>
            </div>
          </div>
          <div class="header-actions">
            <a href="./" class="btn">${ICONS.play} Игра</a>
            ${
              this.activeTab === 'cicd'
                ? `
              <button id="refresh-btn" class="btn btn-primary" onclick="window.__adminRefresh()">
                ${ICONS.refresh} Обновить
              </button>
            `
                : ''
            }
            <button class="btn" onclick="window.__adminLogout()" title="Выйти">
              ${ICONS.logout} Выйти
            </button>
          </div>
        </header>

        ${
          this.activeTab === 'map'
            ? `
          <div id="map-editor-mount" style="width: 100%;"></div>
        `
            : `
          <div class="status-summary-bar">
            <div class="summary-item">
              <span style="display: flex; align-items: center; gap: 4px; color: var(--text-tertiary);">
                ${ICONS.globe} Сайт:
              </span>
              <span class="badge-dot ${dotClass}"></span>
              <span class="summary-value">${escapeHtml(syncState.label)}</span>
              ${deployedSha ? `<a class="sha-tag" href="https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${deployedSha}" target="_blank">${deployedSha.slice(0, 7)}</a>` : ''}
            </div>
            <div class="summary-item">
              <span style="display: flex; align-items: center; gap: 4px; color: var(--text-tertiary);">
                ${ICONS.commit} Последний:
              </span>
              <span class="summary-value">${escapeHtml(headAuthorInfo.displayName)}</span>
              ${headSha ? `<a class="sha-tag" href="${headCommit?.html_url}" target="_blank">${headSha.slice(0, 7)}</a>` : ''}
            </div>
            <div class="summary-item">
              <span style="display: flex; align-items: center; gap: 4px; color: var(--text-tertiary);">
                ${ICONS.activity} CI:
              </span>
              <span class="summary-value">${latestRun ? (latestRun.conclusion === 'success' ? 'Успешно' : latestRun.conclusion === 'failure' ? 'Ошибка' : latestRun.status) : '—'}</span>
            </div>
          </div>

          ${
            this.state.errorMessage
              ? `
            <div class="timeline-error-box" style="margin-bottom: 8px;">
              ${escapeHtml(this.state.errorMessage)}
            </div>
          `
              : ''
          }

          <div class="filter-bar">
            <button class="filter-btn ${this.state.activeFilter === 'all' ? 'active' : ''}" onclick="window.__adminSetFilter('all')">
              ${ICONS.layers} Все (${allEvents.length})
            </button>
            <button class="filter-btn ${this.state.activeFilter === 'commits' ? 'active' : ''}" onclick="window.__adminSetFilter('commits')">
              ${ICONS.commit} Коммиты (${this.state.commits.length})
            </button>
            <button class="filter-btn ${this.state.activeFilter === 'runs' ? 'active' : ''}" onclick="window.__adminSetFilter('runs')">
              ${ICONS.terminal} Сборки (${this.state.runs.length})
            </button>
            ${
              errorRunsCount > 0
                ? `
              <button class="filter-btn ${this.state.activeFilter === 'errors' ? 'active' : ''}" onclick="window.__adminSetFilter('errors')" style="color: #ef4444;">
                ${ICONS.alert} Ошибки (${errorRunsCount})
              </button>
            `
                : ''
            }
            <span style="color: var(--text-tertiary); font-size: 11px; margin: 0 4px;">|</span>
            <button class="filter-btn ${this.state.activeFilter === 'degtyarikup-ui' ? 'active' : ''}" onclick="window.__adminSetFilter('degtyarikup-ui')">
              ${ICONS.user} degtyarikup-ui
            </button>
            <button class="filter-btn ${this.state.activeFilter === 'MrKadoku' ? 'active' : ''}" onclick="window.__adminSetFilter('MrKadoku')">
              ${ICONS.user} MrKadoku
            </button>
          </div>

          <div class="timeline-feed">
            ${
              filteredEvents.length === 0
                ? '<div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px;">Нет событий по выбранному фильтру.</div>'
                : filteredEvents.map((ev) => renderTimelineRow(ev)).join('')
            }
          </div>

          <details class="settings-box">
            <summary style="cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
              ${ICONS.key} GitHub API Token (опционально)
            </summary>
            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;">
              Укажите персональный токен, если исчерпан лимит 60 запросов/час.
            </div>
            <div class="settings-row">
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
              <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}" target="_blank">${REPO_OWNER}/${REPO_NAME}</a>
              <span> · </span>
              Лимит API: <strong>${escapeHtml(this.state.rateLimitRemaining)}</strong>
            </div>
            <div id="auto-refresh-counter">Обновление через ${this.secondsUntilNextRefresh}с</div>
          </footer>
        `
        }
      </div>
    `;

    if (this.activeTab === 'map') {
      const mountEl = document.getElementById('map-editor-mount');
      if (mountEl) {
        new MapEditor(mountEl).init();
      }
    }
  }
}

function renderTimelineRow(ev: TimelineEvent): string {
  if (ev.type === 'commit') {
    return `
      <div class="timeline-row ${ev.isDeployed ? 'is-deployed' : ''}">
        <div class="timeline-left">
          <img class="avatar-icon" src="${ev.authorAvatar}" alt="" />
          <div class="timeline-content">
            <div class="timeline-title-line">
              <span class="type-pill" style="display: inline-flex; align-items: center; gap: 3px;">
                ${ICONS.commit} коммит
              </span>
              <span class="timeline-title">${escapeHtml(ev.title)}</span>
              ${ev.isDeployed ? '<span class="deployed-chip">На сайте</span>' : ''}
            </div>
            <div class="timeline-meta">
              <span class="author-name">${escapeHtml(ev.authorName)}</span>
              <span>·</span>
              <span>${formatRelativeTime(ev.dateStr)}</span>
            </div>
          </div>
        </div>
        <div class="timeline-right">
          <a class="sha-tag" href="${ev.url}" target="_blank">${ev.sha}</a>
        </div>
      </div>
    `;
  }

  // Workflow run
  const isFailed = ev.status === 'failure';
  const isSuccess = ev.status === 'success';
  const isRunning = ev.status === 'in_progress' || ev.status === 'queued';
  const statusBadgeClass = isSuccess
    ? 'avatar-status-success'
    : isFailed
      ? 'avatar-status-error'
      : isRunning
        ? 'avatar-status-running'
        : 'avatar-status-pending';

  return `
    <div class="timeline-row ${isFailed ? 'is-failed' : isRunning ? 'is-running' : ''}">
      <div class="timeline-left">
        <div class="avatar-wrapper">
          <img class="avatar-icon" src="${ev.authorAvatar}" alt="" />
          <span class="avatar-status-badge ${statusBadgeClass}"></span>
        </div>
        <div class="timeline-content">
          <div class="timeline-title-line">
            <span class="type-pill" style="display: inline-flex; align-items: center; gap: 3px;">
              ${ICONS.terminal} сборка
            </span>
            <span class="timeline-title">${escapeHtml(ev.title)}</span>
            <span style="font-size: 11px; color: ${isSuccess ? 'var(--color-success)' : isFailed ? 'var(--color-error)' : isRunning ? 'var(--color-warning)' : 'var(--text-tertiary)'};">
              ${escapeHtml(ev.statusLabel || '')}
            </span>
          </div>
          <div class="timeline-meta">
            <span class="author-name">${escapeHtml(ev.authorName)}</span>
            <span>·</span>
            <span>${formatRelativeTime(ev.dateStr)}</span>
            ${ev.duration ? `<span>·</span><span>${ev.duration}</span>` : ''}
            ${ev.eventTrigger ? `<span>·</span><span>${escapeHtml(ev.eventTrigger)}</span>` : ''}
          </div>
          ${
            isFailed && ev.failedSteps && ev.failedSteps.length > 0
              ? `
            <div class="timeline-error-box">
              <div><strong>Упал шаг:</strong> ${ev.failedSteps.map((s) => `[${escapeHtml(s.jobName)}] ${escapeHtml(s.stepName)}`).join(', ')}</div>
              <div><a href="${ev.url}" target="_blank">Открыть лог ошибки на GitHub &rarr;</a></div>
            </div>
          `
              : ''
          }
        </div>
      </div>
      <div class="timeline-right">
        <a class="sha-tag" href="${ev.url}" target="_blank">#${ev.id.replace('run-', '')}</a>
      </div>
    </div>
  `;
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
    __adminSetFilter: (filter: EventFilter) => void;
    __adminSwitchTab: (tab: 'cicd' | 'map') => void;
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

window.__adminSetFilter = (filter: EventFilter) => {
  dashboard.setFilter(filter);
};

window.__adminSwitchTab = (tab: 'cicd' | 'map') => {
  dashboard.switchTab(tab);
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
