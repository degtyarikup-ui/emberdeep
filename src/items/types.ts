import { ElementType } from '../combat/ElementalSystem';

export type ItemTier = 'common' | 'uncommon' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  tier: ItemTier;
  icon: string;
  color: string;
  element?: ElementType;
  elementSlot?: 'attack' | 'skill' | 'dash' | 'onKill';
}

export interface PlayerInventory {
  items: Record<string, number>;
  gold: number;
}
