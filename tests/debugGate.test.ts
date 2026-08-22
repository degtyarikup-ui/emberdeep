import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

/** Pretends the page is inside an iframe. */
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
    setHostname('example.com');
    setFramed(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows debug in local development regardless of anything else', async () => {
    vi.stubEnv('DEV', true);
    setHostname('some-storefront.example');
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(true);
  });

  it('allows debug on our own test host', async () => {
    setHostname('degtyarikup-ui.github.io');
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
    setHostname('degtyarikup-ui.github.io');
    setFramed(true);
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });

  it('denies debug when ?debug=1 is used inside an embedded frame', async () => {
    setHostname('some-random-mirror.example');
    setSearch('?debug=1');
    setFramed(true);
    const isDebugAllowed = await loadGate();
    expect(isDebugAllowed()).toBe(false);
  });
});
