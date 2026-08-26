# CLAUDE.md

Инструкции для этого репозитория живут в **[AGENTS.md](AGENTS.md)** — прочти его перед первой правкой.
Обязателен также **[SPRITE_COMPOSITION_RULES.md](SPRITE_COMPOSITION_RULES.md)** — 9 правил по графике, локализации и продакшен-безопасности.

---

## ⚡ ГЛАВНЫЕ ПРАВИЛА ДЛЯ АГЕНТА (НАРУШЕНИЕ ЛОМАЕТ ДЕПЛОЙ)

1. **`npm run check` ОБЯЗАТЕЛЕН перед каждым коммитом и пушем!**
   * Включает линтер, Vitest (144 теста) и сборку `tsc -b && vite build`.
   * **Никогда не коммить и не пушь, если `npm run check` упал с ошибкой.**
   * В `tsconfig.json` включен строгий режим: `noUnusedLocals` и `noUnusedParameters`. Если параметр функции не используется, его имя **обязано** начинаться с нижнего подчёркивания (например, `_targetX`, `_delta`), иначе сборка `tsc -b` на GitHub CI падает с ошибкой `TS6133`.

2. **Рантайм-ассеты только в `public/assets/` и только через `asset()`** из `src/gfx/pack.ts`. Папка `vendor/` в сборку не попадает.

3. **Дебаг-меню и читы** — строго через `isDebugAllowed()` (`src/debug/access.ts`).

4. **Локализация** — любая новая строка в UI обязана быть сразу в обоих словарях (`RU` и `EN`) в `src/i18n/index.ts`. Никаких эмодзи в тексте.

5. **Визуальный контроль и скриншоты:**
   * Сделать скриншот сцены для проверки UI: `node --experimental-websocket scripts/capture_game.js --scene menu` (или `--scene game`).
   * Обработать концепт-арт в 32×32 пиксель-арт: `python3 scripts/pixel_asset_pipeline.py --input path/to/art.png`.

