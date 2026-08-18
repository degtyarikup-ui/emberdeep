import { ItemDef } from './types';
import { PROP } from '../gfx/props';

export const ITEMS: Record<string, ItemDef> = {
  whetstone: {
    id: 'whetstone',
    name: 'Точильный камень',
    desc: '+20% к урону меча',
    tier: 'common',
    icon: PROP.ITEM_WHETSTONE,
    color: '#e2e8f0',
  },
  boots: {
    id: 'boots',
    name: 'Сапоги спешки',
    desc: '+15% к скорости бега',
    tier: 'common',
    icon: PROP.ITEM_BOOTS,
    color: '#a3e635',
  },
  crit_dagger: {
    id: 'crit_dagger',
    name: 'Оселок палача',
    desc: '+15% шанс крита (x2 урон)',
    tier: 'common',
    icon: PROP.ITEM_CRIT_DAGGER,
    color: '#f87171',
  },
  leech_fang: {
    id: 'leech_fang',
    name: 'Клык вампира',
    desc: '25% шанс отхила 1 HP при убийстве',
    tier: 'uncommon',
    icon: PROP.ITEM_LEECH_FANG,
    color: '#fb7185',
  },
  storm_earring: {
    id: 'storm_earring',
    name: 'Серьга бури',
    desc: 'Криты бьют молнией по 2 врагам',
    tier: 'uncommon',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#38bdf8',
  },
  oil_lamp: {
    id: 'oil_lamp',
    name: 'Масляная лампа',
    desc: 'Враги взрываются огненным кольцом',
    tier: 'uncommon',
    icon: PROP.ITEM_OIL_LAMP,
    color: '#fbbf24',
  },
  immortal_crown: {
    id: 'immortal_crown',
    name: 'Корона Бессмертного',
    desc: 'Спасает от смерти с полным HP',
    tier: 'legendary',
    icon: PROP.ITEM_IMMORTAL_CROWN,
    color: '#facc15',
  },
};

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);

export function getRandomItem(): ItemDef {
  const roll = Math.random();
  let pool: ItemDef[];
  if (roll < 0.60) {
    pool = ITEM_LIST.filter((i) => i.tier === 'common');
  } else if (roll < 0.92) {
    pool = ITEM_LIST.filter((i) => i.tier === 'uncommon');
  } else {
    pool = ITEM_LIST.filter((i) => i.tier === 'legendary');
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? ITEM_LIST[0];
}
