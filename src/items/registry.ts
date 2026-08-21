import { ItemDef } from './types';
import { PROP } from '../gfx/props';

export const ITEMS: Record<string, ItemDef> = {
  // ==========================================
  // COMMON ARTIFACTS (60% drop weight)
  // ==========================================
  whetstone: {
    id: 'whetstone',
    name: 'Точильный камень',
    desc: '+20% к силе урона атак',
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
  titan_heart: {
    id: 'titan_heart',
    name: 'Сердце Титана',
    desc: '+1 к макс. HP и лечение на 1 HP',
    tier: 'common',
    icon: PROP.FLASK_RED,
    color: '#f43f5e',
  },
  midas_coin: {
    id: 'midas_coin',
    name: 'Монета Мидаса',
    desc: '+50% золота из поверженных врагов',
    tier: 'common',
    icon: PROP.COIN,
    color: '#fbbf24',
  },
  iron_pauldrons: {
    id: 'iron_pauldrons',
    name: 'Шипастые наплечники',
    desc: 'Шипы: при получении урона наносит 4 урона вокруг',
    tier: 'common',
    icon: PROP.ITEM_WHETSTONE,
    color: '#94a3b8',
  },
  lucky_horseshoe: {
    id: 'lucky_horseshoe',
    name: 'Подкова удачи',
    desc: '+15% шанс удвоения золота и ценных находок',
    tier: 'common',
    icon: PROP.COIN,
    color: '#34d399',
  },
  berserker_wristband: {
    id: 'berserker_wristband',
    name: 'Браслет берсерка',
    desc: '+20% к скорости атак (снижение задержки)',
    tier: 'common',
    icon: PROP.ITEM_CRIT_DAGGER,
    color: '#fb923c',
  },

  // ==========================================
  // UNCOMMON & ELEMENTAL ARTIFACTS (32% drop weight)
  // ==========================================
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
  molten_core: {
    id: 'molten_core',
    name: 'Пылающее ядро',
    desc: '[ОГОНЬ] Горящие враги получают +35% урона',
    tier: 'uncommon',
    icon: PROP.ITEM_OIL_LAMP,
    color: '#dc2626',
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
  blizzard_ring: {
    id: 'blizzard_ring',
    name: 'Кольцо метели',
    desc: '[МОРОЗ] Гибель: замороженные враги взрываются осколками',
    tier: 'uncommon',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#7dd3fc',
    element: 'frost',
    elementSlot: 'onKill',
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
  thunder_talisman: {
    id: 'thunder_talisman',
    name: 'Талисман грома',
    desc: '[МОЛНИЯ] Крит-удары всегда вызывают удар молнии',
    tier: 'uncommon',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#fef08a',
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
    desc: '[ЯД] Гибель: 25% шанс отхила 1 HP и токсичное облако',
    tier: 'uncommon',
    icon: PROP.ITEM_LEECH_FANG,
    color: '#16a34a',
    element: 'poison',
    elementSlot: 'onKill',
  },
  toxic_mist_dash: {
    id: 'toxic_mist_dash',
    name: 'Токсичный туман',
    desc: '[ЯД] Рывок: оставляет едкое ядовитое облако',
    tier: 'uncommon',
    icon: PROP.ITEM_BOOTS,
    color: '#84cc16',
    element: 'poison',
    elementSlot: 'dash',
  },

  // ТАКТИЧЕСКИЕ И БОЕВЫЕ
  chrono_hourglass: {
    id: 'chrono_hourglass',
    name: 'Песочные часы времени',
    desc: '-25% к кулдауну спецумения (ПКМ / Q)',
    tier: 'uncommon',
    icon: PROP.COIN,
    color: '#c084fc',
  },
  executioner_axe: {
    id: 'executioner_axe',
    name: 'Секира палача',
    desc: '+50% урона по врагам с HP ниже 35%',
    tier: 'uncommon',
    icon: PROP.ITEM_CRIT_DAGGER,
    color: '#e11d48',
  },

  // ==========================================
  // LEGENDARY ARTIFACTS (8% drop weight)
  // ==========================================
  immortal_crown: {
    id: 'immortal_crown',
    name: 'Корона Бессмертного',
    desc: '[ЛЕГЕНДА] Спасает от смерти с полным HP',
    tier: 'legendary',
    icon: PROP.ITEM_IMMORTAL_CROWN,
    color: '#facc15',
  },
  radiant_shield: {
    id: 'radiant_shield',
    name: 'Эгида Света',
    desc: '[ЛЕГЕНДА] Щит: поглощает 1 удар каждые 15 сек',
    tier: 'legendary',
    icon: PROP.ITEM_IMMORTAL_CROWN,
    color: '#67e8f9',
  },
  blood_chalice: {
    id: 'blood_chalice',
    name: 'Чаша Крови',
    desc: '[ЛЕГЕНДА] Каждые 10 убийств исцеляют 1 HP',
    tier: 'legendary',
    icon: PROP.FLASK_RED,
    color: '#ec4899',
  },
  giant_slayer_ring: {
    id: 'giant_slayer_ring',
    name: 'Перстень Титаноборца',
    desc: '[ЛЕГЕНДА] +60% урона по боссам и крупным врагам',
    tier: 'legendary',
    icon: PROP.ITEM_STORM_EARRING,
    color: '#a855f7',
  },
  prismatic_prism: {
    id: 'prismatic_prism',
    name: 'Призматическая призма',
    desc: '[ЛЕГЕНДА] Снаряды пробивают +1 цель и +25% урона',
    tier: 'legendary',
    icon: PROP.ITEM_WHETSTONE,
    color: '#f0abfc',
  },
};

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);

export function getRandomItem(excludeIds?: string[]): ItemDef {
  const available = excludeIds && excludeIds.length > 0
    ? ITEM_LIST.filter((i) => !excludeIds.includes(i.id))
    : ITEM_LIST;
  const pool = available.length > 0 ? available : ITEM_LIST;

  const roll = Math.random();
  let tierPool: ItemDef[];
  if (roll < 0.60) {
    tierPool = pool.filter((i) => i.tier === 'common');
  } else if (roll < 0.92) {
    tierPool = pool.filter((i) => i.tier === 'uncommon');
  } else {
    tierPool = pool.filter((i) => i.tier === 'legendary');
  }
  if (tierPool.length === 0) tierPool = pool;
  return tierPool[Math.floor(Math.random() * tierPool.length)] ?? ITEM_LIST[0];
}
