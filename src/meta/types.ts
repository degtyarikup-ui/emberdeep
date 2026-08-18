export interface MetaUpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  maxLevel: number;
  costs: number[]; // Ember cost per level [lvl1, lvl2, lvl3]
  formatValue: (level: number) => string;
}

export interface MetaState {
  embers: number;
  totalEmbersEarned: number;
  upgrades: Record<string, number>;
}
