import { MetaUpgradeDef, MetaState } from './types';
import { YandexSDK } from '../yandex/yandexSdk';

const STORAGE_KEY = 'emberdeep_meta';

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'vitality',
    name: 'Живучесть',
    desc: 'Увеличивает максимальное здоровье героя',
    icon: 'HP',
    color: '#ef4444',
    maxLevel: 3,
    costs: [5, 12, 25],
    formatValue: (lvl) => `+${lvl} HP`,
  },
  {
    id: 'might',
    name: 'Заточка стали',
    desc: 'Увеличивает базовый урон атак и стрел',
    icon: 'DMG',
    color: '#f97316',
    maxLevel: 3,
    costs: [5, 14, 28],
    formatValue: (lvl) => `+${lvl * 15}% Урон`,
  },
  {
    id: 'agility',
    name: 'Проворство',
    desc: 'Повышает базовую скорость передвижения',
    icon: 'SPD',
    color: '#38bdf8',
    maxLevel: 3,
    costs: [4, 10, 20],
    formatValue: (lvl) => `+${lvl * 6}% Скорость`,
  },
  {
    id: 'fortune',
    name: 'Глаз удачи',
    desc: 'Повышает базовый шанс критического удара',
    icon: 'CRT',
    color: '#facc15',
    maxLevel: 3,
    costs: [4, 12, 24],
    formatValue: (lvl) => `+${lvl * 6}% Крит`,
  },
  {
    id: 'bounty',
    name: 'Мешок старателя',
    desc: 'Даёт стартовое золото при входе в подземелье',
    icon: 'GLD',
    color: '#fbbf24',
    maxLevel: 3,
    costs: [3, 8, 16],
    formatValue: (lvl) => `+${lvl * 12} золота на старте`,
  },
];

export class MetaManager {
  private static instance?: MetaManager;
  private state: MetaState;

  private constructor() {
    this.state = this.load();
  }

  static get(): MetaManager {
    if (!MetaManager.instance) {
      MetaManager.instance = new MetaManager();
    }
    return MetaManager.instance;
  }

  private load(): MetaState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          embers: Number(parsed.embers) || 0,
          totalEmbersEarned: Number(parsed.totalEmbersEarned) || 0,
          upgrades: parsed.upgrades || {},
        };
      }
    } catch {
      // fallback
    }
    return {
      embers: 0,
      totalEmbersEarned: 0,
      upgrades: {},
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      void YandexSDK.get().savePlayerData({ meta: this.state });
    } catch {
      // ignore
    }
  }

  async syncCloud(): Promise<void> {
    try {
      const data = await YandexSDK.get().loadPlayerData();
      if (data && data.meta) {
        const cloudMeta = data.meta as MetaState;
        if ((cloudMeta.totalEmbersEarned || 0) > (this.state.totalEmbersEarned || 0)) {
          this.state = {
            embers: Number(cloudMeta.embers) || 0,
            totalEmbersEarned: Number(cloudMeta.totalEmbersEarned) || 0,
            upgrades: cloudMeta.upgrades || {},
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        }
      }
    } catch {
      // ignore
    }
  }

  get embers(): number {
    return this.state.embers;
  }

  addEmbers(amount: number): void {
    if (amount <= 0) return;
    this.state.embers += amount;
    this.state.totalEmbersEarned += amount;
    this.save();
  }

  getUpgradeLevel(id: string): number {
    return this.state.upgrades[id] || 0;
  }

  getUpgradeCost(id: string): number | null {
    const def = META_UPGRADES.find((u) => u.id === id);
    if (!def) return null;
    const current = this.getUpgradeLevel(id);
    if (current >= def.maxLevel) return null;
    return def.costs[current];
  }

  buyUpgrade(id: string): boolean {
    const cost = this.getUpgradeCost(id);
    if (cost === null || this.state.embers < cost) return false;

    this.state.embers -= cost;
    this.state.upgrades[id] = (this.state.upgrades[id] || 0) + 1;
    this.save();
    return true;
  }

  getBonuses(): {
    extraHp: number;
    damageMultiplier: number;
    speedMultiplier: number;
    extraCrit: number;
    startGold: number;
  } {
    const vit = this.getUpgradeLevel('vitality');
    const might = this.getUpgradeLevel('might');
    const agi = this.getUpgradeLevel('agility');
    const fort = this.getUpgradeLevel('fortune');
    const bounty = this.getUpgradeLevel('bounty');

    return {
      extraHp: vit,
      damageMultiplier: 1 + might * 0.15,
      speedMultiplier: 1 + agi * 0.06,
      extraCrit: fort * 0.06,
      startGold: bounty * 12,
    };
  }
}
