import { exportLevelToPresetTypeScript } from './mapEditorHelper';
import type { LevelData } from '../world/level1';

const REPO_OWNER = 'degtyarikup-ui';
const REPO_NAME = 'emberdeep';
export const TOKEN_KEY = 'emberdeep_gh_token';

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function bakeLevelViaGitHubApi(level: LevelData, token: string): Promise<{ success: boolean; error?: string; isAuthError?: boolean }> {
  try {
    const cleanToken = token.replace(/^(Bearer|token)\s+/i, '').trim();
    if (!cleanToken) {
      return { success: false, error: 'GitHub токен пустой', isAuthError: true };
    }

    const filePath = 'src/world/customLevelPreset.ts';
    const contentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    // 1. Get current file SHA on main branch
    let currentSha: string | undefined;
    try {
      const getRes = await fetch(`${contentsUrl}?ref=main`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${cleanToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (getRes.ok) {
        const fileData = (await getRes.json()) as { sha?: string };
        currentSha = fileData.sha;
      }
    } catch {
      // file might be new or not found
    }

    // 2. Export TS preset code
    const tsCode = exportLevelToPresetTypeScript(level);
    const contentBase64 = utf8ToBase64(tsCode);

    // 3. Commit file to main branch via PUT
    const putRes = await fetch(contentsUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: 'feat(level): update official Level 1 preset from map editor',
        content: contentBase64,
        sha: currentSha,
        branch: 'main',
      }),
    });

    if (!putRes.ok) {
      const errData = (await putRes.json().catch(() => ({}))) as { message?: string };
      const msg = errData?.message || `HTTP ${putRes.status} ${putRes.statusText}`;

      if (putRes.status === 404 || putRes.status === 401 || putRes.status === 403) {
        return {
          success: false,
          error: `GitHub отклонил запись (${msg}). У вашего токена нет прав на запись в репозиторий. Укажите токен с правами 'repo' или 'Contents: Read and write'.`,
          isAuthError: true,
        };
      }

      return { success: false, error: `GitHub API: ${msg}` };
    }

    // 4. Trigger deployment workflow dispatch
    try {
      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: 'main' }),
      });
    } catch {
      // dispatch optional
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
