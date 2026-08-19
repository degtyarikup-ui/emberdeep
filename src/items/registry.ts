import { ItemDef } from './types';
import { PROP } from '../gfx/props';

export const ITEMS: Record<string, ItemDef> = {
  whetstone: {
    id: 'whetstone',
    name: 'Точильный камень',
    desc: '+20% к урону атак',
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
  // ОГОНЬ
  fire_blade: {
    id: 'fire_blade',
    name: 'Руна Пламени',
    desc: '[ОГОНЬ] Атака: поджигает цели волнами огня',
    tier: 'uncommon',
    icon: PROP.ITEM_OIL_LAMP,
    color: '#f97316',
    element: 'fire',
    elementSlot: 'attack',
  },
  fire_dash: {
    id: 'fire_dash',
    name: 'Огненная поступь',
    desc: '[ОГОНЬ] Рывок: оставляет горящий лавовый след',
    tier: 'uncommon',
    icon: PROP.ITEM_BOOTS,
    color: '#ea580c',
    element: 'fire',
    elementSlot: 'dash',
  },
  oil_lamp: {
    id: 'oil_lamp',
    name: 'Масляная лампа',
    desc: '[ОГОНЬ] Гибель: поверженные враги детонируют пламенем',
    tier: 'uncommon',
    icon: PROP.ITEM_OIL_LAMP,
    color: '#fbbf24',
    element: 'fire',
    elementSlot: 'onKill',
  },
  // МОРОЗ
  frost_edge: {
    id: 'frost_edge',
    name: 'Сердце Ледника',
    desc: '[МОРОЗ] Атака: замедляет на 40% и морозит врагов',
    tier: 'uncommon',
    icon: PROP.ITEM_CRIT_DAGGER,
    color: '#38bdf8',
    element: 'frost',
    elementSlot: 'attack',
  },
  frost_dash: {
    id: 'frost_dash',
    name: 'Ледяной вихрь',
    desc: '[МОРОЗ] Рывок: замораживает задетых врагов',
    tier: 'uncommon',
    icon: PROP.ITEM_BOOTS,
    color: '#0284c7',
    element: 'frost',
    elementSlot: 'dash',
  },
  // МОЛНИЯ
  storm_earring: {
    id: 'storm_earring',
    name: 'Серьга бури',
    desc: '[МОЛНИЯ] Атака: бьет цепной молнией по 2 врагам',
    tier: 'uncommon',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#facc15',
    element: 'lightning',
    elementSlot: 'attack',
  },
  lightning_dash: {
    id: 'lightning_dash',
    name: 'Шаг молнии',
    desc: '[МОЛНИЯ] Рывок: электризует и шокирует врагов',
    tier: 'uncommon',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#eab308',
    element: 'lightning',
    elementSlot: 'dash',
  },
  // ЯД
  venom_vial: {
    id: 'venom_vial',
    name: 'Склянка Яда',
    desc: '[ЯД] Атака: отравляет врагов едким ядом',
    tier: 'uncommon',
    icon: PROP.ITEM_LEECH_FANG,
    color: '#22c55e',
    element: 'poison',
    elementSlot: 'attack',
  },
  leech_fang: {
    id: 'leech_fang',
    name: 'Клык вампира',
    desc: '[ЯД] Гибель: шанс отхила 1 HP и токсичное облако',
    tier: 'uncommon',
    icon: PROP.ITEM_LEECH_FANG,
    color: '#16a34a',
    element: 'poison',
    elementSlot: 'onKill',
  },
  immortal_crown: {
    id: 'immortal_crown',
    name: 'Корона Бессмертного',
    desc: '[ЛЕГЕНДА] Спасает от смерти с полным HP',
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
