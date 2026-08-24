import './mapEditor.css';
import { ICONS } from './icons';
import {
  EDITOR_TILE,
  TILE_METAS,
  ENTITY_PALETTE,
  DEFAULT_CUSTOM_BRUSHES,
  type CustomBrush,
  type TileSubCategory,
  applyBrushShapeMask,
  rotateBrushMatrixClockwise,
  rotateBrushMatrixCounterClockwise,
  flipBrushHorizontal,
  flipBrushVertical,
  validateLevelData,
  createEmptyLevel,
  serializeLevelToJson,
  deserializeLevelFromJson,
  type EditorTileType,
  type ValidationResult,
} from './mapEditorHelper';
import { editorAssets } from './editorAssets';
import { MapCollabClient, type TileUpdate } from './mapCollab';
import { buildLevel1, type LevelData } from '../world/level1';
import { getBiomeForDepth, type BiomeId } from '../world/biomes';
import type { EnemyKind } from '../entities/Enemy';
import type { PropKey } from '../gfx/propKeys';

import {
  SMART_BRUSHES,
  getFamilyForTile,
  getBaseTileForFamily,
  calculateAutotileCell,
} from './autotileHelper';
import { bakeLevelViaGitHubApi, TOKEN_KEY } from './githubBake';

interface DrawableEntity {
  col: number;
  row: number;
  spriteId: string;
  type: 'poi' | 'enemy' | 'pickup' | 'prop' | 'tree';
  metaColor?: string;
}

export class MapEditor {
  private container: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private viewport!: HTMLElement;

  private level: LevelData;
  private zoom = 1.0;
  private panX = 40;
  private panY = 40;
  private tileSize = 28;

  private activeTool: 'brush' | 'rect' | 'eraser' | 'picker' | 'inspect' | 'hand' | 'custom_brush' = 'brush';
  private activeCategory: 'tiles' | 'smart_brush' | 'custom_brush' | 'poi' | 'npc' | 'enemy' | 'pickup' | 'prop' | 'tree' = 'tiles';
  private activeItemId: string | number = EDITOR_TILE.FLOOR;
  private brushSize = 1;
  private searchQuery = '';
  private tileSubCategory: TileSubCategory = 'all';

  private customBrushes: CustomBrush[] = [];
  private activeCustomBrushId?: string;

  private isMouseDown = false;
  private isPanning = false;
  private isSpaceHeld = false;
  private panStartX = 0;
  private panStartY = 0;
  private rectStartCol = -1;
  private rectStartRow = -1;
  private lastPaintCol = -1;
  private lastPaintRow = -1;
  private hoverCol = -1;
  private hoverRow = -1;
  private showGrid = true;

  private history: string[] = [];
  private historyIndex = -1;

  private collabClient?: MapCollabClient;
  private autoSaveTimer?: number;

  constructor(targetEl: HTMLElement) {
    this.container = targetEl;
    this.loadCustomBrushes();

    // Restore draft from localStorage if available
    const savedDraft = localStorage.getItem('emberdeep_map_editor_draft');
    if (savedDraft) {
      try {
        this.level = deserializeLevelFromJson(savedDraft);
      } catch {
        this.level = buildLevel1(1);
      }
    } else {
      this.level = buildLevel1(1);
    }
    this.pushHistory();
  }

  public init(): void {
    this.renderLayout();
    this.initCanvas();
    this.initEvents();
    this.renderPalette();
    this.updateStatus();

    // Restore camera pan/zoom view if saved, otherwise fitToView
    const savedView = sessionStorage.getItem('emberdeep_map_view');
    if (savedView) {
      try {
        const v = JSON.parse(savedView);
        if (typeof v.panX === 'number' && typeof v.panY === 'number' && typeof v.zoom === 'number') {
          this.panX = v.panX;
          this.panY = v.panY;
          this.zoom = v.zoom;
          const hudLabel = document.getElementById('me-hud-zoom-val');
          if (hudLabel) hudLabel.textContent = `${Math.round(this.zoom * 100)}%`;
        } else {
          this.fitToView();
        }
      } catch {
        this.fitToView();
      }
    } else {
      this.fitToView();
    }

    // Auto-connect real-time collaboration immediately without setup
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('mapRoom') || 'LIVE';
    void this.connectCollab(roomCode);

    // Precaution against abrupt reloads / tab close / crashes
    window.addEventListener('beforeunload', (e) => {
      try {
        const draft = serializeLevelToJson(this.level);
        localStorage.setItem('emberdeep_map_editor_draft', draft);
        localStorage.setItem('emberdeep_map_editor_backup', draft);
      } catch {
        // ignore
      }
      if (this.historyIndex > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Auto-save on visibility change (switching tabs or backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        try {
          const draft = serializeLevelToJson(this.level);
          localStorage.setItem('emberdeep_map_editor_draft', draft);
          localStorage.setItem('emberdeep_map_editor_backup', draft);
        } catch {
          // ignore
        }
      }
    });

    // Preload actual in-game textures
    editorAssets.preloadAll(() => {
      this.renderPalette();
      this.draw();
    });
  }

  private pushHistory(): void {
    const serialized = serializeLevelToJson(this.level);
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === serialized) return;

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(serialized);
    if (this.history.length > 30) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.scheduleAutoSave();
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) window.clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = window.setTimeout(() => {
      try {
        const json = serializeLevelToJson(this.level);
        localStorage.setItem('emberdeep_map_editor_draft', json);
        const badge = document.getElementById('me-draft-status');
        if (badge) {
          badge.textContent = '✓ Сохранено';
          badge.style.color = '#4ade80';
        }
      } catch {
        // ignore
      }
    }, 400);
  }

  private resetDraft(): void {
    if (!confirm('Сбросить несохраненный локальный черновик и перезагрузить чистый пресет?')) return;
    localStorage.removeItem('emberdeep_map_editor_draft');
    this.level = buildLevel1(1);
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    this.updateStatus();
    this.fitToView();
    this.draw();
    if (this.collabClient) {
      this.collabClient.sendLevelSync(this.level);
    }
  }

  public undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.level = deserializeLevelFromJson(this.history[this.historyIndex]);
      this.scheduleAutoSave();
      this.draw();
      this.updateStatus();
      if (this.collabClient) {
        this.collabClient.sendLevelSync(this.level);
      }
    }
  }

  public redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.level = deserializeLevelFromJson(this.history[this.historyIndex]);
      this.scheduleAutoSave();
      this.draw();
      this.updateStatus();
      if (this.collabClient) {
        this.collabClient.sendLevelSync(this.level);
      }
    }
  }

  private renderLayout(): void {
    this.container.innerHTML = `
      <div class="map-editor-container">
        <!-- Top Toolbar (Compact Single Line) -->
        <div class="me-toolbar">
          <div class="me-toolbar-group">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Пресет:</label>
            <select id="me-preset-select" class="me-select" style="max-width: 165px;">
              <option value="1">1: Темный Лес (200x80)</option>
              <option value="2">2: Руины (60x38)</option>
              <option value="3">3: Катакомбы (60x38)</option>
              <option value="4">4: Глубины (60x38)</option>
              <option value="5">5: Бездна (60x38)</option>
              <option value="empty_forest">Новая: Лес (60x38)</option>
              <option value="empty_ruins">Новая: Руины (60x38)</option>
              <option value="empty_dungeon">Новая: Катакомбы (60x38)</option>
            </select>
            <button id="me-load-preset-btn" class="me-btn" title="Загрузить выбранный пресет">Загрузить</button>
            <button id="me-reset-draft-btn" class="me-btn" title="Сбросить локальные правки к пресету">${ICONS.rotateCcw}</button>
            <span id="me-draft-status" style="font-size:10px; color:#4ade80; margin-left:2px; font-weight:500;">✓ Автосохранение</span>
          </div>

          <div class="me-toolbar-group">
            <span class="me-divider"></span>
            <label style="font-size:11px; color:var(--text-tertiary);">Биом:</label>
            <select id="me-biome-select" class="me-select" style="max-width: 105px;">
              <option value="forest">Темный Лес</option>
              <option value="ruins">Руины</option>
              <option value="catacombs">Катакомбы</option>
              <option value="depths">Глубины</option>
              <option value="void">Бездна</option>
            </select>

            <label style="font-size:11px; color:var(--text-tertiary); margin-left:2px;">Сетка:</label>
            <input id="me-cols-input" type="number" class="me-input me-input-number" min="10" max="300" value="${this.level.cols}">
            <span style="color:var(--text-tertiary);">x</span>
            <input id="me-rows-input" type="number" class="me-input me-input-number" min="10" max="200" value="${this.level.rows}">
            <button id="me-resize-btn" class="me-btn" title="Применить размер">OK</button>
          </div>

          <div class="me-toolbar-group">
            <span class="me-divider"></span>
            <button id="me-play-test-btn" class="me-btn" style="background:#16a34a; color:#ffffff; font-weight:700; border:1px solid #22c55e;" title="Запустить и протестировать уровень прямо в игре">
              ▶ Играть на карте
            </button>
            <button id="me-bake-prod-btn" class="me-btn" style="background:#4f46e5; color:#ffffff; font-weight:600; border:1px solid #6366f1;" title="Вшить созданную карту в релизную сборку игры">
              ${ICONS.sparkles} Вшить в игру
            </button>
            <button id="me-save-json-btn" class="me-btn" title="Сохранить проект карты в файл .json">
              ${ICONS.save} Сохранить JSON
            </button>
            <button id="me-load-json-btn" class="me-btn" title="Открыть проект карты .json">
              ${ICONS.folder} Загрузить
            </button>
            <input type="file" id="me-file-input" style="display:none;" accept=".json">
          </div>
        </div>

        <!-- Main Workspace -->
        <div class="me-main">
          <!-- Left Palette Sidebar -->
          <div class="me-sidebar">
            <div class="me-tools-bar">
              <button class="me-tool-btn" data-tool="hand" title="Рука / Панорамирование (H или Пробел)">
                ${ICONS.hand}
              </button>
              <button class="me-tool-btn active" data-tool="brush" title="Кисть (B)">
                ${ICONS.brush}
              </button>
              <button class="me-tool-btn" data-tool="custom_brush" title="Пользовательская кисть / Штамп (C)">
                ${ICONS.sparkles}
              </button>
              <button class="me-tool-btn" data-tool="rect" title="Область (R)">
                ${ICONS.rect}
              </button>
              <button class="me-tool-btn" data-tool="eraser" title="Ластик (E)">
                ${ICONS.eraser}
              </button>
              <button class="me-tool-btn" data-tool="picker" title="Пипетка (I)">
                ${ICONS.picker}
              </button>
              <button class="me-tool-btn" data-tool="inspect" title="Инфо о клетке">
                ${ICONS.target}
              </button>
            </div>

            <div class="me-brush-slider-box">
              <div class="me-brush-slider-header">
                <span class="me-brush-slider-title">Размер кисти</span>
                <span id="me-brush-size-val" class="me-brush-slider-badge">${this.brushSize}x${this.brushSize}</span>
              </div>
              <input type="range" id="me-brush-slider" min="1" max="6" step="1" value="${this.brushSize}" class="me-range-slider" title="Регулировка размера кисти ([ / ])">
            </div>

            <div class="me-category-tabs">
              <button class="me-tab-btn active" data-cat="tiles" title="Тайлы (клавиша 1)">Тайлы</button>
              <button class="me-tab-btn" data-cat="smart_brush" title="Умные авто-кисти (клавиша 2)">${ICONS.sparkles} Авто-кисти</button>
              <button class="me-tab-btn" data-cat="custom_brush" title="Конструктор кистей (клавиша 3)">${ICONS.brush} Мои кисти</button>
              <button class="me-tab-btn" data-cat="tree" title="Деревья (клавиша 4)">Деревья</button>
              <button class="me-tab-btn" data-cat="prop" title="Пропсы (клавиша 5)">Пропсы</button>
              <button class="me-tab-btn" data-cat="pickup" title="Лут (клавиша 6)">Лут</button>
              <button class="me-tab-btn" data-cat="enemy" title="Враги (клавиша 7)">Враги</button>
              <button class="me-tab-btn" data-cat="poi" title="Точки (клавиша 8)">Точки</button>
            </div>

            <div class="me-palette-search-box">
              <span style="color:var(--text-tertiary); display:flex;">${ICONS.search}</span>
              <input type="text" id="me-palette-search" class="me-palette-search-input" placeholder="Поиск элементов...">
            </div>

            <div id="me-palette-list" class="me-palette-list"></div>
          </div>

          <!-- Center Canvas Viewport -->
          <div id="me-canvas-viewport" class="me-canvas-viewport">
            <canvas id="me-canvas" class="me-canvas"></canvas>

            <!-- Floating View Navigator (Bottom Right) -->
            <div class="me-floating-hud">
              <button id="me-hud-grid" class="me-hud-btn ${this.showGrid ? 'active' : ''}" style="width:auto; padding:0 6px;" title="Вкл/Выкл сетку (G)">
                Сетка
              </button>
              <span class="me-hud-divider" style="width:1px; height:14px; background:rgba(255,255,255,0.15); margin:0 2px;"></span>
              <button id="me-hud-zoom-out" class="me-hud-btn" title="Уменьшить (-)">-</button>
              <span id="me-hud-zoom-val" class="me-hud-zoom-text" title="Клик для сброса на 100%">100%</span>
              <button id="me-hud-zoom-in" class="me-hud-btn" title="Увеличить (+)">+</button>
              <button id="me-hud-fit" class="me-hud-btn" style="width:auto; padding:0 6px;" title="По размеру (Shift+1)">Fit</button>
            </div>
          </div>
        </div>

        <!-- Bottom Status Bar -->
        <div class="me-statusbar">
          <div class="me-status-left">
            <span id="me-coords-label" style="font-family:var(--font-mono, monospace);">Клетка: [—, —]</span>
            <span id="me-cell-info">Инструмент: Кисть (B) · Перемещение: Пробел + ЛКМ</span>
            <span id="me-validation-badge" class="me-status-badge me-badge-valid">Проверка: OK</span>
          </div>

          <div class="me-status-right">
            <span id="me-stats-summary">Врагов: 0 · Сундуков: 0 · Деревьев: 0 · Декора: 0</span>
          </div>
        </div>
      </div>
    `;

    const biomeSelect = document.getElementById('me-biome-select') as HTMLSelectElement;
    if (biomeSelect) biomeSelect.value = this.level.biome.id;
  }

  private initCanvas(): void {
    this.viewport = document.getElementById('me-canvas-viewport') as HTMLElement;
    this.canvas = document.getElementById('me-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const rect = this.viewport.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  private initEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Toolbar events
    document.getElementById('me-load-preset-btn')?.addEventListener('click', () => {
      const select = document.getElementById('me-preset-select') as HTMLSelectElement;
      const val = select.value;
      if (val.startsWith('empty_')) {
        const rawId = val.replace('empty_', '');
        const bId: BiomeId = rawId === 'dungeon' ? 'catacombs' : (rawId as BiomeId);
        this.level = createEmptyLevel(bId);
      } else {
        const depth = parseInt(val, 10) || 1;
        this.level = buildLevel1(depth);
      }
      (document.getElementById('me-cols-input') as HTMLInputElement).value = String(this.level.cols);
      (document.getElementById('me-rows-input') as HTMLInputElement).value = String(this.level.rows);
      (document.getElementById('me-biome-select') as HTMLSelectElement).value = this.level.biome.id;
      this.fitToView();
      this.pushHistory();
      this.updateStatus();
    });

    document.getElementById('me-biome-select')?.addEventListener('change', (e) => {
      const bId = (e.target as HTMLSelectElement).value as BiomeId;
      const depthMap: Record<BiomeId, number> = { forest: 1, ruins: 2, catacombs: 3, depths: 4, void: 5 };
      this.level.biome = getBiomeForDepth(depthMap[bId] || 1);
      this.renderPalette();
      this.draw();
    });

    document.getElementById('me-resize-btn')?.addEventListener('click', () => {
      const newCols = parseInt((document.getElementById('me-cols-input') as HTMLInputElement).value, 10);
      const newRows = parseInt((document.getElementById('me-rows-input') as HTMLInputElement).value, 10);
      if (newCols >= 10 && newRows >= 10) {
        this.resizeGrid(newCols, newRows);
      }
    });

    document.getElementById('me-hud-grid')?.addEventListener('click', (e) => {
      this.showGrid = !this.showGrid;
      (e.currentTarget as HTMLElement).classList.toggle('active', this.showGrid);
      this.draw();
    });

    document.getElementById('me-hud-fit')?.addEventListener('click', () => this.fitToView());
    document.getElementById('me-hud-zoom-in')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
    document.getElementById('me-hud-zoom-out')?.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
    document.getElementById('me-hud-zoom-val')?.addEventListener('click', () => this.setZoom(1.0));

    document.getElementById('me-reset-draft-btn')?.addEventListener('click', () => this.resetDraft());
    document.getElementById('me-collab-status')?.addEventListener('click', () => this.showCollabModal());

    document.getElementById('me-play-test-btn')?.addEventListener('click', () => this.playTestMap());
    document.getElementById('me-bake-prod-btn')?.addEventListener('click', () => this.bakeToGame());
    document.getElementById('me-save-json-btn')?.addEventListener('click', () => this.downloadJson());
    document.getElementById('me-load-json-btn')?.addEventListener('click', () => {
      document.getElementById('me-file-input')?.click();
    });

    document.getElementById('me-file-input')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            this.level = deserializeLevelFromJson(reader.result as string);
            (document.getElementById('me-cols-input') as HTMLInputElement).value = String(this.level.cols);
            (document.getElementById('me-rows-input') as HTMLInputElement).value = String(this.level.rows);
            (document.getElementById('me-biome-select') as HTMLSelectElement).value = this.level.biome.id;
            this.fitToView();
            this.pushHistory();
            this.updateStatus();
          } catch (err) {
            alert(`Ошибка чтения файла: ${err instanceof Error ? err.message : String(err)}`);
          }
        };
        reader.readAsText(file);
      }
    });

    // Brush size selector
    document.querySelectorAll('.me-size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = Number(btn.getAttribute('data-size')) || 1;
        this.setBrushSize(size);
      });
    });

    // Brush size slider
    const slider = document.getElementById('me-brush-slider') as HTMLInputElement | null;
    slider?.addEventListener('input', (e) => {
      const size = Number((e.target as HTMLInputElement).value) || 1;
      this.setBrushSize(size);
    });

    // Palette Search
    document.getElementById('me-palette-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderPalette();
    });

    // Tool switching
    document.querySelectorAll('.me-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.me-tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.getAttribute('data-tool') as typeof this.activeTool;
        this.updateCursorState();
        this.updateStatus();
      });
    });

    // Category tabs
    document.querySelectorAll('.me-tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.me-tab-btn').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-cat') as typeof this.activeCategory;
        if (this.activeCategory === 'smart_brush') {
          if (!SMART_BRUSHES.some((b) => b.id === this.activeItemId)) {
            this.activeItemId = SMART_BRUSHES[0].id;
          }
        } else if (this.activeCategory === 'tiles') {
          if (typeof this.activeItemId !== 'number') {
            this.activeItemId = EDITOR_TILE.FLOOR;
          }
        }
        this.renderPalette();
      });
    });

    // Canvas Mouse Interaction
    this.viewport.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.viewport.addEventListener('contextmenu', (e) => e.preventDefault());

    // Spacebar and keyboard shortcut listeners
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      // Spacebar hold for Figma-style panning
      if (e.code === 'Space' && !this.isSpaceHeld) {
        e.preventDefault();
        this.isSpaceHeld = true;
        this.updateCursorState();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) this.redo();
        else this.undo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        this.redo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Digit0')) {
        this.fitToView();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.code === 'Digit1')) {
        this.setZoom(1.0);
        e.preventDefault();
      } else if (e.key === 'b' || e.key === 'B') {
        this.setTool('brush');
      } else if (e.key === 'c' || e.key === 'C') {
        this.setTool('custom_brush');
        this.activeCategory = 'custom_brush';
        document.querySelectorAll('.me-tab-btn').forEach((t) => {
          t.classList.toggle('active', t.getAttribute('data-cat') === 'custom_brush');
        });
        this.renderPalette();
      } else if (e.key === 'r' || e.key === 'R') {
        if (this.activeTool === 'custom_brush') {
          const idx = this.customBrushes.findIndex((b) => b.id === this.activeCustomBrushId);
          if (idx !== -1) {
            this.customBrushes[idx] = rotateBrushMatrixClockwise(this.customBrushes[idx]);
            this.saveCustomBrushes();
            this.renderPalette();
            this.draw();
          }
        } else {
          this.setTool('rect');
        }
      } else if (e.key === 'e' || e.key === 'E') {
        this.setTool('eraser');
      } else if (e.key === 'i' || e.key === 'I') {
        this.setTool('picker');
      } else if (e.key === 'h' || e.key === 'H') {
        this.setTool('hand');
      } else if (e.key === '[' || e.code === 'BracketLeft') {
        this.setBrushSize(Math.max(1, this.brushSize - 1));
      } else if (e.key === ']' || e.code === 'BracketRight') {
        this.setBrushSize(Math.min(6, this.brushSize + 1));
      } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const catMap: Record<string, typeof this.activeCategory> = {
          '1': 'tiles',
          '2': 'smart_brush',
          '3': 'custom_brush',
          '4': 'tree',
          '5': 'prop',
          '6': 'pickup',
          '7': 'enemy',
          '8': 'poi',
        };
        const targetCat = catMap[e.key];
        if (targetCat) {
          this.activeCategory = targetCat;
          document.querySelectorAll('.me-tab-btn').forEach((t) => {
            t.classList.toggle('active', t.getAttribute('data-cat') === targetCat);
          });
          this.renderPalette();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceHeld = false;
        this.updateCursorState();
      }
    });

    window.addEventListener('blur', () => {
      this.isSpaceHeld = false;
      this.isPanning = false;
      this.updateCursorState();
    });
  }

  private updateCursorState(): void {
    if (this.isPanning) {
      this.viewport.classList.add('panning-active');
      this.viewport.classList.remove('space-panning');
    } else if (this.isSpaceHeld || this.activeTool === 'hand') {
      this.viewport.classList.add('space-panning');
      this.viewport.classList.remove('panning-active');
    } else {
      this.viewport.classList.remove('space-panning');
      this.viewport.classList.remove('panning-active');
    }
  }

  private setTool(tool: typeof this.activeTool): void {
    this.activeTool = tool;
    document.querySelectorAll('.me-tool-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
    });
    this.updateCursorState();
    this.updateStatus();
  }

  private renderPalette(): void {
    const listEl = document.getElementById('me-palette-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (this.activeCategory === 'tiles') {
      const subCats: { id: TileSubCategory; label: string }[] = [
        { id: 'all', label: 'Все' },
        { id: 'ground', label: 'Земля' },
        { id: 'paths', label: 'Тропы' },
        { id: 'water', label: 'Вода/Берег' },
        { id: 'cliffs', label: 'Скалы' },
        { id: 'cobble', label: 'Камень' },
        { id: 'walls', label: 'Стены' },
      ];

      const subcatBar = document.createElement('div');
      subcatBar.className = 'me-subcategory-bar';
      subCats.forEach((sc) => {
        const btn = document.createElement('button');
        btn.className = `me-subcat-btn ${this.tileSubCategory === sc.id ? 'active' : ''}`;
        btn.textContent = sc.label;
        btn.addEventListener('click', () => {
          this.tileSubCategory = sc.id;
          this.renderPalette();
        });
        subcatBar.appendChild(btn);
      });
      listEl.appendChild(subcatBar);

      let tiles = Object.values(TILE_METAS);
      if (this.tileSubCategory !== 'all') {
        tiles = tiles.filter((t) => t.subCategory === this.tileSubCategory);
      }
      if (this.searchQuery) {
        tiles = tiles.filter((t) => t.name.toLowerCase().includes(this.searchQuery));
      }

      tiles.forEach((t) => {
        const item = document.createElement('div');
        const isActive = this.activeItemId === t.id && this.activeTool !== 'custom_brush';
        item.className = `me-palette-item ${isActive ? 'active' : ''}`;

        const previewImg = editorAssets.getTilePreviewUrl(t.id, this.level.biome.id);
        const iconContent = previewImg
          ? `<img src="${previewImg}" alt="${t.name}">`
          : `<div style="width:100%; height:100%; background:${t.color};"></div>`;

        item.innerHTML = `
          <div class="me-palette-icon" style="border: 1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'};">
            ${iconContent}
          </div>
          <div class="me-palette-label">${t.name}</div>
        `;
        item.addEventListener('click', () => {
          this.activeItemId = t.id;
          this.renderPalette();
          if (this.activeTool === 'hand' || this.activeTool === 'eraser' || this.activeTool === 'picker' || this.activeTool === 'custom_brush') {
            this.setTool('brush');
          }
        });
        listEl.appendChild(item);
      });
    } else if (this.activeCategory === 'smart_brush') {
      const banner = document.createElement('div');
      banner.style.padding = '8px 10px';
      banner.style.margin = '4px 6px 8px 6px';
      banner.style.background = 'rgba(34, 197, 94, 0.08)';
      banner.style.border = '1px solid rgba(34, 197, 94, 0.2)';
      banner.style.borderRadius = '6px';
      banner.style.fontSize = '11px';
      banner.style.color = '#86efac';
      banner.style.lineHeight = '1.4';
      banner.innerHTML = `<strong>${ICONS.sparkles} Умные кисти</strong> автоматически подбирают и стыкуют внешние/внутренние углы, берега и бордюры при рисовании.`;
      listEl.appendChild(banner);

      SMART_BRUSHES.forEach((b) => {
        const item = document.createElement('div');
        const isActive = this.activeItemId === b.id && this.activeTool !== 'custom_brush';
        item.className = `me-palette-item ${isActive ? 'active' : ''}`;
        item.style.alignItems = 'flex-start';
        item.style.padding = '8px';

        const previewImg = editorAssets.getTilePreviewUrl(b.previewTileId, this.level.biome.id);
        const iconContent = previewImg
          ? `<img src="${previewImg}" alt="${b.name}">`
          : `<div style="width:100%; height:100%; background:#22c55e;"></div>`;

        item.innerHTML = `
          <div class="me-palette-icon" style="border: 1px solid ${isActive ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}; margin-top:2px; flex-shrink:0;">
            ${iconContent}
          </div>
          <div style="flex:1; display:flex; flex-direction:column; gap:2px; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="me-palette-label" style="font-weight:600; color:var(--text-primary); font-size:12px;">${b.name}</span>
              <span style="font-size:9px; font-weight:700; background:rgba(34,197,94,0.2); color:#4ade80; padding:1px 4px; border-radius:3px;">AUTO</span>
            </div>
            <div style="font-size:10px; color:var(--text-tertiary); line-height:1.25;">${b.description}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          this.activeItemId = b.id;
          this.renderPalette();
          if (this.activeTool === 'hand' || this.activeTool === 'eraser' || this.activeTool === 'picker' || this.activeTool === 'custom_brush') {
            this.setTool('brush');
          }
        });
        listEl.appendChild(item);
      });
    } else if (this.activeCategory === 'custom_brush') {
      const topBar = document.createElement('div');
      topBar.style.padding = '4px 6px 8px 6px';
      topBar.style.display = 'flex';
      topBar.style.flexDirection = 'column';
      topBar.style.gap = '6px';

      const createBtn = document.createElement('button');
      createBtn.className = 'me-btn me-btn-primary';
      createBtn.style.width = '100%';
      createBtn.style.justifyContent = 'center';
      createBtn.innerHTML = `${ICONS.plus} Конструктор новой кисти`;
      createBtn.addEventListener('click', () => {
        this.openBrushDesignerModal();
      });
      topBar.appendChild(createBtn);
      listEl.appendChild(topBar);

      let brushes = this.customBrushes;
      if (this.searchQuery) {
        brushes = brushes.filter((b) => b.name.toLowerCase().includes(this.searchQuery));
      }

      brushes.forEach((brush) => {
        const isActive = this.activeCustomBrushId === brush.id && this.activeTool === 'custom_brush';
        const card = document.createElement('div');
        card.className = `me-brush-card ${isActive ? 'active' : ''}`;

        const previewContainer = document.createElement('div');
        previewContainer.className = 'me-brush-card-preview';
        const canvas = document.createElement('canvas');
        this.renderCustomBrushPreview(canvas, brush);
        previewContainer.appendChild(canvas);

        const info = document.createElement('div');
        info.className = 'me-brush-card-info';
        info.innerHTML = `
          <div class="me-brush-card-name">${brush.name}</div>
          <div class="me-brush-card-dim">${brush.width}x${brush.height} тайлов</div>
        `;

        const actions = document.createElement('div');
        actions.className = 'me-brush-card-actions';

        const rotBtn = document.createElement('button');
        rotBtn.className = 'me-brush-card-btn';
        rotBtn.title = 'Повернуть кисть на 90° (клавиша R)';
        rotBtn.innerHTML = ICONS.rotateCw;
        rotBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = this.customBrushes.findIndex((b) => b.id === brush.id);
          if (idx !== -1) {
            this.customBrushes[idx] = rotateBrushMatrixClockwise(this.customBrushes[idx]);
            this.saveCustomBrushes();
            this.renderPalette();
            this.draw();
          }
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'me-brush-card-btn';
        editBtn.title = 'Редактировать в конструкторе';
        editBtn.innerHTML = ICONS.edit;
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openBrushDesignerModal(brush);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'me-brush-card-btn';
        delBtn.title = 'Удалить кисть';
        delBtn.innerHTML = ICONS.trash;
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Удалить кисть "${brush.name}"?`)) {
            this.customBrushes = this.customBrushes.filter((b) => b.id !== brush.id);
            this.saveCustomBrushes();
            if (this.activeCustomBrushId === brush.id && this.customBrushes.length > 0) {
              this.activeCustomBrushId = this.customBrushes[0].id;
            }
            this.renderPalette();
            this.draw();
          }
        });

        actions.appendChild(rotBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        card.appendChild(previewContainer);
        card.appendChild(info);
        card.appendChild(actions);

        card.addEventListener('click', () => {
          this.activeCustomBrushId = brush.id;
          this.setTool('custom_brush');
          this.renderPalette();
          this.draw();
        });

        listEl.appendChild(card);
      });
    } else {
      let items = ENTITY_PALETTE.filter((e) => e.category === this.activeCategory);
      if (this.searchQuery) {
        items = items.filter((e) => e.name.toLowerCase().includes(this.searchQuery));
      }

      items.forEach((ent) => {
        const item = document.createElement('div');
        const isActive = this.activeItemId === ent.id && this.activeTool !== 'custom_brush';
        item.className = `me-palette-item ${isActive ? 'active' : ''}`;

        const previewImg = editorAssets.getPreviewUrl(ent.id);
        const iconContent = previewImg
          ? `<img src="${previewImg}" alt="${ent.name}">`
          : `<span style="color:${ent.color}; font-size:10px; font-weight:600;">${ent.icon}</span>`;

        item.innerHTML = `
          <div class="me-palette-icon" style="border: 1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'};">
            ${iconContent}
          </div>
          <div class="me-palette-label">${ent.name}</div>
        `;
        item.addEventListener('click', () => {
          this.activeItemId = ent.id;
          this.renderPalette();
          if (this.activeTool === 'hand' || this.activeTool === 'eraser' || this.activeTool === 'picker' || this.activeTool === 'custom_brush') {
            this.setTool('brush');
          }
        });
        listEl.appendChild(item);
      });
    }
  }

  private setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(6, size));
    const badge = document.getElementById('me-brush-size-val');
    if (badge) badge.textContent = `${this.brushSize}x${this.brushSize}`;
    const slider = document.getElementById('me-brush-slider') as HTMLInputElement | null;
    if (slider && Number(slider.value) !== this.brushSize) {
      slider.value = String(this.brushSize);
    }
    this.draw();
  }

  private setZoom(newZoom: number, originX?: number, originY?: number): void {
    const clamped = Math.max(0.15, Math.min(4.0, newZoom));
    if (originX !== undefined && originY !== undefined) {
      const worldX = (originX - this.panX) / this.zoom;
      const worldY = (originY - this.panY) / this.zoom;
      this.panX = originX - worldX * clamped;
      this.panY = originY - worldY * clamped;
    }
    this.zoom = clamped;
    const hudLabel = document.getElementById('me-hud-zoom-val');
    if (hudLabel) hudLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    this.saveViewState();
    this.draw();
  }

  public fitToView(): void {
    if (!this.viewport) return;
    const rect = this.viewport.getBoundingClientRect();
    const mapPixelW = this.level.cols * this.tileSize;
    const mapPixelH = this.level.rows * this.tileSize;

    const pad = 40;
    const availW = Math.max(100, rect.width - pad * 2);
    const availH = Math.max(100, rect.height - pad * 2);

    const fitZoom = Math.min(availW / mapPixelW, availH / mapPixelH, 1.2);
    this.zoom = Math.max(0.15, Math.min(3.5, fitZoom));

    this.panX = (rect.width - mapPixelW * this.zoom) / 2;
    this.panY = (rect.height - mapPixelH * this.zoom) / 2;

    const hudLabel = document.getElementById('me-hud-zoom-val');
    if (hudLabel) hudLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    this.saveViewState();
    this.draw();
  }

  private saveViewState(): void {
    try {
      sessionStorage.setItem('emberdeep_map_view', JSON.stringify({
        panX: this.panX,
        panY: this.panY,
        zoom: this.zoom,
      }));
    } catch {
      // ignore
    }
  }

  private resizeGrid(newCols: number, newRows: number): void {
    const oldRows = this.level.rows;
    const oldCols = this.level.cols;
    const newData: number[][] = Array.from({ length: newRows }, (_, r) =>
      Array.from({ length: newCols }, (__, c) => {
        if (r < oldRows && c < oldCols) {
          return this.level.data[r][c];
        }
        return EDITOR_TILE.FLOOR;
      })
    );

    this.level.cols = newCols;
    this.level.rows = newRows;
    this.level.data = newData;

    // Prune out-of-bounds items
    this.level.enemies = this.level.enemies.filter((e) => e.col < newCols && e.row < newRows);
    this.level.chests = this.level.chests.filter((c) => c.col < newCols && c.row < newRows);
    this.level.shrines = this.level.shrines.filter((s) => s.col < newCols && s.row < newRows);
    this.level.flasks = this.level.flasks.filter((f) => f.col < newCols && f.row < newRows);
    this.level.torches = this.level.torches.filter((t) => t.col < newCols && t.row < newRows);
    if (this.level.bonfires) this.level.bonfires = this.level.bonfires.filter((b) => b.col < newCols && b.row < newRows);
    if (this.level.trees) this.level.trees = this.level.trees.filter((tr) => tr.col < newCols && tr.row < newRows);
    this.level.decorations = this.level.decorations.filter((d) => d.col < newCols && d.row < newRows);

    this.pushHistory();
    this.updateStatus();
    this.draw();
  }

  private screenToGrid(screenX: number, screenY: number): { col: number; row: number } {
    const worldX = (screenX - this.panX) / (this.zoom * this.tileSize);
    const worldY = (screenY - this.panY) / (this.zoom * this.tileSize);
    return {
      col: Math.floor(worldX),
      row: Math.floor(worldY),
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.viewport.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Middle click, Right-click, Shift-click, Hand Tool, or Spacebar held = PAN
    if (e.button === 1 || e.button === 2 || e.shiftKey || this.isSpaceHeld || this.activeTool === 'hand') {
      this.isPanning = true;
      this.panStartX = sx - this.panX;
      this.panStartY = sy - this.panY;
      this.updateCursorState();
      return;
    }

    if (e.button === 0) {
      this.isMouseDown = true;
      const { col, row } = this.screenToGrid(sx, sy);
      if (col >= 0 && col < this.level.cols && row >= 0 && row < this.level.rows) {
        if (this.activeTool === 'rect') {
          this.rectStartCol = col;
          this.rectStartRow = row;
        } else {
          this.lastPaintCol = col;
          this.lastPaintRow = row;
          this.applyToolAt(col, row);
        }
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.viewport.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (this.isPanning) {
      this.panX = sx - this.panStartX;
      this.panY = sy - this.panStartY;
      this.draw();
      return;
    }

    const { col, row } = this.screenToGrid(sx, sy);
    this.hoverCol = col;
    this.hoverRow = row;
    this.updateCoordinatesDisplay(col, row);

    if (this.collabClient) {
      const worldX = (sx - this.panX) / this.zoom;
      const worldY = (sy - this.panY) / this.zoom;
      this.collabClient.sendCursor(col, row, worldX, worldY, this.activeTool, this.brushSize);
    }

    if (this.isMouseDown) {
      if (this.activeTool === 'brush' || this.activeTool === 'eraser' || this.activeTool === 'custom_brush') {
        if (col >= 0 && col < this.level.cols && row >= 0 && row < this.level.rows) {
          if (this.lastPaintCol >= 0 && this.lastPaintRow >= 0 && (this.lastPaintCol !== col || this.lastPaintRow !== row)) {
            // Smooth continuous stroke interpolation
            const dx = Math.abs(col - this.lastPaintCol);
            const dy = Math.abs(row - this.lastPaintRow);
            const sx_step = this.lastPaintCol < col ? 1 : -1;
            const sy_step = this.lastPaintRow < row ? 1 : -1;
            let err = dx - dy;
            let curC = this.lastPaintCol;
            let curR = this.lastPaintRow;

            while (curC !== col || curR !== row) {
              const e2 = 2 * err;
              if (e2 > -dy) {
                err -= dy;
                curC += sx_step;
              }
              if (e2 < dx) {
                err += dx;
                curR += sy_step;
              }
              this.applyToolAt(curC, curR);
            }
          } else {
            this.applyToolAt(col, row);
          }
          this.lastPaintCol = col;
          this.lastPaintRow = row;
        }
      } else if (this.activeTool === 'rect') {
        this.draw(); // preview rect
      }
    } else {
      this.draw();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.saveViewState();
      this.updateCursorState();
      return;
    }

    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.lastPaintCol = -1;
      this.lastPaintRow = -1;
      if (this.activeTool === 'rect' && this.rectStartCol >= 0 && this.rectStartRow >= 0) {
        const rect = this.viewport.getBoundingClientRect();
        const { col, row } = this.screenToGrid(e.clientX - rect.left, e.clientY - rect.top);
        this.applyRectFill(this.rectStartCol, this.rectStartRow, col, row);
        this.rectStartCol = -1;
        this.rectStartRow = -1;
      }
      this.pushHistory();
      this.updateStatus();
      this.draw();
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Trackpad pinch or mouse wheel zoom centered at cursor position
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    this.setZoom(this.zoom * factor, sx, sy);
  }

  private broadcastEntities(): void {
    if (!this.collabClient) return;
    this.collabClient.sendEntitiesSync({
      trees: this.level.trees,
      decorations: this.level.decorations,
      enemies: this.level.enemies,
      chests: this.level.chests,
      shrines: this.level.shrines,
      flasks: this.level.flasks,
      torches: this.level.torches,
      bonfires: this.level.bonfires,
      spawn: this.level.spawn,
      altar: this.level.altar,
      exit: this.level.exit,
    });
  }

  private eraseCellAt(col: number, row: number): boolean {
    if (col < 0 || col >= this.level.cols || row < 0 || row >= this.level.rows) return false;
    let removed = false;
    if (this.level.trees) {
      const before = this.level.trees.length;
      this.level.trees = this.level.trees.filter((t) => t.col !== col || t.row !== row);
      if (this.level.trees.length !== before) removed = true;
    }
    if (this.level.decorations) {
      const before = this.level.decorations.length;
      this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
      if (this.level.decorations.length !== before) removed = true;
    }
    const beforeEnemies = this.level.enemies.length;
    this.level.enemies = this.level.enemies.filter((e) => e.col !== col || e.row !== row);
    if (this.level.enemies.length !== beforeEnemies) removed = true;

    const beforeChests = this.level.chests.length;
    this.level.chests = this.level.chests.filter((c) => c.col !== col || c.row !== row);
    if (this.level.chests.length !== beforeChests) removed = true;

    const beforeShrines = this.level.shrines.length;
    this.level.shrines = this.level.shrines.filter((s) => s.col !== col || s.row !== row);
    if (this.level.shrines.length !== beforeShrines) removed = true;

    const beforeFlasks = this.level.flasks.length;
    this.level.flasks = this.level.flasks.filter((f) => f.col !== col || f.row !== row);
    if (this.level.flasks.length !== beforeFlasks) removed = true;

    const beforeTorches = this.level.torches.length;
    this.level.torches = this.level.torches.filter((t) => t.col !== col || t.row !== row);
    if (this.level.torches.length !== beforeTorches) removed = true;

    if (this.level.bonfires) {
      const beforeBonfires = this.level.bonfires.length;
      this.level.bonfires = this.level.bonfires.filter((b) => b.col !== col || b.row !== row);
      if (this.level.bonfires.length !== beforeBonfires) removed = true;
    }

    if (!removed) {
      this.level.data[row][col] = EDITOR_TILE.FLOOR;
    }
    if (this.collabClient) {
      this.collabClient.sendCellErased(col, row);
    }
    return removed;
  }

  private applyToolAt(col: number, row: number): void {
    if (col < 0 || col >= this.level.cols || row < 0 || row >= this.level.rows) return;

    if (this.activeTool === 'picker') {
      const tile = this.level.data[row][col];
      this.activeCategory = 'tiles';
      this.activeItemId = tile;
      this.renderPalette();
      this.setTool('brush');
      return;
    }

    if (this.activeTool === 'eraser') {
      const half = Math.floor((this.brushSize - 1) / 2);
      const minC = Math.max(0, col - half);
      const maxC = Math.min(this.level.cols - 1, col - half + this.brushSize - 1);
      const minR = Math.max(0, row - half);
      const maxR = Math.min(this.level.rows - 1, row - half + this.brushSize - 1);

      let anyRemoved = false;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (this.eraseCellAt(c, r)) anyRemoved = true;
        }
      }
      if (anyRemoved) this.broadcastEntities();
      this.draw();
      return;
    }

    if (this.activeTool === 'custom_brush') {
      const brush = this.customBrushes.find((b) => b.id === this.activeCustomBrushId) || this.customBrushes[0];
      if (brush) {
        const halfW = Math.floor((brush.width - 1) / 2);
        const halfH = Math.floor((brush.height - 1) / 2);
        const updates: TileUpdate[] = [];

        for (let r = 0; r < brush.height; r++) {
          for (let c = 0; c < brush.width; c++) {
            const cell = brush.grid[r]?.[c];
            if (cell && cell.tileId >= 0) {
              const targetR = row - halfH + r;
              const targetC = col - halfW + c;
              if (targetR >= 0 && targetR < this.level.rows && targetC >= 0 && targetC < this.level.cols) {
                this.level.data[targetR][targetC] = cell.tileId;
                updates.push({ col: targetC, row: targetR, val: cell.tileId });
              }
            }
          }
        }
        if (this.collabClient && updates.length > 0) {
          this.collabClient.sendTileUpdates(updates);
        }
        this.draw();
      }
      return;
    }

    if (this.activeTool === 'brush') {
      if (this.activeCategory === 'smart_brush') {
        const smartDef = SMART_BRUSHES.find((b) => b.id === this.activeItemId) || SMART_BRUSHES[0];
        const family = smartDef.family;
        const baseVal = getBaseTileForFamily(family);

        const half = Math.floor((this.brushSize - 1) / 2);
        const minC = Math.max(0, col - half);
        const maxC = Math.min(this.level.cols - 1, col - half + this.brushSize - 1);
        const minR = Math.max(0, row - half);
        const maxR = Math.min(this.level.rows - 1, row - half + this.brushSize - 1);

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            this.level.data[r][c] = baseVal;
          }
        }

        const updates: TileUpdate[] = [];
        for (let r = Math.max(0, minR - 1); r <= Math.min(this.level.rows - 1, maxR + 1); r++) {
          for (let c = Math.max(0, minC - 1); c <= Math.min(this.level.cols - 1, maxC + 1); c++) {
            const cur = this.level.data[r][c];
            const fam = getFamilyForTile(cur);
            if (fam) {
              const computed = calculateAutotileCell(this.level.data, r, c, fam);
              this.level.data[r][c] = computed;
              updates.push({ col: c, row: r, val: computed });
            }
          }
        }

        if (this.collabClient && updates.length > 0) {
          this.collabClient.sendTileUpdates(updates);
        }
      } else if (this.activeCategory === 'tiles') {
        const half = Math.floor((this.brushSize - 1) / 2);
        const minC = Math.max(0, col - half);
        const maxC = Math.min(this.level.cols - 1, col - half + this.brushSize - 1);
        const minR = Math.max(0, row - half);
        const maxR = Math.min(this.level.rows - 1, row - half + this.brushSize - 1);

        const updates: TileUpdate[] = [];
        const rawVal = Number(this.activeItemId);

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            this.level.data[r][c] = rawVal;
            updates.push({ col: c, row: r, val: rawVal });
          }
        }

        if (this.collabClient && updates.length > 0) {
          this.collabClient.sendTileUpdates(updates);
        }
      } else if (this.activeCategory === 'poi') {
        if (this.activeItemId === 'spawn') this.level.spawn = { col, row };
        else if (this.activeItemId === 'altar') this.level.altar = { col, row };
        else if (this.activeItemId === 'exit') this.level.exit = { col, row };
        else {
          this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
          this.level.decorations.push({ col, row, key: String(this.activeItemId), solid: true });
        }
        this.broadcastEntities();
      } else if (this.activeCategory === 'npc') {
        this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
        this.level.decorations.push({ col, row, key: String(this.activeItemId), solid: true });
        this.broadcastEntities();
      } else if (this.activeCategory === 'enemy') {
        const standardEnemies: string[] = ['wolf', 'direwolf', 'skeleton', 'imp', 'orc_grunt', 'orc_shield', 'orc_archer', 'bandit_assassin'];
        if (standardEnemies.includes(String(this.activeItemId))) {
          this.level.enemies = this.level.enemies.filter((e) => e.col !== col || e.row !== row);
          this.level.enemies.push({ col, row, kind: this.activeItemId as EnemyKind });
        } else {
          this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
          this.level.decorations.push({ col, row, key: String(this.activeItemId), solid: true });
        }
        this.broadcastEntities();
      } else if (this.activeCategory === 'pickup') {
        if (this.activeItemId === 'chest') {
          this.level.chests = this.level.chests.filter((c) => c.col !== col || c.row !== row);
          this.level.chests.push({ col, row });
        } else if (this.activeItemId === 'shrine_blood') {
          this.level.shrines = this.level.shrines.filter((s) => s.col !== col || s.row !== row);
          this.level.shrines.push({ col, row, kind: 'blood' });
        } else if (this.activeItemId === 'shrine_chance') {
          this.level.shrines = this.level.shrines.filter((s) => s.col !== col || s.row !== row);
          this.level.shrines.push({ col, row, kind: 'chance' });
        } else if (this.activeItemId === 'shrine_hero') {
          this.level.shrines = this.level.shrines.filter((s) => s.col !== col || s.row !== row);
          this.level.shrines.push({ col, row, kind: 'chance' });
        } else if (String(this.activeItemId).startsWith('flask')) {
          this.level.flasks = this.level.flasks.filter((f) => f.col !== col || f.row !== row);
          this.level.flasks.push({ col, row, key: String(this.activeItemId) as PropKey });
        } else {
          this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
          this.level.decorations.push({ col, row, key: String(this.activeItemId), solid: false });
        }
        this.broadcastEntities();
      } else if (this.activeCategory === 'prop') {
        const half = Math.floor((this.brushSize - 1) / 2);
        const minC = Math.max(0, col - half);
        const maxC = Math.min(this.level.cols - 1, col - half + this.brushSize - 1);
        const minR = Math.max(0, row - half);
        const maxR = Math.min(this.level.rows - 1, row - half + this.brushSize - 1);

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            if (this.activeItemId === 'torch') {
              this.level.torches = this.level.torches.filter((t) => t.col !== c || t.row !== r);
              this.level.torches.push({ col: c, row: r });
            } else if (this.activeItemId === 'bonfire') {
              if (!this.level.bonfires) this.level.bonfires = [];
              this.level.bonfires = this.level.bonfires.filter((b) => b.col !== c || b.row !== r);
              this.level.bonfires.push({ col: c, row: r });
            } else {
              this.level.decorations = this.level.decorations.filter((d) => d.col !== c || d.row !== r);
              this.level.decorations.push({ col: c, row: r, key: this.activeItemId as PropKey, solid: true });
            }
          }
        }
        this.broadcastEntities();
      } else if (this.activeCategory === 'tree') {
        if (!this.level.trees) this.level.trees = [];
        const half = Math.floor((this.brushSize - 1) / 2);
        const minC = Math.max(0, col - half);
        const maxC = Math.min(this.level.cols - 1, col - half + this.brushSize - 1);
        const minR = Math.max(0, row - half);
        const maxR = Math.min(this.level.rows - 1, row - half + this.brushSize - 1);

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            this.level.trees = this.level.trees.filter((t) => t.col !== c || t.row !== r);
            this.level.decorations = this.level.decorations.filter((d) => d.col !== c || d.row !== r);

            if (this.activeItemId === 'tree_oak') {
              this.level.trees.push({ col: c, row: r, kind: 'oak' });
            } else if (this.activeItemId === 'tree_pine') {
              this.level.trees.push({ col: c, row: r, kind: 'pine' });
            } else {
              this.level.decorations.push({ col: c, row: r, key: String(this.activeItemId), solid: true });
            }
          }
        }
        this.broadcastEntities();
      }
      this.draw();
    }
  }

  private applyRectFill(c0: number, r0: number, c1: number, r1: number): void {
    const minC = Math.max(0, Math.min(c0, c1));
    const maxC = Math.min(this.level.cols - 1, Math.max(c0, c1));
    const minR = Math.max(0, Math.min(r0, r1));
    const maxR = Math.min(this.level.rows - 1, Math.max(r0, r1));

    if (this.activeCategory === 'smart_brush') {
      const smartDef = SMART_BRUSHES.find((b) => b.id === this.activeItemId) || SMART_BRUSHES[0];
      const family = smartDef.family;
      const baseVal = getBaseTileForFamily(family);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          this.level.data[r][c] = baseVal;
        }
      }
      const updates: TileUpdate[] = [];
      for (let r = Math.max(0, minR - 1); r <= Math.min(this.level.rows - 1, maxR + 1); r++) {
        for (let c = Math.max(0, minC - 1); c <= Math.min(this.level.cols - 1, maxC + 1); c++) {
          const cur = this.level.data[r][c];
          const fam = getFamilyForTile(cur);
          if (fam) {
            const computed = calculateAutotileCell(this.level.data, r, c, fam);
            this.level.data[r][c] = computed;
            updates.push({ col: c, row: r, val: computed });
          }
        }
      }
      if (this.collabClient && updates.length > 0) {
        this.collabClient.sendTileUpdates(updates);
      }
    } else if (this.activeCategory === 'tree') {
      if (!this.level.trees) this.level.trees = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          this.level.trees = this.level.trees.filter((t) => t.col !== c || t.row !== r);
          this.level.decorations = this.level.decorations.filter((d) => d.col !== c || d.row !== r);

          if (this.activeItemId === 'tree_oak') {
            this.level.trees.push({ col: c, row: r, kind: 'oak' });
          } else if (this.activeItemId === 'tree_pine') {
            this.level.trees.push({ col: c, row: r, kind: 'pine' });
          } else {
            this.level.decorations.push({ col: c, row: r, key: String(this.activeItemId), solid: true });
          }
        }
      }
      this.broadcastEntities();
    } else if (this.activeCategory === 'prop') {
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (this.activeItemId === 'torch') {
            this.level.torches = this.level.torches.filter((t) => t.col !== c || t.row !== r);
            this.level.torches.push({ col: c, row: r });
          } else if (this.activeItemId === 'bonfire') {
            if (!this.level.bonfires) this.level.bonfires = [];
            this.level.bonfires = this.level.bonfires.filter((b) => b.col !== c || b.row !== r);
            this.level.bonfires.push({ col: c, row: r });
          } else {
            this.level.decorations = this.level.decorations.filter((d) => d.col !== c || d.row !== r);
            this.level.decorations.push({ col: c, row: r, key: this.activeItemId as PropKey, solid: true });
          }
        }
      }
      this.broadcastEntities();
    } else {
      const tileVal = this.activeCategory === 'tiles' ? Number(this.activeItemId) : EDITOR_TILE.FLOOR;
      const updates: TileUpdate[] = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          this.level.data[r][c] = tileVal;
          updates.push({ col: c, row: r, val: tileVal });
        }
      }
      if (this.collabClient && updates.length > 0) {
        this.collabClient.sendTileUpdates(updates);
      }
    }
  }

  private updateCoordinatesDisplay(col: number, row: number): void {
    const coordsEl = document.getElementById('me-coords-label');
    if (!coordsEl) return;
    if (col >= 0 && col < this.level.cols && row >= 0 && row < this.level.rows) {
      coordsEl.textContent = `Клетка: [${col}, ${row}] (Мир: ${col * 32}px, ${row * 32}px)`;
    } else {
      coordsEl.textContent = `Клетка: [—, —]`;
    }
  }

  private updateStatus(): void {
    const res: ValidationResult = validateLevelData(this.level);
    const badge = document.getElementById('me-validation-badge');
    if (badge) {
      if (res.valid) {
        badge.className = 'me-status-badge me-badge-valid';
        badge.textContent = `Проверка: OK (${res.reachableCellsCount} клеток)`;
      } else {
        badge.className = 'me-status-badge me-badge-invalid';
        badge.textContent = `Ошибка: ${res.errors[0] || 'Недоступная область'}`;
      }
    }

    const summary = document.getElementById('me-stats-summary');
    if (summary) {
      const enCount = this.level.enemies.length;
      const chCount = this.level.chests.length;
      const trCount = this.level.trees?.length ?? 0;
      const decCount = this.level.decorations.length;
      summary.textContent = `Врагов: ${enCount} · Сундуков: ${chCount} · Деревьев: ${trCount} · Декора: ${decCount}`;
    }
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const step = this.tileSize * this.zoom;
    const cols = this.level.cols;
    const rows = this.level.rows;

    // 0. Base seamless background layer under map (eliminates all dark/black hairline gaps at any zoom level)
    const mapX0 = Math.floor(this.panX);
    const mapY0 = Math.floor(this.panY);
    const mapX1 = Math.floor(this.panX + cols * step);
    const mapY1 = Math.floor(this.panY + rows * step);
    if (mapX1 > 0 && mapX0 < this.canvas.width && mapY1 > 0 && mapY0 < this.canvas.height) {
      this.ctx.fillStyle = '#14532d'; // Dark forest grass base tint
      this.ctx.fillRect(mapX0, mapY0, mapX1 - mapX0, mapY1 - mapY0);
    }

    // 1. Draw Tiles with contiguous pixel-snapped integer bounds (x0..x1, y0..y1) to eliminate subpixel seam gaps
    for (let r = 0; r < rows; r++) {
      const y0 = Math.floor(this.panY + r * step);
      const y1 = Math.floor(this.panY + (r + 1) * step);
      const cellH = y1 - y0;
      if (y1 < 0 || y0 > this.canvas.height) continue;

      for (let c = 0; c < cols; c++) {
        const x0 = Math.floor(this.panX + c * step);
        const x1 = Math.floor(this.panX + (c + 1) * step);
        const cellW = x1 - x0;
        if (x1 < 0 || x0 > this.canvas.width) continue;

        const tileType = (this.level.data[r]?.[c] ?? 0) as EditorTileType;
        editorAssets.drawTile(this.ctx, tileType, x0, y0, cellW, cellH);
      }
    }

    // 2. Draw Grid Lines
    if (this.showGrid && step >= 8) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = Math.floor(this.panX + c * step);
        this.ctx.moveTo(x, mapY0);
        this.ctx.lineTo(x, mapY1);
      }
      for (let r = 0; r <= rows; r++) {
        const y = Math.floor(this.panY + r * step);
        this.ctx.moveTo(mapX0, y);
        this.ctx.lineTo(mapX1, y);
      }
      this.ctx.stroke();
    }

    // Outer Map Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(mapX0, mapY0, mapX1 - mapX0, mapY1 - mapY0);

    // 3. Collect All Drawable Entities for Y-Sorted Rendering
    const drawables: DrawableEntity[] = [];

    // Trees
    if (this.level.trees) {
      this.level.trees.forEach((tr) => {
        const spriteKey = tr.kind === 'pine' ? 'tree_pine' : tr.kind === 'oak' ? 'tree_oak' : String(tr.kind);
        drawables.push({ col: tr.col, row: tr.row, spriteId: spriteKey, type: 'tree' });
      });
    }

    // Torches & Bonfires
    this.level.torches.forEach((t) => {
      drawables.push({ col: t.col, row: t.row, spriteId: 'torch', type: 'prop' });
    });
    if (this.level.bonfires) {
      this.level.bonfires.forEach((b) => {
        drawables.push({ col: b.col, row: b.row, spriteId: 'bonfire', type: 'prop' });
      });
    }

    // Decorations
    this.level.decorations.forEach((d) => {
      drawables.push({ col: d.col, row: d.row, spriteId: d.key, type: 'prop' });
    });

    // Flasks, Chests, Shrines
    this.level.flasks.forEach((f) => {
      drawables.push({ col: f.col, row: f.row, spriteId: f.key, type: 'pickup' });
    });
    this.level.chests.forEach((c) => {
      drawables.push({ col: c.col, row: c.row, spriteId: 'chest', type: 'pickup' });
    });
    this.level.shrines.forEach((s) => {
      drawables.push({ col: s.col, row: s.row, spriteId: s.kind === 'blood' ? 'shrine_blood' : 'shrine_chance', type: 'pickup' });
    });

    // POIs
    if (this.level.spawn) {
      drawables.push({ col: this.level.spawn.col, row: this.level.spawn.row, spriteId: 'spawn', type: 'poi', metaColor: '#22c55e' });
    }
    if (this.level.altar) {
      drawables.push({ col: this.level.altar.col, row: this.level.altar.row, spriteId: 'altar', type: 'poi', metaColor: '#eab308' });
    }
    if (this.level.exit) {
      drawables.push({ col: this.level.exit.col, row: this.level.exit.row, spriteId: 'exit', type: 'poi', metaColor: '#38bdf8' });
    }

    // Enemies
    this.level.enemies.forEach((e) => {
      drawables.push({ col: e.col, row: e.row, spriteId: e.kind, type: 'enemy', metaColor: '#ef4444' });
    });

    // Sort by row (Y-Sort)
    drawables.sort((a, b) => a.row - b.row);

    // Draw all entities with real textures (bottom-aligned to tile)
    drawables.forEach((item) => {
      const cx = this.panX + item.col * step + step / 2;
      const bottomY = this.panY + item.row * step + step;

      // Draw subtle ground halo for POIs and enemies
      if (item.type === 'poi' || item.type === 'enemy') {
        const radius = Math.max(5, step * 0.35);
        this.ctx.fillStyle = item.metaColor ? `${item.metaColor}33` : 'rgba(255,255,255,0.15)';
        this.ctx.beginPath();
        this.ctx.arc(cx, bottomY - step * 0.2, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = item.metaColor || '#ffffff';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }

      // Draw the actual sprite image
      const drawn = editorAssets.drawSprite(this.ctx, item.spriteId, cx, bottomY, step);
      if (!drawn) {
        // Subtle fallback dot if sprite image is still loading
        this.ctx.fillStyle = item.metaColor || '#a1a1aa';
        this.ctx.beginPath();
        this.ctx.arc(cx, bottomY - step * 0.3, Math.max(3, step * 0.2), 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // 4. Rect Drag Preview
    if (this.isMouseDown && this.activeTool === 'rect' && this.rectStartCol >= 0 && this.hoverCol >= 0) {
      const minC = Math.max(0, Math.min(this.rectStartCol, this.hoverCol));
      const maxC = Math.min(cols - 1, Math.max(this.rectStartCol, this.hoverCol));
      const minR = Math.max(0, Math.min(this.rectStartRow, this.hoverRow));
      const maxR = Math.min(rows - 1, Math.max(this.rectStartRow, this.hoverRow));

      const rx = this.panX + minC * step;
      const ry = this.panY + minR * step;
      const rw = (maxC - minC + 1) * step;
      const rh = (maxR - minR + 1) * step;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.fillRect(rx, ry, rw, rh);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(rx, ry, rw, rh);
    } else if (this.activeTool === 'custom_brush' && this.hoverCol >= 0 && this.hoverCol < cols && this.hoverRow >= 0 && this.hoverRow < rows && !this.isSpaceHeld) {
      const brush = this.customBrushes.find((b) => b.id === this.activeCustomBrushId) || this.customBrushes[0];
      if (brush) {
        const halfW = Math.floor((brush.width - 1) / 2);
        const halfH = Math.floor((brush.height - 1) / 2);

        this.ctx.save();
        this.ctx.globalAlpha = 0.75;
        for (let r = 0; r < brush.height; r++) {
          for (let c = 0; c < brush.width; c++) {
            const cell = brush.grid[r][c];
            if (cell && cell.tileId >= 0) {
              const targetR = this.hoverRow - halfH + r;
              const targetC = this.hoverCol - halfW + c;
              if (targetR >= 0 && targetR < rows && targetC >= 0 && targetC < cols) {
                const tx = this.panX + targetC * step;
                const ty = this.panY + targetR * step;
                editorAssets.drawTile(this.ctx, cell.tileId, tx, ty, step, step, cell.rotation, cell.flipX, cell.flipY);
              }
            }
          }
        }
        this.ctx.restore();

        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1.5;
        for (let r = 0; r < brush.height; r++) {
          for (let c = 0; c < brush.width; c++) {
            const cell = brush.grid[r][c];
            if (cell && cell.tileId >= 0) {
              const targetR = this.hoverRow - halfH + r;
              const targetC = this.hoverCol - halfW + c;
              if (targetR >= 0 && targetR < rows && targetC >= 0 && targetC < cols) {
                const tx = this.panX + targetC * step;
                const ty = this.panY + targetR * step;
                this.ctx.strokeRect(tx, ty, step, step);
              }
            }
          }
        }
      }
    } else if (this.hoverCol >= 0 && this.hoverCol < cols && this.hoverRow >= 0 && this.hoverRow < rows && !this.isSpaceHeld && this.activeTool !== 'hand') {
      const size = (this.activeTool === 'brush' && (this.activeCategory === 'tiles' || this.activeCategory === 'smart_brush' || this.activeCategory === 'tree' || this.activeCategory === 'prop')) || this.activeTool === 'eraser' ? this.brushSize : 1;
      const half = Math.floor((size - 1) / 2);
      const minC = Math.max(0, this.hoverCol - half);
      const maxC = Math.min(cols - 1, this.hoverCol - half + size - 1);
      const minR = Math.max(0, this.hoverRow - half);
      const maxR = Math.min(rows - 1, this.hoverRow - half + size - 1);

      const hx = this.panX + minC * step;
      const hy = this.panY + minR * step;
      const hw = (maxC - minC + 1) * step;
      const hh = (maxR - minR + 1) * step;

      if (this.activeTool === 'eraser') {
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        this.ctx.fillRect(hx, hy, hw, hh);
        this.ctx.strokeStyle = '#f87171';
      } else {
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
        this.ctx.fillRect(hx, hy, hw, hh);
        this.ctx.strokeStyle = '#22c55e';
      }
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(hx, hy, hw, hh);

      // Tree / Prop Hover Ghost Preview
      if (this.activeTool === 'brush' && (this.activeCategory === 'tree' || this.activeCategory === 'prop')) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.65;
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cx = this.panX + (c + 0.5) * step;
            const by = this.panY + (r + 1) * step;
            editorAssets.drawSprite(this.ctx, String(this.activeItemId), cx, by, step);
          }
        }
        this.ctx.restore();
      }
    }

    // 5. Real-Time Multiplayer Cursors (Figma-style)
    if (this.collabClient) {
      const peers = this.collabClient.getConnectedPeers();
      const now = Date.now();

      peers.forEach((peer) => {
        if (peer.peerId === this.collabClient?.peerId) return; // skip self
        if (now - peer.lastActive > 25000) return; // skip inactive

        // Highlight other user's selected grid cell or brush area
        if (peer.col >= 0 && peer.col < cols && peer.row >= 0 && peer.row < rows) {
          const pSize = peer.tool === 'brush' || peer.tool === 'eraser' ? (peer.brushSize || 1) : 1;
          const half = Math.floor((pSize - 1) / 2);
          const minC = Math.max(0, peer.col - half);
          const minR = Math.max(0, peer.row - half);
          const maxC = Math.min(cols - 1, peer.col - half + pSize - 1);
          const maxR = Math.min(rows - 1, peer.row - half + pSize - 1);

          const phx = this.panX + minC * step;
          const phy = this.panY + minR * step;
          const phw = (maxC - minC + 1) * step;
          const phh = (maxR - minR + 1) * step;

          this.ctx.fillStyle = `${peer.color}22`;
          this.ctx.fillRect(phx, phy, phw, phh);
          this.ctx.strokeStyle = peer.color;
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(phx, phy, phw, phh);
        }

        // Draw smooth Figma-style pointer
        const psx = this.panX + peer.worldX * this.zoom;
        const psy = this.panY + peer.worldY * this.zoom;

        this.ctx.fillStyle = peer.color;
        this.ctx.beginPath();
        this.ctx.moveTo(psx, psy);
        this.ctx.lineTo(psx, psy + 14);
        this.ctx.lineTo(psx + 4, psy + 10);
        this.ctx.lineTo(psx + 10, psy + 10);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw user name badge
        const label = peer.name;
        this.ctx.font = '10px Inter, -apple-system, sans-serif';
        const textW = this.ctx.measureText(label).width;
        const badgeW = textW + 10;
        const badgeH = 16;
        const badgeX = psx + 8;
        const badgeY = psy + 10;

        this.ctx.fillStyle = peer.color;
        this.ctx.beginPath();
        this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, badgeX + 5, badgeY + badgeH / 2);
      });
    }
  }

  private async connectCollab(roomCode: string, userName?: string): Promise<void> {
    const name = userName || localStorage.getItem('emberdeep_user_name') || `Игрок_${Math.floor(Math.random() * 900 + 100)}`;
    localStorage.setItem('emberdeep_user_name', name);

    if (this.collabClient) {
      await this.collabClient.disconnect();
    }

    const client = new MapCollabClient(roomCode, name);
    this.collabClient = client;

    client.onPeersChange(() => {
      this.updateCollabUI();
      this.draw();
    });

    client.onTileUpdates((updates) => {
      updates.forEach((u) => {
        if (u.row >= 0 && u.row < this.level.rows && u.col >= 0 && u.col < this.level.cols) {
          this.level.data[u.row][u.col] = u.val;
        }
      });
      this.scheduleAutoSave();
      this.draw();
    });

    client.onEntitiesSync((entities) => {
      if (entities.trees !== undefined) {
        this.level.trees = entities.trees.map((t) => ({
          col: t.col,
          row: t.row,
          kind: t.kind === 'pine' ? 'pine' : 'oak',
        }));
      }
      if (entities.decorations !== undefined) {
        this.level.decorations = entities.decorations.map((d) => ({
          col: d.col,
          row: d.row,
          key: d.key as PropKey,
          solid: d.solid ?? false,
        }));
      }
      if (entities.enemies !== undefined) this.level.enemies = entities.enemies;
      if (entities.chests !== undefined) this.level.chests = entities.chests;
      if (entities.shrines !== undefined) this.level.shrines = entities.shrines;
      if (entities.flasks !== undefined) this.level.flasks = entities.flasks;
      if (entities.torches !== undefined) this.level.torches = entities.torches;
      if (entities.bonfires !== undefined) this.level.bonfires = entities.bonfires;
      if (entities.spawn !== undefined) this.level.spawn = entities.spawn;
      if (entities.altar !== undefined) this.level.altar = entities.altar;
      if (entities.exit !== undefined) this.level.exit = entities.exit;
      this.scheduleAutoSave();
      this.draw();
    });

    client.onCellErased((col, row) => {
      this.eraseCellAt(col, row);
      this.scheduleAutoSave();
      this.draw();
    });

    client.onLevelSync((level) => {
      this.level = level;
      (document.getElementById('me-cols-input') as HTMLInputElement).value = String(this.level.cols);
      (document.getElementById('me-rows-input') as HTMLInputElement).value = String(this.level.rows);
      (document.getElementById('me-biome-select') as HTMLSelectElement).value = this.level.biome.id;
      this.scheduleAutoSave();
      this.draw();
    });

    client.onBrushesSync((remoteBrushes) => {
      if (!Array.isArray(remoteBrushes) || remoteBrushes.length === 0) return;
      let changed = false;
      remoteBrushes.forEach((rb) => {
        const idx = this.customBrushes.findIndex((b) => b.id === rb.id);
        if (idx === -1) {
          this.customBrushes.push(rb);
          changed = true;
        } else {
          if (JSON.stringify(this.customBrushes[idx]) !== JSON.stringify(rb)) {
            this.customBrushes[idx] = rb;
            changed = true;
          }
        }
      });
      if (changed) {
        this.saveCustomBrushes(false);
        this.renderPalette();
        this.draw();
      }
    });

    client.onStatusChange((status) => {
      this.updateCollabUI(status);
    });

    client.onRequestSync((fromPeerId) => {
      client.sendLevelSync(this.level, fromPeerId);
      client.sendCustomBrushes(this.customBrushes);
    });

    try {
      await client.connect();
      client.sendCustomBrushes(this.customBrushes);
      this.updateCollabUI();
    } catch {
      this.updateCollabUI('offline');
    }
  }

  private updateCollabUI(forcedStatus?: string): void {
    const badge = document.getElementById('me-collab-status');
    const statusText = document.getElementById('me-collab-count');
    const peerList = document.getElementById('me-collab-peers');

    if (!badge || !statusText || !peerList) return;

    const status = forcedStatus || this.collabClient?.status || 'offline';

    badge.classList.remove('connecting', 'offline');

    if (status === 'connected' && this.collabClient) {
      const peers = this.collabClient.getConnectedPeers();
      const totalCount = peers.length + 1;
      statusText.innerHTML = `<span class="me-live-dot"></span> В сети (${totalCount})`;
      badge.title = `Совместное редактирование активно (${totalCount} в сети). Нажмите, чтобы изменить имя или скопировать ссылку.`;

      peerList.innerHTML = '';

      // Add self avatar
      const selfAvatar = document.createElement('div');
      selfAvatar.className = 'me-peer-avatar';
      selfAvatar.style.backgroundColor = this.collabClient.color;
      selfAvatar.textContent = this.collabClient.name.slice(0, 1).toUpperCase();
      selfAvatar.title = `${this.collabClient.name} (Вы - нажмите для смены имени)`;
      peerList.appendChild(selfAvatar);

      // Add peers avatars
      peers.forEach((p) => {
        const pAvatar = document.createElement('div');
        pAvatar.className = 'me-peer-avatar';
        pAvatar.style.backgroundColor = p.color;
        pAvatar.textContent = p.name.slice(0, 1).toUpperCase();
        pAvatar.title = `${p.name} (в сети)`;
        peerList.appendChild(pAvatar);
      });
    } else if (status === 'connecting') {
      badge.classList.add('connecting');
      statusText.innerHTML = `<span class="me-connecting-dot"></span> Подключение...`;
      badge.title = 'Подключение к совместному серверу...';
      peerList.innerHTML = '';
    } else {
      badge.classList.add('offline');
      statusText.innerHTML = `<span class="me-offline-dot"></span> Офлайн (локально)`;
      badge.title = 'Нет связи с сервером — все правки сохраняются в браузере локально. Нажмите для повторного подключения.';
      peerList.innerHTML = '';
    }
  }

  private showCollabModal(): void {
    const isOnline = this.collabClient && this.collabClient.status === 'connected';
    const currentName = this.collabClient?.name || localStorage.getItem('emberdeep_user_name') || 'Игрок';
    const code = this.collabClient?.roomCode || 'LIVE';
    const shareUrl = `${window.location.origin}${window.location.pathname}?mapRoom=${code}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'me-modal-backdrop';
    backdrop.innerHTML = `
      <div class="me-modal-window" style="width:460px;">
        <div class="me-modal-header">
          <span>Настройки профиля и совместной работы</span>
          <button id="me-collab-modal-close" class="me-btn me-btn-danger">&times;</button>
        </div>
        <div class="me-modal-body" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Name Section -->
          <div>
            <label style="font-size:11px; font-weight:600; color:var(--text-tertiary); display:block; margin-bottom:5px;">
              Ваше отображаемое имя:
            </label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="me-edit-name-input" class="me-input" value="${currentName}" placeholder="Введите ваше имя..." style="flex:1;">
              <button id="me-save-name-btn" class="me-btn me-btn-primary">Сохранить</button>
            </div>
          </div>

          <!-- Share Link Section -->
          <div>
            <label style="font-size:11px; font-weight:600; color:var(--text-tertiary); display:block; margin-bottom:5px;">
              Ссылка для друга (совместное редактирование):
            </label>
            <div style="display:flex; gap:6px;">
              <input type="text" readonly value="${shareUrl}" class="me-input" style="flex:1; font-family:monospace; font-size:11px;" id="me-share-link-input">
              <button id="me-copy-share-link-btn" class="me-btn me-btn-primary">${ICONS.copy} Копировать</button>
            </div>
          </div>

          <!-- Network Status Info -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px 12px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:11px; color:var(--text-secondary);">Статус сети:</span>
              <span style="font-size:11px; font-weight:600; color:${isOnline ? '#4ade80' : '#f87171'};">
                ${isOnline ? '● Подключено к серверу' : '○ Офлайн (автосохранение только локально)'}
              </span>
            </div>
            ${
              !isOnline
                ? `<p style="margin:6px 0 0 0; font-size:10px; color:var(--text-tertiary);">
                    Связь с сервером не установлена. Вы можете продолжать редактировать карту — всё автоматически сохраняется в вашем браузере.
                   </p>`
                : ''
            }
          </div>

          <!-- Connected Peers List -->
          ${
            isOnline && this.collabClient
              ? `<div>
                  <span style="font-size:11px; color:var(--text-tertiary);">В комнате сейчас (${this.collabClient.getConnectedPeers().length + 1}):</span>
                  <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
                    <div style="font-size:12px; color:${this.collabClient.color}; font-weight:600;">
                      ● ${this.collabClient.name} (Вы)
                    </div>
                    ${this.collabClient
                      .getConnectedPeers()
                      .map(
                        (p) => `
                      <div style="font-size:12px; color:${p.color};">
                        ● ${p.name}
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>`
              : ''
          }
        </div>
        <div class="me-modal-footer">
          ${!isOnline ? `<button id="me-retry-collab-btn" class="me-btn me-btn-primary">Повторить подключение</button>` : ''}
          <button id="me-collab-modal-done" class="me-btn">Закрыть</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#me-collab-modal-close')?.addEventListener('click', close);
    backdrop.querySelector('#me-collab-modal-done')?.addEventListener('click', close);

    backdrop.querySelector('#me-save-name-btn')?.addEventListener('click', async () => {
      const nameInput = backdrop.querySelector('#me-edit-name-input') as HTMLInputElement | null;
      const newName = nameInput?.value.trim();
      if (newName) {
        localStorage.setItem('emberdeep_user_name', newName);
        if (this.collabClient) {
          await this.collabClient.updateName(newName);
          this.updateCollabUI();
          this.draw();
        }
        const saveBtn = backdrop.querySelector('#me-save-name-btn');
        if (saveBtn) saveBtn.textContent = '✓ Сохранено';
        setTimeout(() => {
          if (saveBtn) saveBtn.textContent = 'Сохранить';
        }, 1500);
      }
    });

    backdrop.querySelector('#me-copy-share-link-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        const copyBtn = backdrop.querySelector('#me-copy-share-link-btn');
        if (copyBtn) copyBtn.textContent = '✓ Скопировано!';
        setTimeout(() => {
          if (copyBtn) copyBtn.innerHTML = `${ICONS.copy} Копировать`;
        }, 2000);
      } catch {
        // ignore
      }
    });

    backdrop.querySelector('#me-retry-collab-btn')?.addEventListener('click', async () => {
      close();
      await this.connectCollab(code);
    });
  }

  private playTestMap(): void {
    const valResult = validateLevelData(this.level);
    if (!valResult.valid) {
      const confirmPlay = confirm(
        `Внимание! Валидатор обнаружил ошибки:\n• ${valResult.errors.join('\n• ')}\n\nВсё равно запустить тест в игре?`
      );
      if (!confirmPlay) return;
    }

    try {
      const json = serializeLevelToJson(this.level);
      localStorage.setItem('emberdeep_map_editor_draft', json);
      localStorage.setItem('emberdeep_custom_level_active', '1');

      const baseUrl = import.meta.env.BASE_URL || '/';
      window.location.href = `${baseUrl}index.html?testLevel=1`;
    } catch (err) {
      alert(`Ошибка при запуске игры: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async bakeToGame(): Promise<void> {
    const btn = document.getElementById('me-bake-prod-btn') as HTMLElement | null;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `${ICONS.sparkles} Отправка в прод...`;

    // 1. Try local dev server endpoint first (localhost)
    try {
      const res = await fetch('/api/bake-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: this.level }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.handleBakeSuccess(btn, originalText);
          return;
        }
      }
    } catch {
      // Local dev endpoint not available
    }

    // 2. Fallback to GitHub REST API for live site (GitHub Pages)
    const token = localStorage.getItem(TOKEN_KEY)?.trim();
    if (!token) {
      if (btn) btn.innerHTML = originalText;
      this.promptForGitHubToken();
      return;
    }

    const result = await bakeLevelViaGitHubApi(this.level, token);
    if (result.success) {
      this.handleBakeSuccess(btn, originalText);
    } else {
      if (btn) btn.innerHTML = originalText;
      if (result.isAuthError) {
        this.showToast(result.error || 'Ошибка доступа GitHub', false);
        this.promptForGitHubToken();
      } else {
        this.showToast(`Ошибка GitHub: ${result.error}`, false);
      }
    }
  }

  private handleBakeSuccess(btn: HTMLElement | null, originalText: string): void {
    if (btn) {
      btn.style.background = '#15803d';
      btn.innerHTML = '✓ Выкатывается на прод!';
    }
    this.showToast('✓ Уровень успешно вшит и отправлен в GitHub! Сборка на проде уже запущена.');
    setTimeout(() => {
      if (btn) {
        btn.style.background = '#4f46e5';
        btn.innerHTML = originalText;
      }
    }, 4000);
  }

  private promptForGitHubToken(): void {
    const existing = document.getElementById('me-token-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'me-token-modal';
    backdrop.className = 'me-modal-backdrop';
    backdrop.innerHTML = `
      <div class="me-modal-window" style="max-width: 480px;">
        <div class="me-modal-header">
          <span style="font-weight: 600; color: var(--text-primary);">GitHub Token для вшивания</span>
          <button id="me-token-close" class="me-btn me-btn-danger">&times;</button>
        </div>
        <div class="me-modal-body" style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.5;">
            Вы открыли сайт на GitHub Pages. Чтобы сохранять уровни в прод прямо из браузера в 1 клик, нужен ваш <b>GitHub Personal Access Token</b> (с правами на запись в репозиторий <code>repo</code>).
          </div>
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 6px; padding: 10px; font-size: 11px; line-height: 1.4;">
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=Emberdeep+Level+Bake" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; font-weight: 600; text-decoration: underline; display: flex; align-items: center; gap: 6px;">
              <span>1. Нажмите сюда для создания токена на GitHub (галочка repo уже выбрана)</span>
            </a>
            <div style="color: var(--text-tertiary); margin-top: 4px;">2. Нажмите внизу страницы GitHub зеленую кнопку «Generate token», скопируйте его и вставьте ниже:</div>
          </div>
          <input
            id="me-token-input"
            type="password"
            class="me-input"
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-family: var(--font-mono, monospace);"
            placeholder="ghp_... или github_pat_..."
            value="${localStorage.getItem(TOKEN_KEY) || ''}"
          />
          <button id="me-token-submit" class="me-btn me-btn-primary" style="padding: 9px; justify-content: center; font-weight: 600; background: #4f46e5; border-color: #6366f1;">
            ${ICONS.sparkles} Сохранить и вшить в игру
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector('#me-token-close')?.addEventListener('click', close);
    backdrop.querySelector('#me-token-submit')?.addEventListener('click', () => {
      const input = backdrop.querySelector('#me-token-input') as HTMLInputElement | null;
      const val = input?.value.trim() || '';
      if (!val) {
        alert('Пожалуйста, вставьте GitHub Token');
        return;
      }
      localStorage.setItem(TOKEN_KEY, val);
      close();
      void this.bakeToGame();
    });
  }

  private showToast(message: string, isSuccess = true): void {
    const existing = document.getElementById('me-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'me-toast-notification';
    toast.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isSuccess ? '#052e16' : '#450a0a'};
      color: ${isSuccess ? '#4ade80' : '#fca5a5'};
      border: 1px solid ${isSuccess ? '#22c55e' : '#ef4444'};
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 99999;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  private loadCustomBrushes(): void {
    const saved = localStorage.getItem('emberdeep_custom_brushes');
    if (saved) {
      try {
        this.customBrushes = JSON.parse(saved);
      } catch {
        this.customBrushes = [...DEFAULT_CUSTOM_BRUSHES];
      }
    } else {
      this.customBrushes = [...DEFAULT_CUSTOM_BRUSHES];
    }
    if (this.customBrushes.length > 0 && !this.activeCustomBrushId) {
      this.activeCustomBrushId = this.customBrushes[0].id;
    }
  }

  private saveCustomBrushes(broadcast = true): void {
    try {
      localStorage.setItem('emberdeep_custom_brushes', JSON.stringify(this.customBrushes));
      if (broadcast && this.collabClient) {
        this.collabClient.sendCustomBrushes(this.customBrushes);
      }
    } catch {
      // ignore
    }
  }

  private renderCustomBrushPreview(canvas: HTMLCanvasElement, brush: CustomBrush): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 36;
    canvas.height = 36;
    ctx.clearRect(0, 0, 36, 36);

    const maxDim = Math.max(brush.width, brush.height, 1);
    const cellSize = Math.max(4, Math.floor(32 / maxDim));
    const offsetX = Math.floor((36 - brush.width * cellSize) / 2);
    const offsetY = Math.floor((36 - brush.height * cellSize) / 2);

    for (let r = 0; r < brush.height; r++) {
      for (let c = 0; c < brush.width; c++) {
        const cell = brush.grid[r]?.[c];
        if (cell && cell.tileId >= 0) {
          editorAssets.drawTile(
            ctx,
            cell.tileId,
            offsetX + c * cellSize,
            offsetY + r * cellSize,
            cellSize,
            cellSize,
            cell.rotation,
            cell.flipX,
            cell.flipY
          );
        }
      }
    }
  }

  private openBrushDesignerModal(brushToEdit?: CustomBrush): void {
    let currentBrush: CustomBrush = brushToEdit
      ? JSON.parse(JSON.stringify(brushToEdit))
      : {
          id: `brush_${Date.now()}`,
          name: 'Новая кисть',
          width: 5,
          height: 5,
          grid: Array.from({ length: 5 }, () =>
            Array.from({ length: 5 }, () => ({ tileId: TILE_METAS[0] ? TILE_METAS[0].id : 0, rotation: 0 }))
          ),
        };

    let selectedTileId = 0;
    let selectedRotation = 0;
    let selectedCell: { r: number; c: number } | null = null;
    let designerSubCat: TileSubCategory = 'all';
    let cellMode: 'draw' | 'erase' | 'rotate' = 'draw';

    const backdrop = document.createElement('div');
    backdrop.className = 'me-modal-backdrop';
    backdrop.id = 'me-brush-designer-backdrop';

    const renderDesigner = () => {
      backdrop.innerHTML = `
        <div class="me-modal-window" style="width:780px; max-width:96vw; max-height:94vh; display:flex; flex-direction:column;">
          <div class="me-modal-header">
            <span style="display:flex; align-items:center; gap:6px;">
              ${ICONS.sparkles} Конструктор пользовательской кисти и произвольных форм
            </span>
            <button id="me-designer-close" class="me-btn me-btn-danger">&times;</button>
          </div>

          <div class="me-modal-body" style="display:flex; flex-direction:column; gap:12px; overflow-y:auto; padding:14px;">
            <!-- Top Config Bar -->
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:12px; justify-content:space-between; background:#141417; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
              <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
                <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Название:</label>
                <input type="text" id="me-designer-name" class="me-input" style="flex:1;" value="${currentBrush.name}">
              </div>

              <!-- Size controls -->
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:var(--text-tertiary);">Ширина:</span>
                <button id="me-dec-w" class="me-btn" style="padding:2px 8px;">-</button>
                <span style="font-family:var(--font-mono, monospace); font-weight:600; color:#4ade80;">${currentBrush.width}</span>
                <button id="me-inc-w" class="me-btn" style="padding:2px 8px;">+</button>

                <span style="font-size:11px; color:var(--text-tertiary); margin-left:6px;">Высота:</span>
                <button id="me-dec-h" class="me-btn" style="padding:2px 8px;">-</button>
                <span style="font-family:var(--font-mono, monospace); font-weight:600; color:#4ade80;">${currentBrush.height}</span>
                <button id="me-inc-h" class="me-btn" style="padding:2px 8px;">+</button>
              </div>
            </div>

            <!-- Global Matrix Transform Toolbar & Shape Masks -->
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; background:#101013; padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; margin-right:4px;">Шаблоны форм:</span>
              <button id="me-shape-circle" class="me-shape-btn" title="Сделать круглую кисть">
                ${ICONS.circle} Круг
              </button>
              <button id="me-shape-cross" class="me-shape-btn" title="Сделать крестообразную кисть">
                ${ICONS.cross} Крест
              </button>
              <button id="me-shape-diamond" class="me-shape-btn" title="Сделать ромбовидную кисть">
                ${ICONS.diamond} Ромб
              </button>
              <button id="me-shape-ring" class="me-shape-btn" title="Сделать контурное кольцо">
                ${ICONS.ring} Кольцо
              </button>
              <button id="me-shape-corner" class="me-shape-btn" title="Сделать угловую L-форму">
                ${ICONS.corner} Угол L
              </button>
              <button id="me-shape-fill" class="me-shape-btn" title="Заполнить прямоугольник полностью">
                ${ICONS.square} Заливка
              </button>

              <span style="color:var(--text-tertiary); margin:0 4px;">|</span>

              <button id="me-designer-rot-cw" class="me-btn" title="Повернуть всю матрицу на 90° по часовой">
                ${ICONS.rotateCw} 90°
              </button>
              <button id="me-designer-rot-ccw" class="me-btn" title="Повернуть всю матрицу на 90° против часовой">
                ${ICONS.rotateCcw} -90°
              </button>
              <button id="me-designer-flip-h" class="me-btn" title="Отразить горизонтально">
                ${ICONS.flipH} ↔
              </button>
              <button id="me-designer-flip-v" class="me-btn" title="Отразить вертикально">
                ${ICONS.flipV} ↕
              </button>
              <button id="me-designer-clear" class="me-btn" title="Очистить все ячейки в прозрачные">
                ${ICONS.trash} Очистить
              </button>
            </div>

            <!-- Main Interactive Editor Area -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; min-height:320px;">
              <!-- Left: Matrix Canvas / Grid -->
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0c0c0e; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:16px;">
                <!-- Mode selection: Draw / Erase / Rotate -->
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px; background:#18181b; padding:3px; border-radius:6px;">
                  <button id="me-mode-draw" class="me-btn ${cellMode === 'draw' ? 'me-btn-primary' : ''}" style="padding:3px 10px; font-size:11px;">
                    ${ICONS.brush} Нанесение тайла
                  </button>
                  <button id="me-mode-erase" class="me-btn ${cellMode === 'erase' ? 'me-btn-primary' : ''}" style="padding:3px 10px; font-size:11px; ${cellMode === 'erase' ? 'background:#ef4444; border-color:#f87171;' : ''}">
                    ${ICONS.eraser} Ластик (Прозрачно)
                  </button>
                  <button id="me-mode-rotate" class="me-btn ${cellMode === 'rotate' ? 'me-btn-primary' : ''}" style="padding:3px 10px; font-size:11px;">
                    ${ICONS.rotateCw} Поворот +90°
                  </button>
                </div>

                <span style="font-size:10px; color:var(--text-tertiary); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">
                  Клик — действие режима · ПКМ — стереть в прозрачную
                </span>

                <div class="me-designer-matrix" style="grid-template-columns: repeat(${currentBrush.width}, 44px);">
                  ${currentBrush.grid
                    .map((row, r) =>
                      row
                        .map((cell, c) => {
                          const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                          const isEmpty = !cell || cell.tileId < 0;
                          const rot = cell?.rotation || 0;
                          const previewUrl = !isEmpty ? editorAssets.getTilePreviewUrl(cell!.tileId, this.level.biome.id) : '';

                          return `
                            <div class="me-matrix-cell ${isEmpty ? 'empty' : ''} ${isSelected ? 'selected' : ''}" data-r="${r}" data-c="${c}" title="${isEmpty ? 'Прозрачная ячейка (пропускается)' : `Тайл #${cell!.tileId}, ${rot}°`}">
                              ${
                                !isEmpty && previewUrl
                                  ? `<img src="${previewUrl}" style="width:32px; height:32px; image-rendering:pixelated; transform:rotate(${rot}deg) ${cell?.flipX ? 'scaleX(-1)' : ''} ${cell?.flipY ? 'scaleY(-1)' : ''};">`
                                  : !isEmpty
                                  ? `<div style="width:32px; height:32px; background:#15803d;"></div>`
                                  : ''
                              }
                              ${!isEmpty && rot > 0 ? `<span class="me-cell-rot-badge">${rot}°</span>` : ''}
                            </div>
                          `;
                        })
                        .join('')
                    )
                    .join('')}
                </div>

                ${
                  selectedCell
                    ? `
                  <div style="margin-top:12px; display:flex; align-items:center; gap:6px;">
                    <span style="font-size:10px; color:var(--text-secondary);">Ячейка [${selectedCell.c + 1}, ${selectedCell.r + 1}]:</span>
                    <button id="me-cell-rot-btn" class="me-btn" style="padding:2px 8px;">${ICONS.rotateCw} Повернуть на 90°</button>
                    <button id="me-cell-clear-btn" class="me-btn" style="padding:2px 8px;">${ICONS.eraser} Очистить</button>
                  </div>
                `
                    : ''
                }
              </div>

              <!-- Right: Tile Selector & Settings -->
              <div style="display:flex; flex-direction:column; background:#0c0c0e; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px;">
                <span style="font-size:10px; color:var(--text-tertiary); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">
                  Выбор текстуры для ячеек
                </span>

                <!-- Subcategories -->
                <div class="me-subcategory-bar" style="border-radius:4px; margin-bottom:8px;">
                  ${[
                    { id: 'all', label: 'Все' },
                    { id: 'ground', label: 'Земля' },
                    { id: 'paths', label: 'Тропы' },
                    { id: 'water', label: 'Вода' },
                    { id: 'cliffs', label: 'Скалы' },
                    { id: 'cobble', label: 'Камень' },
                    { id: 'walls', label: 'Стены' },
                  ]
                    .map(
                      (sc) => `
                    <button class="me-subcat-btn ${designerSubCat === sc.id ? 'active' : ''}" data-subcat="${sc.id}">
                      ${sc.label}
                    </button>
                  `
                    )
                    .join('')}
                </div>

                <!-- Rotation of selected placement tile -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding:4px 6px; background:#18181b; border-radius:4px;">
                  <span style="font-size:11px; color:var(--text-secondary);">Поворот при установке:</span>
                  <div style="display:flex; gap:4px;">
                    ${[0, 90, 180, 270]
                      .map(
                        (deg) => `
                      <button class="me-btn ${selectedRotation === deg ? 'me-btn-primary' : ''}" data-rot="${deg}" style="padding:1px 6px; font-size:10px; font-family:var(--font-mono, monospace);">
                        ${deg}°
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>

                <!-- Tile items grid -->
                <div id="me-designer-tile-list" style="flex:1; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap:4px; max-height:220px; padding:4px;">
                  ${Object.values(TILE_METAS)
                    .filter((t) => designerSubCat === 'all' || t.subCategory === designerSubCat)
                    .map((t) => {
                      const isSel = selectedTileId === t.id;
                      const previewImg = editorAssets.getTilePreviewUrl(t.id, this.level.biome.id);
                      return `
                        <div class="me-palette-icon ${isSel ? 'active' : ''}" data-tile-id="${t.id}" title="${t.name}" style="width:36px; height:36px; cursor:pointer; border:1.5px solid ${isSel ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius:4px;">
                          ${
                            previewImg
                              ? `<img src="${previewImg}" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated; transform:rotate(${selectedRotation}deg);">`
                              : `<div style="width:100%; height:100%; background:${t.color};"></div>`
                          }
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="me-modal-footer" style="display:flex; justify-content:flex-end; gap:8px;">
            <button id="me-designer-cancel" class="me-btn">Отмена</button>
            <button id="me-designer-save" class="me-btn me-btn-primary" style="background:#15803d; border-color:#22c55e; color:#ffffff;">
              ${ICONS.check} Сохранить и использовать кисть
            </button>
          </div>
        </div>
      `;

      // Event bindings
      backdrop.querySelector('#me-designer-close')?.addEventListener('click', () => backdrop.remove());
      backdrop.querySelector('#me-designer-cancel')?.addEventListener('click', () => backdrop.remove());

      // Mode toggles
      backdrop.querySelector('#me-mode-draw')?.addEventListener('click', () => {
        cellMode = 'draw';
        renderDesigner();
      });
      backdrop.querySelector('#me-mode-erase')?.addEventListener('click', () => {
        cellMode = 'erase';
        renderDesigner();
      });
      backdrop.querySelector('#me-mode-rotate')?.addEventListener('click', () => {
        cellMode = 'rotate';
        renderDesigner();
      });

      // Shape preset buttons
      backdrop.querySelector('#me-shape-circle')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'circle', selectedTileId, selectedRotation);
        renderDesigner();
      });
      backdrop.querySelector('#me-shape-cross')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'cross', selectedTileId, selectedRotation);
        renderDesigner();
      });
      backdrop.querySelector('#me-shape-diamond')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'diamond', selectedTileId, selectedRotation);
        renderDesigner();
      });
      backdrop.querySelector('#me-shape-ring')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'ring', selectedTileId, selectedRotation);
        renderDesigner();
      });
      backdrop.querySelector('#me-shape-corner')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'corner_l', selectedTileId, selectedRotation);
        renderDesigner();
      });
      backdrop.querySelector('#me-shape-fill')?.addEventListener('click', () => {
        currentBrush = applyBrushShapeMask(currentBrush, 'fill', selectedTileId, selectedRotation);
        renderDesigner();
      });

      // Resize W / H
      backdrop.querySelector('#me-dec-w')?.addEventListener('click', () => {
        if (currentBrush.width > 1) {
          currentBrush.width--;
          currentBrush.grid = currentBrush.grid.map((r) => r.slice(0, currentBrush.width));
          selectedCell = null;
          renderDesigner();
        }
      });
      backdrop.querySelector('#me-inc-w')?.addEventListener('click', () => {
        if (currentBrush.width < 8) {
          currentBrush.width++;
          currentBrush.grid = currentBrush.grid.map((r) => [...r, { tileId: selectedTileId, rotation: selectedRotation }]);
          selectedCell = null;
          renderDesigner();
        }
      });
      backdrop.querySelector('#me-dec-h')?.addEventListener('click', () => {
        if (currentBrush.height > 1) {
          currentBrush.height--;
          currentBrush.grid = currentBrush.grid.slice(0, currentBrush.height);
          selectedCell = null;
          renderDesigner();
        }
      });
      backdrop.querySelector('#me-inc-h')?.addEventListener('click', () => {
        if (currentBrush.height < 8) {
          currentBrush.height++;
          currentBrush.grid.push(
            Array.from({ length: currentBrush.width }, () => ({ tileId: selectedTileId, rotation: selectedRotation }))
          );
          selectedCell = null;
          renderDesigner();
        }
      });

      // Transformations
      backdrop.querySelector('#me-designer-rot-cw')?.addEventListener('click', () => {
        currentBrush = rotateBrushMatrixClockwise(currentBrush);
        renderDesigner();
      });
      backdrop.querySelector('#me-designer-rot-ccw')?.addEventListener('click', () => {
        currentBrush = rotateBrushMatrixCounterClockwise(currentBrush);
        renderDesigner();
      });
      backdrop.querySelector('#me-designer-flip-h')?.addEventListener('click', () => {
        currentBrush = flipBrushHorizontal(currentBrush);
        renderDesigner();
      });
      backdrop.querySelector('#me-designer-flip-v')?.addEventListener('click', () => {
        currentBrush = flipBrushVertical(currentBrush);
        renderDesigner();
      });
      backdrop.querySelector('#me-designer-clear')?.addEventListener('click', () => {
        currentBrush.grid = Array.from({ length: currentBrush.height }, () =>
          Array.from({ length: currentBrush.width }, () => null)
        );
        renderDesigner();
      });

      // Subcategories
      backdrop.querySelectorAll('.me-subcat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          designerSubCat = btn.getAttribute('data-subcat') as TileSubCategory;
          renderDesigner();
        });
      });

      // Placement rotation
      backdrop.querySelectorAll('[data-rot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedRotation = Number(btn.getAttribute('data-rot')) || 0;
          renderDesigner();
        });
      });

      // Tile selection
      backdrop.querySelectorAll('[data-tile-id]').forEach((icon) => {
        icon.addEventListener('click', () => {
          selectedTileId = Number(icon.getAttribute('data-tile-id'));
          cellMode = 'draw';
          renderDesigner();
        });
      });

      // Cell interaction
      backdrop.querySelectorAll('.me-matrix-cell').forEach((cellEl) => {
        const r = Number(cellEl.getAttribute('data-r'));
        const c = Number(cellEl.getAttribute('data-c'));

        cellEl.addEventListener('click', () => {
          selectedCell = { r, c };
          if (cellMode === 'erase') {
            currentBrush.grid[r][c] = null;
          } else if (cellMode === 'rotate') {
            if (currentBrush.grid[r][c]) {
              currentBrush.grid[r][c]!.rotation = (currentBrush.grid[r][c]!.rotation + 90) % 360;
            }
          } else {
            currentBrush.grid[r][c] = {
              tileId: selectedTileId,
              rotation: selectedRotation,
            };
          }
          renderDesigner();
        });

        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          selectedCell = { r, c };
          currentBrush.grid[r][c] = null; // clear cell to transparent
          renderDesigner();
        });
      });

      // Selected cell controls
      backdrop.querySelector('#me-cell-rot-btn')?.addEventListener('click', () => {
        if (selectedCell && currentBrush.grid[selectedCell.r][selectedCell.c]) {
          const cell = currentBrush.grid[selectedCell.r][selectedCell.c]!;
          cell.rotation = (cell.rotation + 90) % 360;
          renderDesigner();
        }
      });
      backdrop.querySelector('#me-cell-clear-btn')?.addEventListener('click', () => {
        if (selectedCell) {
          currentBrush.grid[selectedCell.r][selectedCell.c] = null;
          renderDesigner();
        }
      });

      // Save
      backdrop.querySelector('#me-designer-save')?.addEventListener('click', () => {
        const nameInput = backdrop.querySelector('#me-designer-name') as HTMLInputElement | null;
        if (nameInput && nameInput.value.trim()) {
          currentBrush.name = nameInput.value.trim();
        }

        const existingIdx = this.customBrushes.findIndex((b) => b.id === currentBrush.id);
        if (existingIdx !== -1) {
          this.customBrushes[existingIdx] = currentBrush;
        } else {
          this.customBrushes.push(currentBrush);
        }

        this.activeCustomBrushId = currentBrush.id;
        this.saveCustomBrushes(true);
        this.setTool('custom_brush');
        this.activeCategory = 'custom_brush';
        document.querySelectorAll('.me-tab-btn').forEach((t) => {
          t.classList.toggle('active', t.getAttribute('data-cat') === 'custom_brush');
        });
        this.renderPalette();
        this.draw();
        backdrop.remove();
      });
    };

    renderDesigner();
    document.body.appendChild(backdrop);
  }

  private downloadJson(): void {
    const jsonText = serializeLevelToJson(this.level);
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emberdeep_map_${this.level.biome.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 200);
  }
}
