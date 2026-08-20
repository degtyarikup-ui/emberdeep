import { YandexSDK } from '../yandex/yandexSdk';

// Hosts that only we use for testing. Storefront builds are served from
// elsewhere, so listing a host here never loosens a release — see rule §9 in
// SPRITE_COMPOSITION_RULES.md.
const INTERNAL_TEST_HOSTS = ['degtyarikup-ui.github.io'];

/**
 * True only for a genuine Yandex Games session.
 *
 * Note that `YandexSDK.get().ysdk` being non-null does NOT mean this — the SDK
 * script is loaded from an absolute yandex.ru URL, so `YaGames.init()` also
 * succeeds on our own domain. Checking it alone disabled debug everywhere.
 */
function isYandexGamesSession(): boolean {
  // Yandex embeds games in an iframe. A cross-origin top throws on access,
  // which itself means we are framed.
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  // Off-platform the SDK reports an empty app id; a real, registered game
  // session always carries one.
  return Boolean(YandexSDK.get().ysdk?.environment?.app?.id);
}

/**
 * Single source of truth for whether developer tooling (the F1 debug menu,
 * cheats, the `[F1] ДЕБАГ` button) may exist at all.
 *
 * Rule §9 forbids any of it from being reachable in a storefront release: a
 * player or a Yandex moderator must not be able to summon it by a stray
 * keypress. Every debug entry point MUST route through this function, and it
 * must be checked before creating UI or registering key handlers — not merely
 * before opening the menu.
 */
export function isDebugAllowed(): boolean {
  if (typeof window === 'undefined') return Boolean(import.meta.env.DEV);
  if (import.meta.env.DEV) return true;

  // Hard veto, outranking every allowance below.
  if (isYandexGamesSession()) return false;

  return (
    window.location.search.includes('debug=1') ||
    INTERNAL_TEST_HOSTS.includes(window.location.hostname)
  );
}
