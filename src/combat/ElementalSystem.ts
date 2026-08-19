export type ElementType = 'fire' | 'frost' | 'lightning' | 'poison';

export interface ElementalSlotConfig {
  attack?: ElementType;
  skill?: ElementType;
  dash?: ElementType;
  onKill?: ElementType;
}

export interface StatusState {
  burningDuration: number;
  burningDps: number;
  slowDuration: number;
  slowFactor: number;
  frozenDuration: number;
  poisonDuration: number;
  poisonDps: number;
  shockDuration: number;
}

export interface ComboResult {
  name: string;
  color: string;
  bonusDamage: number;
  aoeRadius?: number;
  effect: 'toxic_burst' | 'shatter' | 'thermal_shock' | 'static_plague';
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#f97316',
  frost: '#38bdf8',
  lightning: '#eab308',
  poison: '#22c55e',
};

export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥',
  frost: '❄️',
  lightning: '⚡',
  poison: '☠️',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: 'Огонь',
  frost: 'Мороз',
  lightning: 'Молния',
  poison: 'Яд',
};

/**
 * Checks if applying `incoming` element to an entity with `activeStatuses` triggers a combo.
 */
export function checkElementalCombo(
  incoming: ElementType,
  status: StatusState
): ComboResult | null {
  // Fire + Poison -> Toxic Detonation
  if (incoming === 'fire' && status.poisonDuration > 0) {
    status.poisonDuration = 0;
    return {
      name: '🔥 ВЗРЫВ ЯДА!',
      color: '#f97316',
      bonusDamage: 24,
      aoeRadius: 64,
      effect: 'toxic_burst',
    };
  }
  if (incoming === 'poison' && status.burningDuration > 0) {
    status.burningDuration = 0;
    return {
      name: '🔥 ВЗРЫВ ЯДА!',
      color: '#22c55e',
      bonusDamage: 24,
      aoeRadius: 64,
      effect: 'toxic_burst',
    };
  }

  // Frost + Lightning -> Superconduct / Shatter
  if (
    (incoming === 'lightning' && (status.frozenDuration > 0 || status.slowDuration > 0)) ||
    (incoming === 'frost' && status.shockDuration > 0)
  ) {
    status.frozenDuration = 0;
    status.slowDuration = 0;
    status.shockDuration = 0;
    return {
      name: '⚡ РАСКОЛ ЛЬДА!',
      color: '#38bdf8',
      bonusDamage: 28,
      aoeRadius: 52,
      effect: 'shatter',
    };
  }

  // Fire + Frost -> Thermal Shock
  if (
    (incoming === 'fire' && (status.frozenDuration > 0 || status.slowDuration > 0)) ||
    (incoming === 'frost' && status.burningDuration > 0)
  ) {
    status.burningDuration = 0;
    status.frozenDuration = 0;
    status.slowDuration = 0;
    return {
      name: '💨 ТЕРМОШОК!',
      color: '#fbbf24',
      bonusDamage: 32,
      effect: 'thermal_shock',
    };
  }

  // Lightning + Poison -> Static Plague
  if (
    (incoming === 'lightning' && status.poisonDuration > 0) ||
    (incoming === 'poison' && status.shockDuration > 0)
  ) {
    return {
      name: '☠️ ЦЕПНАЯ ЧУМА!',
      color: '#a855f7',
      bonusDamage: 16,
      aoeRadius: 80,
      effect: 'static_plague',
    };
  }

  return null;
}
