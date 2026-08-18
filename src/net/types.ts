export type NetRole = 'host' | 'guest';

export interface RosterEntry {
  peerId: string;
  slot: number;
  name: string;
}

export interface InputPayload {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  // cumulative press counters rather than edge-triggered booleans — input is
  // sent throttled (not every frame), so a boolean edge could land between
  // two sends and be lost. The host detects a new press by diffing against
  // the last-seen value per slot.
  attackSeq: number;
  interactSeq: number;
}

export type ActorAnim = 'idle' | 'run' | 'death' | 'dead';

export interface PlayerSnapshot {
  slot: number;
  x: number;
  y: number;
  anim: ActorAnim;
  flipX: boolean;
  hp: number;
  maxHp: number;
  downed: boolean;
  gold?: number;
  items?: Record<string, number>;
}

export interface EnemySnapshot {
  id: number;
  kind: string;
  x: number;
  y: number;
  anim: 'idle' | 'run' | 'dead';
  flipX: boolean;
}

export interface WorldSnapshot {
  depth: number;
  players: PlayerSnapshot[];
  enemies: EnemySnapshot[];
  flasksTaken: number[];
  chestsOpened: number[];
  brokenProps?: number[];
  killCount: number;
}

export interface TransitionMsg {
  kind: 'gameover' | 'levelcomplete';
  nextDepth: number;
  playerHealth?: Record<number, { hp: number; maxHp: number }>;
}
