import { describe, it, expect } from 'vitest';
import { I18n } from '../src/i18n';

/**
 * Mechanised checks for the project rules in SPRITE_COMPOSITION_RULES.md that
 * a machine can actually judge. Rules enforced only by review get skipped
 * every time somebody is in a hurry.
 */

const RU = (() => {
  const i18n = I18n.get();
  i18n.setLanguage('ru');
  return i18n.t();
})();

const EN = (() => {
  const i18n = I18n.get();
  i18n.setLanguage('en');
  return i18n.t();
})();

describe('rule §7 — every string exists in both languages', () => {
  it('RU and EN dictionaries expose the same keys', () => {
    expect(Object.keys(RU).sort()).toEqual(Object.keys(EN).sort());
  });

  it('has no blank entries in either language', () => {
    for (const [lang, dict] of [
      ['RU', RU],
      ['EN', EN],
    ] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `${lang}.${key} is not a string`).toBe('string');
        expect((value as string).trim(), `${lang}.${key} is blank`).not.toBe('');
      }
    }
  });
});

describe('rule §8 — no unicode emoji in the UI', () => {
  // Colour-presentation pictographs and dingbats. The rule permits "stylized
  // tags", so a few deliberately monochrome typographic glyphs are allowed:
  // ✦ separates prices in the shop, ← labels back buttons. Those render as
  // text, not as an emoji, and do not break the pixel-art look.
  const ALLOWED = new Set(['✦', '←', '→', '·', '✓']);
  // Variation Selector-16 is matched on its own rather than inside the class,
  // where it would form a misleading combined character with the range above.
  const EMOJI =
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}]|\u{FE0F}/gu;

  const offendersIn = (text: string) =>
    [...text.matchAll(EMOJI)].map((m) => m[0]).filter((ch) => !ALLOWED.has(ch));

  it.each([
    ['RU', RU],
    ['EN', EN],
  ])('%s dictionary is emoji-free', (_lang, dict) => {
    const bad = Object.entries(dict)
      .filter(([, v]) => typeof v === 'string' && offendersIn(v as string).length > 0)
      .map(([k, v]) => `${k}: ${String(v)}`);
    expect(bad, `emoji found:\n${bad.join('\n')}`).toEqual([]);
  });

  it('no source file contains an emoji literal', async () => {
    // Catches hardcoded UI strings that never went through i18n — which is
    // where every violation so far actually lived.
    const { readFile, readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const walk = async (dir: string): Promise<string[]> => {
      const entries = await readdir(dir, { withFileTypes: true });
      const out = await Promise.all(
        entries.map((e) => {
          const p = join(dir, e.name);
          return e.isDirectory() ? walk(p) : Promise.resolve(p.endsWith('.ts') ? [p] : []);
        })
      );
      return out.flat();
    };

    const bad: string[] = [];
    for (const file of await walk('src')) {
      const lines = (await readFile(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        const found = offendersIn(line);
        if (found.length) bad.push(`${file}:${i + 1} ${found.join('')} — ${line.trim().slice(0, 70)}`);
      });
    }
    expect(bad, `emoji found:\n${bad.join('\n')}`).toEqual([]);
  });
});
