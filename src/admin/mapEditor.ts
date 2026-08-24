import './mapEditor.css';
import { ICONS } from './icons';
import {
  EDITOR_TILE,
  TILE_METAS,
  ENTITY_PALETTE,
  validateLevelData,
  exportLevelToTypeScript,
  createEmptyLevel,
  serializeLevelToJson,
  deserializeLevelFromJson,
  type EditorTileType,
  type ValidationResult,
} from './mapEditorHelper';
import { editorAssets } from './editorAssets';
import { buildLevel1, type LevelData } from '../world/level1';
import { getBiomeForDepth, type BiomeId } from '../world/biomes';
import type { EnemyKind } from '../entities/Enemy';
import type { PropKey } from '../gfx/propKeys';

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

  private activeTool: 'brush' | 'rect' | 'eraser' | 'picker' | 'inspect' | 'hand' = 'brush';
  private activeCategory: 'tiles' | 'poi' | 'enemy' | 'pickup' | 'prop' | 'tree' = 'tiles';
  private activeItemId: string | number = EDITOR_TILE.FLOOR;
  private searchQuery = '';

  private isMouseDown = false;
  private isPanning = false;
  private isSpaceHeld = false;
  private panStartX = 0;
  private panStartY = 0;
  private rectStartCol = -1;
  private rectStartRow = -1;
  private hoverCol = -1;
  private hoverRow = -1;
  private showGrid = true;

  private history: string[] = [];
  private historyIndex = -1;

  constructor(targetEl: HTMLElement) {
    this.container = targetEl;
    this.level = buildLevel1(1);
    this.pushHistory();
  }

  public init(): void {
    this.renderLayout();
    this.initCanvas();
    this.initEvents();
    this.renderPalette();
    this.updateStatus();
    this.fitToView();

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
  }

  public undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.level = deserializeLevelFromJson(this.history[this.historyIndex]);
      this.draw();
      this.updateStatus();
    }
  }

  public redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.level = deserializeLevelFromJson(this.history[this.historyIndex]);
      this.draw();
      this.updateStatus();
    }
  }

  private renderLayout(): void {
    this.container.innerHTML = `
      <div class="map-editor-container">
        <!-- Top Toolbar -->
        <div class="me-toolbar">
          <div class="me-toolbar-group">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Пресет:</label>
            <select id="me-preset-select" class="me-select">
              <option value="1">Уровень 1: Темный Лес (200x80)</option>
              <option value="2">Уровень 2: Руины (60x38)</option>
              <option value="3">Уровень 3: Катакомбы (60x38)</option>
              <option value="4">Уровень 4: Глубины (60x38)</option>
              <option value="5">Уровень 5: Бездна (60x38)</option>
              <option value="empty_forest">Новая: Лес (60x38)</option>
              <option value="empty_ruins">Новая: Руины (60x38)</option>
              <option value="empty_dungeon">Новая: Подземелье (60x38)</option>
            </select>
            <button id="me-load-preset-btn" class="me-btn">Загрузить</button>
          </div>

          <div class="me-toolbar-group">
            <span class="me-divider"></span>
            <label style="font-size:11px; color:var(--text-tertiary);">Биом:</label>
            <select id="me-biome-select" class="me-select">
              <option value="forest">Темный Лес</option>
              <option value="ruins">Руины</option>
              <option value="catacombs">Катакомбы</option>
              <option value="depths">Глубины</option>
              <option value="void">Бездна</option>
            </select>

            <label style="font-size:11px; color:var(--text-tertiary);">Сетка:</label>
            <input id="me-cols-input" type="number" class="me-input me-input-number" min="10" max="300" value="${this.level.cols}">
            <span style="color:var(--text-tertiary);">x</span>
            <input id="me-rows-input" type="number" class="me-input me-input-number" min="10" max="200" value="${this.level.rows}">
            <button id="me-resize-btn" class="me-btn">Применить</button>
          </div>

          <div class="me-toolbar-group">
            <span class="me-divider"></span>
            <button id="me-undo-btn" class="me-btn" title="Отмена (Ctrl+Z)">Отмена</button>
            <button id="me-redo-btn" class="me-btn" title="Повтор (Ctrl+Y)">Повтор</button>
            <button id="me-grid-toggle-btn" class="me-btn ${this.showGrid ? 'me-btn-primary' : ''}" title="Вкл/Выкл сетку">Сетка</button>
            <button id="me-fit-btn" class="me-btn" title="Вместить всю карту (Shift+1 / Ctrl+0)">${ICONS.maximize} По размеру</button>
          </div>

          <div class="me-toolbar-group">
            <span class="me-divider"></span>
            <button id="me-export-code-btn" class="me-btn me-btn-primary" title="Сгенерировать код level1.ts">
              ${ICONS.copy} Экспорт кода (TS)
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
              <button class="me-tool-btn active" data-tool="brush" title="Кисть (B)">
                ${ICONS.brush}
                <span>Кисть</span>
                <span class="me-tool-kbd">B</span>
              </button>
              <button class="me-tool-btn" data-tool="rect" title="Область (R)">
                ${ICONS.rect}
                <span>Область</span>
                <span class="me-tool-kbd">R</span>
              </button>
              <button class="me-tool-btn" data-tool="eraser" title="Ластик (E)">
                ${ICONS.eraser}
                <span>Ластик</span>
                <span class="me-tool-kbd">E</span>
              </button>
              <button class="me-tool-btn" data-tool="picker" title="Пипетка (I)">
                ${ICONS.picker}
                <span>Пипетка</span>
                <span class="me-tool-kbd">I</span>
              </button>
              <button class="me-tool-btn" data-tool="hand" title="Рука / Панорама (H или зажатый Пробел)">
                ${ICONS.hand}
                <span>Рука</span>
                <span class="me-tool-kbd">H</span>
              </button>
              <button class="me-tool-btn" data-tool="inspect" title="Инфо">
                ${ICONS.target}
                <span>Инфо</span>
              </button>
            </div>

            <div class="me-category-tabs">
              <button class="me-tab-btn active" data-cat="tiles">Тайлы <kbd>1</kbd></button>
              <button class="me-tab-btn" data-cat="poi">Точки <kbd>2</kbd></button>
              <button class="me-tab-btn" data-cat="enemy">Враги <kbd>3</kbd></button>
              <button class="me-tab-btn" data-cat="pickup">Лут <kbd>4</kbd></button>
              <button class="me-tab-btn" data-cat="prop">Пропсы <kbd>5</kbd></button>
              <button class="me-tab-btn" data-cat="tree">Деревья <kbd>6</kbd></button>
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
              <button id="me-hud-zoom-out" class="me-hud-btn" title="Уменьшить (-)">-</button>
              <span id="me-hud-zoom-val" class="me-hud-zoom-text" title="Клик для сброса на 100%">100%</span>
              <button id="me-hud-zoom-in" class="me-hud-btn" title="Увеличить (+)">+</button>
              <button id="me-hud-fit" class="me-hud-btn" style="width:auto; padding:0 5px;" title="По размеру (Shift+1)">Fit</button>
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

    document.getElementById('me-undo-btn')?.addEventListener('click', () => this.undo());
    document.getElementById('me-redo-btn')?.addEventListener('click', () => this.redo());

    document.getElementById('me-grid-toggle-btn')?.addEventListener('click', (e) => {
      this.showGrid = !this.showGrid;
      (e.target as HTMLElement).classList.toggle('me-btn-primary', this.showGrid);
      this.draw();
    });

    document.getElementById('me-fit-btn')?.addEventListener('click', () => this.fitToView());
    document.getElementById('me-hud-fit')?.addEventListener('click', () => this.fitToView());
    document.getElementById('me-hud-zoom-in')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
    document.getElementById('me-hud-zoom-out')?.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
    document.getElementById('me-hud-zoom-val')?.addEventListener('click', () => this.setZoom(1.0));

    document.getElementById('me-export-code-btn')?.addEventListener('click', () => this.showExportModal());
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
      } else if (e.shiftKey && (e.key === '!' || e.code === 'Digit1')) {
        this.fitToView();
      } else if (e.key === 'b' || e.key === 'B') {
        this.setTool('brush');
      } else if (e.key === 'r' || e.key === 'R') {
        this.setTool('rect');
      } else if (e.key === 'e' || e.key === 'E') {
        this.setTool('eraser');
      } else if (e.key === 'i' || e.key === 'I') {
        this.setTool('picker');
      } else if (e.key === 'h' || e.key === 'H') {
        this.setTool('hand');
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const catMap: Record<string, typeof this.activeCategory> = {
          '1': 'tiles',
          '2': 'poi',
          '3': 'enemy',
          '4': 'pickup',
          '5': 'prop',
          '6': 'tree',
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
      let tiles = Object.values(TILE_METAS);
      if (this.searchQuery) {
        tiles = tiles.filter((t) => t.name.toLowerCase().includes(this.searchQuery));
      }

      tiles.forEach((t) => {
        const item = document.createElement('div');
        const isActive = this.activeItemId === t.id;
        item.className = `me-palette-item ${isActive ? 'active' : ''}`;

        const previewImg = editorAssets.getTilePreviewUrl(t.id, this.level.biome.id);
        const iconContent = previewImg
          ? `<img src="${previewImg}" alt="${t.name}">`
          : `<div style="width:100%; height:100%; background:${t.color};"></div>`;

        item.innerHTML = `
          <div class="me-palette-icon" style="border: 1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'};">
            ${iconContent}
          </div>
          <div class="me-palette-label">${t.name}</div>
        `;
        item.addEventListener('click', () => {
          this.activeItemId = t.id;
          this.renderPalette();
          if (this.activeTool === 'hand' || this.activeTool === 'eraser' || this.activeTool === 'picker') {
            this.setTool('brush');
          }
        });
        listEl.appendChild(item);
      });
    } else {
      let items = ENTITY_PALETTE.filter((e) => e.category === this.activeCategory);
      if (this.searchQuery) {
        items = items.filter((e) => e.name.toLowerCase().includes(this.searchQuery));
      }

      items.forEach((ent) => {
        const item = document.createElement('div');
        const isActive = this.activeItemId === ent.id;
        item.className = `me-palette-item ${isActive ? 'active' : ''}`;

        const previewImg = editorAssets.getPreviewUrl(ent.id);
        const iconContent = previewImg
          ? `<img src="${previewImg}" alt="${ent.name}">`
          : `<span style="color:${ent.color}; font-size:10px; font-weight:600;">${ent.icon}</span>`;

        item.innerHTML = `
          <div class="me-palette-icon" style="border: 1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'};">
            ${iconContent}
          </div>
          <div class="me-palette-label">${ent.name}</div>
        `;
        item.addEventListener('click', () => {
          this.activeItemId = ent.id;
          this.renderPalette();
          if (this.activeTool === 'hand' || this.activeTool === 'eraser' || this.activeTool === 'picker') {
            this.setTool('brush');
          }
        });
        listEl.appendChild(item);
      });
    }
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
    this.draw();
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

    if (this.isMouseDown) {
      if (this.activeTool === 'brush' || this.activeTool === 'eraser') {
        if (col >= 0 && col < this.level.cols && row >= 0 && row < this.level.rows) {
          this.applyToolAt(col, row);
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
      this.updateCursorState();
      return;
    }

    if (this.isMouseDown) {
      this.isMouseDown = false;
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

      if (!removed) {
        this.level.data[row][col] = EDITOR_TILE.FLOOR;
      }
      this.draw();
      return;
    }

    if (this.activeTool === 'brush') {
      if (this.activeCategory === 'tiles') {
        this.level.data[row][col] = Number(this.activeItemId);
      } else if (this.activeCategory === 'poi') {
        if (this.activeItemId === 'spawn') this.level.spawn = { col, row };
        else if (this.activeItemId === 'altar') this.level.altar = { col, row };
        else if (this.activeItemId === 'exit') this.level.exit = { col, row };
      } else if (this.activeCategory === 'enemy') {
        this.level.enemies = this.level.enemies.filter((e) => e.col !== col || e.row !== row);
        this.level.enemies.push({ col, row, kind: this.activeItemId as EnemyKind });
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
        } else if (String(this.activeItemId).startsWith('flask_')) {
          this.level.flasks = this.level.flasks.filter((f) => f.col !== col || f.row !== row);
          this.level.flasks.push({ col, row, key: this.activeItemId as PropKey });
        }
      } else if (this.activeCategory === 'prop') {
        if (this.activeItemId === 'torch') {
          this.level.torches = this.level.torches.filter((t) => t.col !== col || t.row !== row);
          this.level.torches.push({ col, row });
        } else if (this.activeItemId === 'bonfire') {
          if (!this.level.bonfires) this.level.bonfires = [];
          this.level.bonfires = this.level.bonfires.filter((b) => b.col !== col || b.row !== row);
          this.level.bonfires.push({ col, row });
        } else {
          const solidProps = ['spikes', 'barrel', 'crate', 'fence', 'rock', 'tombstone', 'obelisk', 'minecart', 'mushroom'];
          const isSolid = solidProps.includes(String(this.activeItemId));
          this.level.decorations = this.level.decorations.filter((d) => d.col !== col || d.row !== row);
          this.level.decorations.push({ col, row, key: String(this.activeItemId), solid: isSolid });
        }
      } else if (this.activeCategory === 'tree') {
        if (!this.level.trees) this.level.trees = [];
        const kind = this.activeItemId === 'tree_oak' ? 'oak' : 'pine';
        this.level.trees = this.level.trees.filter((t) => t.col !== col || t.row !== row);
        this.level.trees.push({ col, row, kind });
      }
      this.draw();
    }
  }

  private applyRectFill(c0: number, r0: number, c1: number, r1: number): void {
    const minC = Math.max(0, Math.min(c0, c1));
    const maxC = Math.min(this.level.cols - 1, Math.max(c0, c1));
    const minR = Math.max(0, Math.min(r0, r1));
    const maxR = Math.min(this.level.rows - 1, Math.max(r0, r1));

    const tileVal = this.activeCategory === 'tiles' ? Number(this.activeItemId) : EDITOR_TILE.FLOOR;
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        this.level.data[r][c] = tileVal;
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
    const biomeId = this.level.biome.id;

    // 1. Draw Tiles (using actual tilesheet sprites)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = this.panX + c * step;
        const y = this.panY + r * step;

        if (x + step < 0 || x > this.canvas.width || y + step < 0 || y > this.canvas.height) continue;

        const tileType = (this.level.data[r]?.[c] ?? 0) as EditorTileType;
        editorAssets.drawTile(this.ctx, tileType, x, y, step, biomeId);
      }
    }

    // 2. Draw Grid Lines
    if (this.showGrid && step >= 8) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = this.panX + c * step;
        this.ctx.moveTo(x, this.panY);
        this.ctx.lineTo(x, this.panY + rows * step);
      }
      for (let r = 0; r <= rows; r++) {
        const y = this.panY + r * step;
        this.ctx.moveTo(this.panX, y);
        this.ctx.lineTo(this.panX + cols * step, y);
      }
      this.ctx.stroke();
    }

    // Outer Map Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.panX, this.panY, cols * step, rows * step);

    // 3. Collect All Drawable Entities for Y-Sorted Rendering
    const drawables: DrawableEntity[] = [];

    // Trees
    if (this.level.trees) {
      this.level.trees.forEach((tr) => {
        drawables.push({ col: tr.col, row: tr.row, spriteId: tr.kind === 'pine' ? 'tree_pine' : 'tree_oak', type: 'tree' });
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
    } else if (this.hoverCol >= 0 && this.hoverCol < cols && this.hoverRow >= 0 && this.hoverRow < rows && !this.isSpaceHeld && this.activeTool !== 'hand') {
      // Hover cell cursor
      const hx = this.panX + this.hoverCol * step;
      const hy = this.panY + this.hoverRow * step;
      this.ctx.strokeStyle = '#facc15';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(hx, hy, step, step);
    }
  }

  private showExportModal(): void {
    const code = exportLevelToTypeScript(this.level);

    const backdrop = document.createElement('div');
    backdrop.className = 'me-modal-backdrop';
    backdrop.innerHTML = `
      <div class="me-modal-window">
        <div class="me-modal-header">
          <span>Экспорт карты в TypeScript</span>
          <button id="me-modal-close" class="me-btn me-btn-danger">&times;</button>
        </div>
        <div class="me-modal-body">
          <p style="margin:0 0 8px 0; font-size:11px; color:var(--text-tertiary);">
            Скопируйте этот код и вставьте в <code>src/world/level1.ts</code>:
          </p>
          <textarea id="me-code-output" class="me-code-block" readonly>${code}</textarea>
        </div>
        <div class="me-modal-footer">
          <button id="me-copy-code-btn" class="me-btn me-btn-success">Скопировать в буфер</button>
          <button id="me-modal-done" class="me-btn">Готово</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#me-modal-close')?.addEventListener('click', close);
    backdrop.querySelector('#me-modal-done')?.addEventListener('click', close);

    backdrop.querySelector('#me-copy-code-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        const btn = backdrop.querySelector('#me-copy-code-btn') as HTMLElement;
        if (btn) btn.textContent = 'Скопировано!';
        setTimeout(() => {
          if (btn) btn.textContent = 'Скопировать в буфер';
        }, 2000);
      });
    });
  }

  private downloadJson(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(serializeLevelToJson(this.level));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `emberdeep_map_${this.level.biome.id}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
