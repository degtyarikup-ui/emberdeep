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

export async function bakeLevelViaGitHubApi(level: LevelData, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filePath = 'src/world/customLevelPreset.ts';
    const contentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    // 1. Get current file SHA if exists
    let currentSha: string | undefined;
    try {
      const getRes = await fetch(contentsUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token.trim()}`,
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
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
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
      return { success: false, error: `GitHub API: ${msg}` };
    }

    // 4. Trigger deployment workflow dispatch
    try {
      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
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
