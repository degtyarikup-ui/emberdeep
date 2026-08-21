import Phaser from 'phaser';
import { SCENE } from './keys';
import { TEXTURE, DEPTH, FONT } from '../gfx/registry';
import { TILE_INDEX } from '../gfx/tiles';
import { RoomClient } from '../net/RoomClient';
import { RosterEntry } from '../net/types';
import { HeroClass } from '../entities/Player';

function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: { muted?: boolean; fontSize?: string } = {}
): Phaser.GameObjects.Text {
  const txt = scene.add
    .text(x, y, label, {
      fontFamily: FONT.UI,
      fontSize: opts.fontSize ?? '20px',
      fontStyle: '600',
      color: opts.muted ? '#8b8398' : '#f0e2b8',
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.UI)
    .setPadding(14, 10, 14, 10)
    .setInteractive({ useHandCursor: true });

  txt.on('pointerover', () => {
    if (opts.muted) return;
    scene.tweens.add({ targets: txt, scale: 1.08, duration: 120 });
    txt.setColor('#ffce6b');
  });
  txt.on('pointerout', () => {
    if (opts.muted) return;
    scene.tweens.add({ targets: txt, scale: 1, duration: 120 });
    txt.setColor('#f0e2b8');
  });
  txt.on('pointerdown', () => {
    if (opts.muted) return;
    scene.tweens.add({ targets: txt, scale: 0.96, duration: 60, yoyo: true });
  });

  return txt;
}

function randomName(): string {
  return `Игрок-${Math.floor(1000 + Math.random() * 9000)}`;
}

export class LobbyScene extends Phaser.Scene {
  private resizeTimer?: Phaser.Time.TimerEvent;
  private layer!: Phaser.GameObjects.Container;
  private domInput?: HTMLInputElement;
  private room?: RoomClient;
  private myName = randomName();
  private joinTimeout?: Phaser.Time.TimerEvent;

  private heroClass: HeroClass = 'knight';

  constructor() {
    super(SCENE.LOBBY);
  }

  init(data?: { heroClass?: HeroClass }): void {
    this.heroClass = data?.heroClass ?? 'knight';
  }

  create(): void {
    const { width, height } = this.scale;

    const handleResize = () => {
      this.resizeTimer?.remove();
      this.resizeTimer = this.time.delayedCall(120, () => this.scene.restart());
    };
    this.scale.on('resize', handleResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', handleResize);
      this.destroyDomInput();
    });

    this.lights.enable();
    this.lights.setAmbientColor(0x120e1e);

    const bg = this.add
      .tileSprite(0, 0, width, height, TEXTURE.DUNGEON_TILES, TILE_INDEX.WALL)
      .setOrigin(0, 0)
      .setPipeline('Light2D')
      .setDepth(0);
    this.tweens.add({ targets: bg, tilePositionY: 40, duration: 40000, repeat: -1, yoyo: true });
    this.add.rectangle(0, 0, width, height, 0x0a0710, 0.75).setOrigin(0, 0).setDepth(1);
    this.lights.addLight(width / 2, height * 0.3, 260, 0xcbb3ff, 0.3);

    this.add
      .text(width / 2, height * 0.16, 'СЕТЕВОЙ ОТРЯД', {
        fontFamily: FONT.TITLE,
        fontSize: '34px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setStroke('#0d0a10', 8);

    this.layer = this.add.container(0, 0).setDepth(DEPTH.UI);

    this.add
      .image(width / 2, height / 2, TEXTURE.VIGNETTE)
      .setDepth(DEPTH.OVERLAY)
      .setDisplaySize(width * 1.2, height * 1.2);

    const backBtn = makeButton(this, 60, height - 30, '← МЕНЮ', { fontSize: '13px' });
    backBtn.on('pointerdown', () => this.leaveAndGoTo(SCENE.MENU));

    this.showMenuState();
  }

  private clearLayer(): void {
    this.layer.removeAll(true);
    this.destroyDomInput();
  }

  private showMenuState(): void {
    this.clearLayer();
    const { width, height } = this.scale;

    const createBtn = makeButton(this, width / 2, height * 0.46, 'СОЗДАТЬ КОМНАТУ');
    const joinBtn = makeButton(this, width / 2, height * 0.46 + 46, 'ПРИСОЕДИНИТЬСЯ ПО КОДУ');
    const info = this.add
      .text(width / 2, height * 0.46 + 90, 'До 4 игроков онлайн. Один создаёт комнату и делится коротким кодом.', {
        fontFamily: FONT.UI,
        fontSize: '12px',
        color: '#a89bc4',
        align: 'center',
        wordWrap: { width: width * 0.6 },
      })
      .setOrigin(0.5);

    this.layer.add([createBtn, joinBtn, info]);

    createBtn.on('pointerdown', () => void this.createRoom());
    joinBtn.on('pointerdown', () => this.showJoinEntryState());
  }

  private showJoinEntryState(): void {
    this.clearLayer();
    const { width, height } = this.scale;

    const label = this.add
      .text(width / 2, height * 0.42, 'ВВЕДИТЕ КОД КОМНАТЫ', { fontFamily: FONT.UI, fontSize: '14px', color: '#cfc6dd' })
      .setOrigin(0.5);

    const enterBtn = makeButton(this, width / 2, height * 0.42 + 78, 'ВОЙТИ');
    const backBtn = makeButton(this, width / 2, height * 0.42 + 122, 'НАЗАД', { muted: true, fontSize: '13px' });
    const error = this.add
      .text(width / 2, height * 0.42 + 156, '', { fontFamily: FONT.UI, fontSize: '12px', color: '#c94f3d' })
      .setOrigin(0.5);

    this.layer.add([label, enterBtn, backBtn, error]);

    const input = this.createDomInput(width / 2, height * 0.42 + 36);
    const submit = () => {
      const code = input.value.trim().toUpperCase();
      if (code.length < 4) {
        error.setText('Код слишком короткий');
        return;
      }
      void this.joinRoom(code, error);
    };
    enterBtn.on('pointerdown', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    backBtn.on('pointerdown', () => this.showMenuState());
  }

  private createDomInput(sceneX: number, sceneY: number): HTMLInputElement {
    this.destroyDomInput();
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 5;
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.placeholder = 'AB3K9';
    Object.assign(input.style, {
      position: 'fixed',
      left: `${sceneX}px`,
      top: `${sceneY}px`,
      transform: 'translate(-50%, -50%)',
      width: '160px',
      padding: '8px 10px',
      fontSize: '22px',
      fontFamily: FONT.UI,
      letterSpacing: '4px',
      textAlign: 'center',
      textTransform: 'uppercase',
      background: '#1a1420',
      color: '#f0e2b8',
      border: '2px solid #6b5d8a',
      borderRadius: '4px',
      outline: 'none',
      zIndex: '10',
    } as CSSStyleDeclaration);
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    document.body.appendChild(input);
    this.domInput = input;
    input.focus();
    return input;
  }

  private destroyDomInput(): void {
    this.domInput?.remove();
    this.domInput = undefined;
  }

  private async createRoom(): Promise<void> {
    this.clearLayer();
    const { width, height } = this.scale;
    const status = this.add
      .text(width / 2, height * 0.46, 'Создаю комнату…', { fontFamily: FONT.UI, fontSize: '14px', color: '#cfc6dd' })
      .setOrigin(0.5);
    this.layer.add(status);

    try {
      this.room = await RoomClient.host(this.myName);
      this.showRoomState();
    } catch (err) {
      status.setText('Не удалось создать комнату. Проверьте интернет-соединение.');
      status.setColor('#c94f3d');
      console.error(err);
    }
  }

  private async joinRoom(code: string, errorLabel: Phaser.GameObjects.Text): Promise<void> {
    errorLabel.setText('Подключаюсь…').setColor('#cfc6dd');
    try {
      this.room = await RoomClient.join(code, this.myName);
      this.room.onStart((depth) => this.enterGame(depth));

      let gotRoster = false;
      this.room.onRoster(() => {
        gotRoster = true;
      });

      this.joinTimeout = this.time.delayedCall(5000, () => {
        if (!gotRoster) {
          errorLabel.setText('Хост не найден — проверьте код');
          errorLabel.setColor('#c94f3d');
          void this.room?.leave();
          this.room = undefined;
        } else {
          this.showRoomState();
        }
      });

      const check = this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          if (gotRoster) {
            check.remove();
            this.joinTimeout?.remove();
            this.showRoomState();
          }
        },
      });
    } catch (err) {
      errorLabel.setText('Не удалось подключиться');
      errorLabel.setColor('#c94f3d');
      console.error(err);
    }
  }

  private showRoomState(): void {
    if (!this.room) return;
    this.clearLayer();
    const { width, height } = this.scale;
    const room = this.room;

    if (room.role === 'host') {
      this.add
        .text(width / 2, height * 0.32, 'КОД КОМНАТЫ', { fontFamily: FONT.UI, fontSize: '12px', color: '#a89bc4' })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI);
      const codeText = this.add
        .text(width / 2, height * 0.32 + 30, room.code, {
          fontFamily: FONT.TITLE,
          fontSize: '40px',
          fontStyle: '700',
          color: '#b89840',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI)
        .setStroke('#0d0a10', 6);
      this.layer.add(codeText);
    } else {
      const waiting = this.add
        .text(width / 2, height * 0.32 + 10, 'Ожидание хоста…', { fontFamily: FONT.UI, fontSize: '14px', color: '#cfc6dd' })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI);
      this.layer.add(waiting);
    }

    const rosterLabel = this.add
      .text(width / 2, height * 0.5, '', {
        fontFamily: FONT.UI,
        fontSize: '13px',
        color: '#f0e2b8',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);
    this.layer.add(rosterLabel);

    const renderRoster = (roster: RosterEntry[]) => {
      const lines = roster
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((r) => `Игрок ${r.slot + 1}${r.peerId === room.peerId ? ' (вы)' : ''}${r.slot === 0 ? ' — хост' : ''}`);
      rosterLabel.setText(lines.join('\n'));
    };
    renderRoster(room.currentRoster);
    room.onRoster(renderRoster);

    if (room.role === 'host') {
      const startBtn = makeButton(this, width / 2, height * 0.68, 'НАЧАТЬ ИГРУ');
      startBtn.on('pointerdown', () => {
        room.sendStart(1);
        this.enterGame(1);
      });
      this.layer.add(startBtn);
    }

    const cancelBtn = makeButton(this, width / 2, height * 0.68 + (room.role === 'host' ? 46 : 0), 'ПОКИНУТЬ КОМНАТУ', {
      muted: true,
      fontSize: '13px',
    });
    cancelBtn.on('pointerdown', () => this.leaveAndGoTo(SCENE.MENU));
    this.layer.add(cancelBtn);
  }

  private enterGame(depth: number): void {
    if (!this.room) return;
    this.cameras.main.fadeOut(280, 8, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE.GAME, { depth, net: { role: this.room!.role, room: this.room! }, heroClass: this.heroClass });
    });
  }

  private leaveAndGoTo(sceneKey: string): void {
    void this.room?.leave();
    this.room = undefined;
    this.scene.start(sceneKey);
  }
}
