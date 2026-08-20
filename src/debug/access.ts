import { YandexSDK } from '../yandex/yandexSdk';

// Hosts that only the two of us use for testing. The published storefront
// builds (Yandex Games, VK Play, itch.io, …) are served from elsewhere, so
// listing a host here never loosens a release build — see rule §9 in
// SPRITE_COMPOSITION_RULES.md.
const INTERNAL_TEST_HOSTS = ['degtyarikup-ui.github.io'];

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

  // Hard veto: a live Yandex SDK means we really are inside Yandex Games,
  // whatever host the files came from. This outranks every allowance below.
  if (YandexSDK.get().ysdk) return false;

  return Boolean(
    import.meta.env.DEV ||
      window.location.search.includes('debug=1') ||
      INTERNAL_TEST_HOSTS.includes(window.location.hostname)
  );
}
