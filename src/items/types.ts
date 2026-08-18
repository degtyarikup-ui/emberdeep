export type ItemTier = 'common' | 'uncommon' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  tier: ItemTier;
  icon: string;
  color: string;
}

export interface PlayerInventory {
  items: Record<string, number>;
  gold: number;
}
