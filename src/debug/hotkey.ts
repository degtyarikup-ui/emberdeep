import Phaser from 'phaser';
import { isDebugAllowed } from './access';

/** Все три нажатия должны уложиться в это окно, иначе счёт начинается заново. */
const TRIPLE_PRESS_WINDOW_MS = 600;

/**
 * Открывает инструменты разработчика по трём быстрым нажатиям «0»
 * (и на цифровом ряду, и на нумпаде).
 *
 * Почему так, а не видимой кнопкой и не F1:
 * - Правило §9 требует, чтобы вход в дебаг нельзя было найти случайно;
 *   видимая кнопка ещё и налезала на счётчик углей в меню.
 * - F1 ненадёжен: браузеры забирают его под собственную справку, и
 *   preventDefault срабатывает не везде.
 *
 * Если дебаг запрещён, обработчик не регистрируется вовсе — как того
 * и требует §9 (проверка до создания чего-либо, а не при открытии меню).
 */
export function registerDebugHotkey(scene: Phaser.Scene, onTrigger: () => void): void {
  if (!isDebugAllowed()) return;

  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  let pressCount = 0;
  let windowStartedAt = 0;

  const handler = (event: KeyboardEvent) => {
    if (event.code !== 'Digit0' && event.code !== 'Numpad0' && event.key !== '0') return;

    const now = scene.time.now;
    if (now - windowStartedAt > TRIPLE_PRESS_WINDOW_MS) {
      windowStartedAt = now;
      pressCount = 0;
    }

    pressCount += 1;
    if (pressCount >= 3) {
      pressCount = 0;
      windowStartedAt = 0;
      onTrigger();
    }
  };

  keyboard.on('keydown', handler);
  scene.events.once('shutdown', () => keyboard.off('keydown', handler));
}
