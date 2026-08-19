import Phaser from 'phaser';

export enum AnimPriority {
  IDLE = 10,
  RUN = 20,
  INTERACT = 40,
  DODGE = 50,
  SPECIAL = 55,
  ATTACK = 60,
  HIT = 80,
  DEATH = 100,
}

export type AnimStateName = 'idle' | 'run' | 'attack' | 'hit' | 'dodge' | 'interact' | 'special' | 'death';

interface AnimStateConfig {
  priority: AnimPriority;
  interruptible: boolean;
  duration?: number; // ms, if set the state auto-returns to idle after this
  onEnter?: (sprite: Phaser.GameObjects.Sprite) => void;
  onExit?: (sprite: Phaser.GameObjects.Sprite) => void;
}

export class EntityAnimController {
  private currentState: AnimStateName = 'idle';
  private stateTimer = 0;
  private states: Map<AnimStateName, AnimStateConfig>;
  private sprite: Phaser.GameObjects.Sprite;
  private locked = false; // for non-interruptible states

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
    this.states = new Map();
    // Register default states
    this.registerState('idle', { priority: AnimPriority.IDLE, interruptible: true });
    this.registerState('run', { priority: AnimPriority.RUN, interruptible: true });
    this.registerState('attack', { priority: AnimPriority.ATTACK, interruptible: false, duration: 200 });
    this.registerState('hit', { priority: AnimPriority.HIT, interruptible: false, duration: 150 });
    this.registerState('dodge', { priority: AnimPriority.DODGE, interruptible: false, duration: 200 });
    this.registerState('interact', { priority: AnimPriority.INTERACT, interruptible: true, duration: 300 });
    this.registerState('special', { priority: AnimPriority.SPECIAL, interruptible: false, duration: 300 });
    this.registerState('death', { priority: AnimPriority.DEATH, interruptible: false });
  }

  registerState(name: AnimStateName, config: AnimStateConfig): void {
    this.states.set(name, config);
  }

  get current(): AnimStateName {
    return this.currentState;
  }

  /** Try to transition to a new state. Returns true if transition happened. */
  tryTransition(next: AnimStateName): boolean {
    if (this.currentState === next) return false;
    if (this.currentState === 'death') return false; // death is permanent
    
    const currentConfig = this.states.get(this.currentState);
    const nextConfig = this.states.get(next);
    if (!currentConfig || !nextConfig) return false;

    // Can only interrupt if current state allows it or next has higher priority
    if (this.locked && nextConfig.priority <= currentConfig.priority) return false;
    if (!currentConfig.interruptible && nextConfig.priority <= currentConfig.priority) return false;

    // Execute transition
    currentConfig.onExit?.(this.sprite);
    this.currentState = next;
    this.stateTimer = nextConfig.duration ?? 0;
    this.locked = !nextConfig.interruptible;
    nextConfig.onEnter?.(this.sprite);
    return true;
  }

  /** Force transition regardless of priority (used for death, etc.) */
  forceTransition(next: AnimStateName): void {
    const currentConfig = this.states.get(this.currentState);
    const nextConfig = this.states.get(next);
    currentConfig?.onExit?.(this.sprite);
    this.currentState = next;
    this.stateTimer = nextConfig?.duration ?? 0;
    this.locked = !(nextConfig?.interruptible ?? true);
    nextConfig?.onEnter?.(this.sprite);
  }

  /** Call every frame. Returns true if a timed state just expired (auto-returns to idle). */
  update(delta: number): boolean {
    if (this.stateTimer > 0) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.stateTimer = 0;
        this.locked = false;
        const prev = this.currentState;
        if (prev !== 'death') {
          this.currentState = 'idle';
          const idleConfig = this.states.get('idle');
          idleConfig?.onEnter?.(this.sprite);
        }
        return true;
      }
    }
    return false;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  /** Get the network-syncable state string */
  get syncState(): string {
    return this.currentState;
  }
}
