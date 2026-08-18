import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InputPayload, NetRole, RosterEntry, TransitionMsg, WorldSnapshot } from './types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud
const MAX_PLAYERS = 4;

interface PresenceMeta {
  peerId: string;
  name: string;
  joinedAt: number;
}

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export class RoomClient {
  readonly peerId = crypto.randomUUID();
  readonly role: NetRole;
  readonly code: string;
  readonly name: string;

  private channel!: RealtimeChannel;
  private roster: RosterEntry[] = [];

  private onRosterCb?: (roster: RosterEntry[]) => void;
  private onInputCb?: (peerId: string, input: InputPayload) => void;
  private onSnapshotCb?: (snapshot: WorldSnapshot) => void;
  private onStartCb?: (depth: number) => void;
  private onTransitionCb?: (msg: TransitionMsg) => void;

  private constructor(role: NetRole, code: string, name: string) {
    this.role = role;
    this.code = code;
    this.name = name;
  }

  static async host(name: string): Promise<RoomClient> {
    const rc = new RoomClient('host', generateCode(), name);
    await rc.connect();
    return rc;
  }

  static async join(code: string, name: string): Promise<RoomClient> {
    const rc = new RoomClient('guest', code.toUpperCase(), name);
    await rc.connect();
    return rc;
  }

  get mySlot(): number | undefined {
    return this.roster.find((r) => r.peerId === this.peerId)?.slot;
  }

  get currentRoster(): RosterEntry[] {
    return this.roster;
  }

  onRoster(cb: (roster: RosterEntry[]) => void): void {
    this.onRosterCb = cb;
  }

  onInput(cb: (peerId: string, input: InputPayload) => void): void {
    this.onInputCb = cb;
  }

  onSnapshot(cb: (snapshot: WorldSnapshot) => void): void {
    this.onSnapshotCb = cb;
  }

  onStart(cb: (depth: number) => void): void {
    this.onStartCb = cb;
  }

  onTransition(cb: (msg: TransitionMsg) => void): void {
    this.onTransitionCb = cb;
  }

  sendInput(input: InputPayload): void {
    void this.channel.send({ type: 'broadcast', event: 'input', payload: { peerId: this.peerId, input } });
  }

  sendSnapshot(snapshot: WorldSnapshot): void {
    void this.channel.send({ type: 'broadcast', event: 'snapshot', payload: snapshot });
  }

  sendStart(depth: number): void {
    void this.channel.send({ type: 'broadcast', event: 'start', payload: { depth } });
  }

  sendTransition(msg: TransitionMsg): void {
    void this.channel.send({ type: 'broadcast', event: 'transition', payload: msg });
  }

  async leave(): Promise<void> {
    await supabase.removeChannel(this.channel);
  }

  private connect(): Promise<void> {
    this.channel = supabase.channel(`room-${this.code}`, {
      config: { broadcast: { self: false }, presence: { key: this.peerId } },
    });

    this.channel.on('presence', { event: 'sync' }, () => {
      if (this.role === 'host') this.recomputeRoster();
    });
    this.channel.on('broadcast', { event: 'roster' }, ({ payload }) => {
      this.roster = payload.roster as RosterEntry[];
      this.onRosterCb?.(this.roster);
    });
    this.channel.on('broadcast', { event: 'input' }, ({ payload }) => {
      this.onInputCb?.(payload.peerId as string, payload.input as InputPayload);
    });
    this.channel.on('broadcast', { event: 'snapshot' }, ({ payload }) => {
      this.onSnapshotCb?.(payload as WorldSnapshot);
    });
    this.channel.on('broadcast', { event: 'start' }, ({ payload }) => {
      this.onStartCb?.(payload.depth as number);
    });
    this.channel.on('broadcast', { event: 'transition' }, ({ payload }) => {
      this.onTransitionCb?.(payload as TransitionMsg);
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Не удалось подключиться к комнате (таймаут)')), 8000);
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          await this.channel.track({ peerId: this.peerId, name: this.name, joinedAt: Date.now() } satisfies PresenceMeta);
          if (this.role === 'host') this.recomputeRoster();
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          reject(new Error('Не удалось подключиться к комнате'));
        }
      });
    });
  }

  private recomputeRoster(): void {
    const state = this.channel.presenceState<PresenceMeta>();
    const entries = Object.values(state)
      .flat()
      .filter((e) => !!e && typeof e.peerId === 'string');

    const others = entries.filter((e) => e.peerId !== this.peerId).sort((a, b) => a.joinedAt - b.joinedAt);
    const hostEntry = entries.find((e) => e.peerId === this.peerId);

    const roster: RosterEntry[] = [{ peerId: this.peerId, slot: 0, name: hostEntry?.name ?? this.name }];
    for (const e of others.slice(0, MAX_PLAYERS - 1)) {
      roster.push({ peerId: e.peerId, slot: roster.length, name: e.name });
    }

    this.roster = roster;
    this.onRosterCb?.(roster);
    void this.channel.send({ type: 'broadcast', event: 'roster', payload: { roster } });
  }
}
