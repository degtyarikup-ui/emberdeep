import { describe, it, expect, beforeEach } from 'vitest';
import { checkElementalCombo, ELEMENT_COLORS, ElementType, StatusState } from '../src/combat/ElementalSystem';
import { ITEMS, ITEM_LIST, getRandomItem } from '../src/items/registry';
import { MetaManager, META_UPGRADES } from '../src/meta/MetaManager';

const ELEMENTS: ElementType[] = ['fire', 'frost', 'lightning', 'poison'];

const emptyStatus = (): StatusState => ({
  burningDuration: 0,
  burningDps: 0,
  slowDuration: 0,
  slowFactor: 1,
  frozenDuration: 0,
  poisonDuration: 0,
  poisonDps: 0,
  shockDuration: 0,
});

/** Which status field each element leaves behind on a target. */
const DURATION_FIELD: Record<ElementType, keyof StatusState> = {
  fire: 'burningDuration',
  frost: 'slowDuration',
  lightning: 'shockDuration',
  poison: 'poisonDuration',
};

describe('elemental combos', () => {
  it('gives every element a colour', () => {
    for (const el of ELEMENTS) expect(ELEMENT_COLORS[el]).toBeDefined();
  });

  it('does not react against a clean target', () => {
    for (const el of ELEMENTS) {
      expect(checkElementalCombo(el, emptyStatus())).toBeNull();
    }
  });

  it.each([
    ['fire', 'poison'],
    ['frost', 'lightning'],
    ['fire', 'frost'],
    ['lightning', 'poison'],
  ] as [ElementType, ElementType][])('reacts for the %s + %s pair in both orders', (a, b) => {
    // Applying A onto a target already carrying B must react, and vice versa —
    // an asymmetric table would make combos depend on attack ordering.
    const statusWith = (el: ElementType): StatusState => {
      const s = emptyStatus();
      s[DURATION_FIELD[el]] = 3000;
      return s;
    };

    const forward = checkElementalCombo(a, statusWith(b));
    const backward = checkElementalCombo(b, statusWith(a));

    expect(forward, `${a} onto ${b} did not react`).not.toBeNull();
    expect(backward, `${b} onto ${a} did not react`).not.toBeNull();
    expect(forward!.name).toBe(backward!.name);
    expect(forward!.bonusDamage).toBeGreaterThan(0);
  });
});

describe('item registry', () => {
  it('keeps every id consistent with its map key', () => {
    for (const [key, item] of Object.entries(ITEMS)) expect(item.id).toBe(key);
  });

  it('gives every item a valid tier and non-empty copy', () => {
    for (const item of ITEM_LIST) {
      expect(['common', 'uncommon', 'legendary']).toContain(item.tier);
      expect(item.name.trim()).not.toBe('');
      expect(item.desc.trim()).not.toBe('');
    }
  });

  it('has at least 28 unique items covering common, uncommon, and legendary tiers', () => {
    expect(ITEM_LIST.length).toBeGreaterThanOrEqual(28);
    for (const tier of ['common', 'uncommon', 'legendary']) {
      expect(ITEM_LIST.filter((i) => i.tier === tier).length).toBeGreaterThan(0);
    }
  });

  it('ensures all items with elements define valid elementSlots', () => {
    for (const item of ITEM_LIST) {
      if (item.element) {
        expect(['fire', 'frost', 'lightning', 'poison']).toContain(item.element);
        expect(['attack', 'skill', 'dash', 'onKill']).toContain(item.elementSlot);
      }
    }
  });

  it('always returns a registered item', () => {
    for (let i = 0; i < 200; i++) {
      const item = getRandomItem();
      expect(item).toBeDefined();
      expect(ITEMS[item.id]).toBe(item);
    }
  });
});

describe('meta progression', () => {
  beforeEach(() => {
    localStorage.clear();
    MetaManager.get().resetProgress();
  });

  it('prices every upgrade level it advertises', () => {
    for (const upgrade of META_UPGRADES) {
      expect(upgrade.costs).toHaveLength(upgrade.maxLevel);
      for (const cost of upgrade.costs) expect(cost).toBeGreaterThan(0);
    }
  });

  it('makes each successive level cost more than the last', () => {
    for (const upgrade of META_UPGRADES) {
      for (let i = 1; i < upgrade.costs.length; i++) {
        expect(upgrade.costs[i], `${upgrade.id} level ${i + 1}`).toBeGreaterThan(upgrade.costs[i - 1]);
      }
    }
  });

  it('refuses a purchase that cannot be afforded', () => {
    const meta = MetaManager.get();
    expect(meta.embers).toBe(0);
    expect(meta.buyUpgrade(META_UPGRADES[0].id)).toBe(false);
    expect(meta.getUpgradeLevel(META_UPGRADES[0].id)).toBe(0);
  });

  it('spends embers and raises the level on a purchase', () => {
    const meta = MetaManager.get();
    const upgrade = META_UPGRADES[0];
    meta.addEmbers(1000);
    const before = meta.embers;

    expect(meta.buyUpgrade(upgrade.id)).toBe(true);
    expect(meta.getUpgradeLevel(upgrade.id)).toBe(1);
    expect(meta.embers).toBe(before - upgrade.costs[0]);
  });

  it('stops selling an upgrade past its max level', () => {
    const meta = MetaManager.get();
    const upgrade = META_UPGRADES[0];
    meta.addEmbers(100000);
    for (let i = 0; i < upgrade.maxLevel; i++) expect(meta.buyUpgrade(upgrade.id)).toBe(true);

    expect(meta.getUpgradeLevel(upgrade.id)).toBe(upgrade.maxLevel);
    expect(meta.buyUpgrade(upgrade.id)).toBe(false);
    expect(meta.getUpgradeCost(upgrade.id)).toBeNull();
  });

  it('wipes embers and levels on reset', () => {
    const meta = MetaManager.get();
    meta.addEmbers(500);
    meta.buyUpgrade(META_UPGRADES[0].id);

    meta.resetProgress();

    expect(meta.embers).toBe(0);
    for (const upgrade of META_UPGRADES) expect(meta.getUpgradeLevel(upgrade.id)).toBe(0);
  });

  it('reports neutral bonuses on a fresh save', () => {
    const bonuses = MetaManager.get().getBonuses();
    expect(bonuses.extraHp).toBe(0);
    expect(bonuses.startGold).toBe(0);
    expect(bonuses.damageMultiplier).toBe(1);
    expect(bonuses.speedMultiplier).toBe(1);
  });

  it('improves bonuses as upgrades are bought', () => {
    const meta = MetaManager.get();
    meta.addEmbers(100000);
    for (const upgrade of META_UPGRADES) meta.buyUpgrade(upgrade.id);

    const bonuses = meta.getBonuses();
    expect(bonuses.extraHp).toBeGreaterThan(0);
    expect(bonuses.damageMultiplier).toBeGreaterThan(1);
    expect(bonuses.speedMultiplier).toBeGreaterThan(1);
    expect(bonuses.startGold).toBeGreaterThan(0);
  });
});

describe('audio settings and volume channels', () => {
  it('manages and clamps music and sfx volume correctly', async () => {
    const { SoundFX } = await import('../src/audio/SoundFX');

    SoundFX.setMusicVolume(0.5);
    expect(SoundFX.getMusicVolume()).toBe(0.5);

    SoundFX.setMusicVolume(1.5);
    expect(SoundFX.getMusicVolume()).toBe(1.0);

    SoundFX.setMusicVolume(-0.2);
    expect(SoundFX.getMusicVolume()).toBe(0.0);

    SoundFX.setSfxVolume(0.85);
    expect(SoundFX.getSfxVolume()).toBe(0.85);

    SoundFX.setSfxVolume(2.0);
    expect(SoundFX.getSfxVolume()).toBe(1.0);

    SoundFX.setSfxVolume(-1.0);
    expect(SoundFX.getSfxVolume()).toBe(0.0);
  });
});
