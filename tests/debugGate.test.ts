import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Rule §9 lives or dies on this one function, and it has already been wrong
 * once: gating on `ysdk` being non-null disabled the menu everywhere, because
 * the Yandex SDK initialises off-platform too. These cases pin the behaviour
 * that regression proved we need.
 */

const ysdkMock: { value: unknown } = { value: null };

vi.mock('../src/yandex/yandexSdk', () => ({
  YandexSDK: { get: () => ({ get ysdk() { return ysdkMock.value; } }) },
}));

const setHostname = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname, search: '' } as unknown as Location,
  });
};

const setSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname: window.location.hostname, search } as unknown as Location,
  });
};

/** Pretends the page is inside an iframe, the way Yandex Games serves it. */
const setFramed = (framed: boolean) => {
  Object.defineProperty(window, 'top', {
    configurable: true,
    value: framed ? ({} as Window) : window,
  });
};

const loadGate = async () => {
  vi.resetModules();
  return (await import('../src/debug/access')).isDebugAllowed;
};

describe('isDebugAllowed', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false); // tests run in dev mode by default; emulate a release bundle
    ysdkMock.value = null;
    setHostname('example.com');
    setFramed(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows debug in local development regardless of anything else', async () => {
    vi.stubEnv('DEV', true);
    setHostname('some-storefront.example');
    ysdkMock.value = { environment: { app: { id: '42' } } };
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(true);
  });

  it('allows debug on our own test host', async () => {
    setHostname('degtyarikup-ui.github.io');
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(true);
  });

  it('still allows debug on our host when the Yandex SDK loaded but no app is registered', async () => {
    // The exact production situation: the SDK script is fetched from an
    // absolute yandex.ru URL, so ysdk exists with an empty app id.
    setHostname('degtyarikup-ui.github.io');
    ysdkMock.value = { environment: { app: { id: '' } } };
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(true);
  });

  it('denies debug on an unknown host', async () => {
    setHostname('some-random-mirror.example');
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });

  it('allows debug behind the explicit ?debug=1 opt-in', async () => {
    setHostname('some-random-mirror.example');
    setSearch('?debug=1');
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(true);
  });

  it('denies debug inside an iframe even on our own host', async () => {
    // Yandex embeds the game; a storefront session must never expose it.
    setHostname('degtyarikup-ui.github.io');
    setFramed(true);
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });

  it('denies debug for a registered Yandex app session', async () => {
    setHostname('degtyarikup-ui.github.io');
    ysdkMock.value = { environment: { app: { id: '123456' } } };
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });

  it('denies debug when ?debug=1 is used inside a storefront frame', async () => {
    setHostname('some-random-mirror.example');
    setSearch('?debug=1');
    setFramed(true);
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });
});
