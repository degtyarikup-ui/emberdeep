import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../net/supabase';
import type { LevelData } from '../world/level1';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_COLORS = [
  '#38bdf8', // sky
  '#ec4899', // pink
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ef4444', // red
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export interface CollabPeer {
  peerId: string;
  name: string;
  color: string;
  col: number;
  row: number;
  worldX: number;
  worldY: number;
  tool: string;
  brushSize?: number;
  lastActive: number;
}

export interface TileUpdate {
  col: number;
  row: number;
  val: number;
}

export type CollabStatus = 'connecting' | 'connected' | 'offline' | 'error';

export class MapCollabClient {
  readonly peerId: string;
  public name: string;
  readonly color: string;
  readonly roomCode: string;
  public status: CollabStatus = 'connecting';

  private channel!: RealtimeChannel;
  private peers: Map<string, CollabPeer> = new Map();

  private onStatusChangeCb?: (status: CollabStatus, errorMsg?: string) => void;
  private onPeersChangeCb?: (peers: CollabPeer[]) => void;
  private onTileUpdatesCb?: (updates: TileUpdate[]) => void;
  private onCellErasedCb?: (col: number, row: number) => void;
  private onLevelSyncCb?: (level: LevelData) => void;
  private onRequestSyncCb?: (fromPeerId: string) => void;

  private lastCursorSend = 0;

  constructor(roomCode = 'LIVE', name?: string) {
    let savedId = sessionStorage.getItem('emberdeep_peer_id');
    if (!savedId) {
      savedId = crypto.randomUUID();
      sessionStorage.setItem('emberdeep_peer_id', savedId);
    }
    this.peerId = savedId;
    this.roomCode = (roomCode || 'LIVE').toUpperCase().trim();
    this.name = name?.trim() || `Игрок_${this.peerId.slice(0, 4)}`;
    const colorIndex = Math.abs(this.hashCode(this.peerId)) % PEER_COLORS.length;
    this.color = PEER_COLORS[colorIndex];
  }

  static generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  public async connect(): Promise<void> {
    const channelName = `emberdeep_map_${this.roomCode}`;
    this.status = 'connecting';
    this.onStatusChangeCb?.('connecting');

    // Remove any pre-existing channel with this topic before creating new one
    try {
      const existing = supabase.getChannels().find(
        (c) => c.topic === `realtime:${channelName}` || c.topic === channelName
      );
      if (existing) {
        await supabase.removeChannel(existing);
      }
    } catch {
      // ignore cleanup errors
    }

    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.peerId },
        broadcast: { ack: false, self: false },
      },
    });

    // Presence Sync
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState<{ peerId?: string; name: string; color: string; joinedAt: number }>();
        const currentPeerIds = new Set<string>();

        Object.entries(state).forEach(([pId, metas]) => {
          const meta = metas[0];
          const actualPeerId = meta?.peerId || pId;
          if (actualPeerId === this.peerId) return;

          currentPeerIds.add(actualPeerId);
          const existing = this.peers.get(actualPeerId);
          if (existing) {
            existing.name = meta?.name || existing.name;
            existing.color = meta?.color || existing.color;
          } else {
            this.peers.set(actualPeerId, {
              peerId: actualPeerId,
              name: meta?.name || `Игрок_${actualPeerId.slice(0, 4)}`,
              color: meta?.color || '#38bdf8',
              col: -1,
              row: -1,
              worldX: 0,
              worldY: 0,
              tool: 'brush',
              brushSize: 1,
              lastActive: Date.now(),
            });
          }
        });

        // Clean up left peers
        for (const [pId] of this.peers) {
          if (!currentPeerIds.has(pId)) {
            this.peers.delete(pId);
          }
        }

        this.onPeersChangeCb?.(this.getConnectedPeers());
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this.peers.delete(key);
        this.onPeersChangeCb?.(this.getConnectedPeers());
      });

    // Broadcast Handlers
    this.channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (!payload || payload.peerId === this.peerId) return;
        const p = this.peers.get(payload.peerId);
        if (p) {
          p.col = payload.col;
          p.row = payload.row;
          p.worldX = payload.worldX;
          p.worldY = payload.worldY;
          p.tool = payload.tool || p.tool;
          p.brushSize = payload.brushSize || 1;
          p.lastActive = Date.now();
        } else {
          this.peers.set(payload.peerId, {
            peerId: payload.peerId,
            name: payload.name || `Игрок_${payload.peerId.slice(0, 4)}`,
            color: payload.color || '#38bdf8',
            col: payload.col,
            row: payload.row,
            worldX: payload.worldX,
            worldY: payload.worldY,
            tool: payload.tool || 'brush',
            brushSize: payload.brushSize || 1,
            lastActive: Date.now(),
          });
        }
        this.onPeersChangeCb?.(this.getConnectedPeers());
      })
      .on('broadcast', { event: 'tiles_updated' }, ({ payload }) => {
        if (!payload || payload.peerId === this.peerId) return;
        this.onTileUpdatesCb?.(payload.updates || []);
      })
      .on('broadcast', { event: 'cell_erased' }, ({ payload }) => {
        if (!payload || payload.peerId === this.peerId) return;
        this.onCellErasedCb?.(payload.col, payload.row);
      })
      .on('broadcast', { event: 'level_sync' }, ({ payload }) => {
        if (!payload || payload.peerId === this.peerId) return;
        if (payload.targetPeerId && payload.targetPeerId !== this.peerId) return;
        this.onLevelSyncCb?.(payload.level);
      })
      .on('broadcast', { event: 'request_sync' }, ({ payload }) => {
        if (!payload || payload.peerId === this.peerId) return;
        this.onRequestSyncCb?.(payload.peerId);
      });

    this.channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        this.status = 'connected';
        this.onStatusChangeCb?.('connected');
        try {
          await this.channel.track({
            peerId: this.peerId,
            name: this.name,
            color: this.color,
            joinedAt: Date.now(),
          });
          this.sendRequestSync();
        } catch {
          // ignore tracking error
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.status = 'offline';
        this.onStatusChangeCb?.('offline', err?.message || 'Офлайн (нет связи с сервером)');
      }
    });
  }

  public async updateName(newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === this.name) return;
    this.name = trimmed;
    if (this.channel && this.status === 'connected') {
      try {
        await this.channel.track({
          peerId: this.peerId,
          name: this.name,
          color: this.color,
          joinedAt: Date.now(),
        });
      } catch {
        // ignore
      }
    }
  }

  public onStatusChange(cb: (status: CollabStatus, errorMsg?: string) => void): void {
    this.onStatusChangeCb = cb;
  }

  public getConnectedPeers(): CollabPeer[] {
    const now = Date.now();
    return Array.from(this.peers.values()).filter(
      (p) => p.peerId !== this.peerId && now - p.lastActive < 30000
    );
  }

  public onPeersChange(cb: (peers: CollabPeer[]) => void): void {
    this.onPeersChangeCb = cb;
  }

  public onTileUpdates(cb: (updates: TileUpdate[]) => void): void {
    this.onTileUpdatesCb = cb;
  }

  public onCellErased(cb: (col: number, row: number) => void): void {
    this.onCellErasedCb = cb;
  }

  public onLevelSync(cb: (level: LevelData) => void): void {
    this.onLevelSyncCb = cb;
  }

  public onRequestSync(cb: (fromPeerId: string) => void): void {
    this.onRequestSyncCb = cb;
  }

  public sendCursor(col: number, row: number, worldX: number, worldY: number, tool: string, brushSize = 1): void {
    const now = Date.now();
    if (now - this.lastCursorSend < 35) return; // throttle ~30 Hz
    this.lastCursorSend = now;

    void this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        peerId: this.peerId,
        name: this.name,
        color: this.color,
        col,
        row,
        worldX,
        worldY,
        tool,
        brushSize,
      },
    });
  }

  public sendTileUpdates(updates: TileUpdate[]): void {
    if (updates.length === 0) return;
    void this.channel.send({
      type: 'broadcast',
      event: 'tiles_updated',
      payload: { peerId: this.peerId, updates },
    });
  }

  public sendCellErased(col: number, row: number): void {
    void this.channel.send({
      type: 'broadcast',
      event: 'cell_erased',
      payload: { peerId: this.peerId, col, row },
    });
  }

  public sendLevelSync(level: LevelData, targetPeerId?: string): void {
    void this.channel.send({
      type: 'broadcast',
      event: 'level_sync',
      payload: { peerId: this.peerId, level, targetPeerId },
    });
  }

  public sendRequestSync(): void {
    void this.channel.send({
      type: 'broadcast',
      event: 'request_sync',
      payload: { peerId: this.peerId },
    });
  }

  public async disconnect(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
    }
  }
}
