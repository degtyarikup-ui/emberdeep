import { TEXTURE } from '../gfx/registry';
import { PROP } from '../gfx/props';
import { AchievementDef } from './types';

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  break_10_crates: {
    id: 'break_10_crates',
    title: 'Ломать не строить',
    desc: 'Разбей 10 ящиков или бочек',
    iconTexture: TEXTURE.PROPS,
    iconFrame: PROP.CRATE,
    color: '#f59e0b',
  },
  first_blood: {
    id: 'first_blood',
    title: 'Первая кровь',
    desc: 'Уничтожь своего первого врага',
    iconTexture: TEXTURE.SKULL,
    color: '#ef4444',
  },
  gold_rush: {
    id: 'gold_rush',
    title: 'Золотая лихорадка',
    desc: 'Собери 50 золотых монет',
    iconTexture: TEXTURE.PROPS,
    iconFrame: PROP.COIN,
    color: '#fbbf24',
  },
  collector: {
    id: 'collector',
    title: 'Коллекционер',
    desc: 'Собери 3 разных предмета',
    iconTexture: TEXTURE.CHEST,
    iconFrame: 0,
    color: '#38bdf8',
  },
  boss_slayer: {
    id: 'boss_slayer',
    title: 'Убийца демонов',
    desc: 'Победи Архидемона Бездны',
    iconTexture: TEXTURE.BOSS_DEMON,
    iconFrame: 0,
    color: '#c084fc',
  },
  near_death: {
    id: 'near_death',
    title: 'Второе дыхание',
    desc: 'Воскресни с Короной Бессмертия',
    iconTexture: TEXTURE.PROPS,
    iconFrame: PROP.ITEM_IMMORTAL_CROWN,
    color: '#a855f7',
  },
  speedrunner: {
    id: 'speedrunner',
    title: 'Быстрые ноги',
    desc: 'Используй рывок на Shift',
    iconTexture: TEXTURE.PROPS,
    iconFrame: PROP.ITEM_BOOTS,
    color: '#34d399',
  },
};
