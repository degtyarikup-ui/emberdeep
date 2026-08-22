// Hosts that only we use for testing. Storefront/release builds are served from
// elsewhere, so listing a host here never loosens a release — see rule §9 in
// SPRITE_COMPOSITION_RULES.md.
const INTERNAL_TEST_HOSTS = ['degtyarikup-ui.github.io'];

/**
 * Checks if the game is running inside an embedded third-party iframe.
 */
function isFramedSession(): boolean {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Single source of truth for whether developer tooling (the F1 debug menu,
 * cheats, the `[F1] ДЕБАГ` button) may exist at all.
 *
 * Rule §9 forbids any of it from being reachable in a storefront release: a
 * player must not be able to summon it by a stray keypress. Every debug entry
 * point MUST route through this function, and it must be checked before
 * creating UI or registering key handlers — not merely before opening the menu.
 */
export function isDebugAllowed(): boolean {
  if (typeof window === 'undefined') return Boolean(import.meta.env.DEV);
  if (import.meta.env.DEV) return true;

  // Hard veto: never allow debug inside framed/embedded portals
  if (isFramedSession()) return false;

  return (
    window.location.search.includes('debug=1') ||
    INTERNAL_TEST_HOSTS.includes(window.location.hostname)
  );
}
