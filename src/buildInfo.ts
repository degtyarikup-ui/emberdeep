declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

/** Commit this bundle was built from, and when. Injected by vite.config.ts. */
export const BUILD_SHA = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

/** Short label for the corner of the menu, e.g. "a1b2c3d · 2026-08-21 08:30". */
export const BUILD_LABEL = BUILD_TIME ? `${BUILD_SHA} · ${BUILD_TIME}` : BUILD_SHA;

/**
 * Logged on boot so "is the site actually running my push?" can be answered
 * from the console without digging through Actions — GitHub Pages can serve a
 * stale index.html for up to ten minutes after a deploy.
 */
export function logBuildInfo(): void {
  console.log(`[Emberdeep] build ${BUILD_LABEL}`);
}
