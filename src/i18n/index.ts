export type Language = 'ru' | 'en';

export interface TranslationDict {
  gameTitle: string;
  gameSubtitle: string;
  playSolo: string;
  playCoop: string;
  upgradesBtn: string;
  achievementsBtn: string;
  controlsTitle: string;
  wasdMove: string;
  lmbHits: string;
  spaceHit: string;
  eInteract: string;
  escPause: string;
  backBtn: string;
  selectClass: string;
  knightTitle: string;
  knightStats: string;
  knightSkill: string;
  rangerTitle: string;
  rangerStats: string;
  rangerSkill: string;
  wizardTitle: string;
  wizardStats: string;
  wizardSkill: string;
  langBtn: string;
  
  roomCode: string;
  connecting: string;
  waitingPlayers: string;
  readyBtn: string;
  startRun: string;
  copyCode: string;
  copied: string;

  embersCount: string;
  totalEarned: string;
  upgradePurchased: string;
  maxLevelReached: string;
  notEnoughEmbers: string;
  upgradeVitalityName: string;
  upgradeVitalityDesc: string;
  upgradeMightName: string;
  upgradeMightDesc: string;
  upgradeAgilityName: string;
  upgradeAgilityDesc: string;
  upgradeFortuneName: string;
  upgradeFortuneDesc: string;
  upgradeBountyName: string;
  upgradeBountyDesc: string;

  wave: string;
  level: string;
  bossAppeared: string;
  bossDefeated: string;
  dungeonCleared: string;
  heroFallen: string;
  resurrectPrompt: string;
  pressEToOpen: string;
  pressEToRest: string;
  pressEToEnter: string;
  gold: string;
  score: string;
  items: string;
  paused: string;
  resumeBtn: string;
  mainMenuBtn: string;
  restartBtn: string;

  achievementsHeader: string;
  achBreakCratesTitle: string;
  achBreakCratesDesc: string;
  achFirstBloodTitle: string;
  achFirstBloodDesc: string;
  achGoldRushTitle: string;
  achGoldRushDesc: string;
  achCollectorTitle: string;
  achCollectorDesc: string;
  achBossSlayerTitle: string;
  achBossSlayerDesc: string;
  achNearDeathTitle: string;
  achNearDeathDesc: string;
  achSpeedrunnerTitle: string;
  achSpeedrunnerDesc: string;
  unlocked: string;
  locked: string;

  // Monetization keys
  resurrectAdBtn: string;
  doubleEmbersBtn: string;
  embersDoubled: string;
  freeEmbersAdBtn: string;
  freeEmbersClaimed: string;
  buyEmbersSmall: string;
  buyEmbersMedium: string;
  buyEmbersLarge: string;
  shopHeader: string;
}

const RU: TranslationDict = {
  gameTitle: 'EMBERDEEP',
  gameSubtitle: 'тёмное фэнтези · кооп-рогалик · до 4 игроков',
  playSolo: 'ОДИНОЧНЫЙ СПУСК',
  playCoop: 'КООПЕРАТИВ (ОНЛАЙН)',
  upgradesBtn: 'УЛУЧШЕНИЯ У КОСТРА',
  achievementsBtn: 'ДОСТИЖЕНИЯ',
  controlsTitle: 'УПРАВЛЕНИЕ',
  wasdMove: 'WASD / Стрелки — Передвижение',
  lmbHits: 'ЛКМ / Пробел — Базовая атака / Выстрел',
  spaceHit: 'Пробел — Удар / Выстрел',
  eInteract: 'E — Взаимодействие (сундуки, порталы)',
  escPause: 'Esc / P — Пауза',
  backBtn: 'НАЗАД',
  selectClass: 'ВЫБЕРИТЕ КЛАСС',
  knightTitle: 'РЫЦАРЬ',
  knightStats: '3 HP · Меч (Урон x2)',
  knightSkill: 'ПКМ / Пробел · Круговой вихрь',
  rangerTitle: 'СЛЕДОПЫТ',
  rangerStats: '2 HP · Лук (Дальний бой)',
  rangerSkill: 'ЛКМ · Быстрая стрельба стрелами',
  wizardTitle: 'ВОЛШЕБНИК',
  wizardStats: '2 HP · Посох (Магия дальнего боя)',
  wizardSkill: 'ЛКМ · Сгустки тайной энергии',
  langBtn: 'ЯЗЫК: RU',

  roomCode: 'КОД КОМНАТЫ',
  connecting: 'Подключение...',
  waitingPlayers: 'Ожидание игроков...',
  readyBtn: 'ГОТОВ',
  startRun: 'НАЧАТЬ СПУСК',
  copyCode: 'СКОПИРОВАТЬ КОД',
  copied: 'СКОПИРОВАНО!',

  embersCount: 'Тёмные Угли: ',
  totalEarned: 'Всего собрано: ',
  upgradePurchased: 'Улучшено!',
  maxLevelReached: 'МАКС. УРОВЕНЬ',
  notEnoughEmbers: 'Не хватает углей!',
  upgradeVitalityName: 'Живучесть',
  upgradeVitalityDesc: 'Увеличивает максимальное здоровье героя',
  upgradeMightName: 'Заточка стали',
  upgradeMightDesc: 'Увеличивает базовый урон атак и стрел',
  upgradeAgilityName: 'Проворство',
  upgradeAgilityDesc: 'Повышает базовую скорость передвижения',
  upgradeFortuneName: 'Глаз удачи',
  upgradeFortuneDesc: 'Повышает базовый шанс критического удара',
  upgradeBountyName: 'Мешок старателя',
  upgradeBountyDesc: 'Даёт стартовое золото при входе в подземелье',

  wave: 'Волна',
  level: 'Этаж',
  bossAppeared: 'ПОЯВИЛСЯ ВЛАДЫКА БЕЗДНЫ!',
  bossDefeated: 'ВЛАДЫКА БЕЗДНЫ ПОВЕРЖЕН!',
  dungeonCleared: 'ПОДЗЕМЕЛЬЕ ЗАЧИЩЕНО!',
  heroFallen: 'ГЕРОЙ ПАЛ В БОЮ',
  resurrectPrompt: 'Посмотрите рекламу для мгновенного возрождения!',
  pressEToOpen: '[E] Открыть сундук',
  pressEToRest: '[E] Присесть у костра',
  pressEToEnter: '[E] Войти в портал',
  gold: 'Золото',
  score: 'Счет',
  items: 'Предметы',
  paused: 'ПАУЗА',
  resumeBtn: 'ПРОДОЛЖИТЬ',
  mainMenuBtn: 'В ГЛАВНОЕ МЕНЮ',
  restartBtn: 'НАЧАТЬ ЗАНОВО',

  achievementsHeader: 'ДОСТИЖЕНИЯ',
  achBreakCratesTitle: 'Ломать не строить',
  achBreakCratesDesc: 'Разбей 10 ящиков или бочек',
  achFirstBloodTitle: 'Первая кровь',
  achFirstBloodDesc: 'Уничтожь своего первого врага',
  achGoldRushTitle: 'Золотая лихорадка',
  achGoldRushDesc: 'Собери 50 золотых монет',
  achCollectorTitle: 'Коллекционер',
  achCollectorDesc: 'Собери 3 разных предмета',
  achBossSlayerTitle: 'Убийца демонов',
  achBossSlayerDesc: 'Победи Архидемона Бездны',
  achNearDeathTitle: 'Второе дыхание',
  achNearDeathDesc: 'Воскресни с Короной Бессмертия',
  achSpeedrunnerTitle: 'Быстрые ноги',
  achSpeedrunnerDesc: 'Используй рывок на Shift',
  unlocked: 'Открыто',
  locked: 'Заблокировано',

  // Monetization keys
  resurrectAdBtn: '[!] ВОСКРЕСНУТЬ (РЕКЛАМА)',
  doubleEmbersBtn: '[x2] УДВОИТЬ УГЛИ (ВИДЕО)',
  embersDoubled: '[OK] УГЛИ УДВОЕНЫ!',
  freeEmbersAdBtn: '[+] +15 УГЛЕЙ (ВИДЕО)',
  freeEmbersClaimed: '[OK] ПОЛУЧЕНО!',
  buyEmbersSmall: '100 Углей (49 ЯН)',
  buyEmbersMedium: '300 Углей (129 ЯН)',
  buyEmbersLarge: '1000 Углей (299 ЯН)',
  shopHeader: 'МАГАЗИН УГЛЕЙ',
};

const EN: TranslationDict = {
  gameTitle: 'EMBERDEEP',
  gameSubtitle: 'dark fantasy · coop roguelite · up to 4 players',
  playSolo: 'SOLO EXPEDITION',
  playCoop: 'CO-OP MULTIPLAYER',
  upgradesBtn: 'BONFIRE UPGRADES',
  achievementsBtn: 'ACHIEVEMENTS',
  controlsTitle: 'CONTROLS',
  wasdMove: 'WASD / Arrow Keys — Movement',
  lmbHits: 'LMB / Space — Basic Attack / Shoot',
  spaceHit: 'Space — Attack / Shoot',
  eInteract: 'E — Interact (chests, portals)',
  escPause: 'Esc / P — Pause',
  backBtn: 'BACK',
  selectClass: 'SELECT CLASS',
  knightTitle: 'KNIGHT',
  knightStats: '3 HP · Sword (2x Damage)',
  knightSkill: 'RMB / Space · Whirlwind Slash',
  rangerTitle: 'RANGER',
  rangerStats: '2 HP · Bow (Ranged Combat)',
  rangerSkill: 'LMB · Rapid Arrow Fire',
  wizardTitle: 'WIZARD',
  wizardStats: '2 HP · Staff (Ranged Magic)',
  wizardSkill: 'LMB · Arcane Energy Blasts',
  langBtn: 'LANG: EN',

  roomCode: 'ROOM CODE',
  connecting: 'Connecting...',
  waitingPlayers: 'Waiting for players...',
  readyBtn: 'READY',
  startRun: 'START DESCENT',
  copyCode: 'COPY CODE',
  copied: 'COPIED!',

  embersCount: 'Dark Embers: ',
  totalEarned: 'Total Collected: ',
  upgradePurchased: 'Upgraded!',
  maxLevelReached: 'MAX LEVEL',
  notEnoughEmbers: 'Not enough embers!',
  upgradeVitalityName: 'Vitality',
  upgradeVitalityDesc: 'Increases hero maximum health',
  upgradeMightName: 'Honed Steel',
  upgradeMightDesc: 'Increases base melee and ranged damage',
  upgradeAgilityName: 'Agility',
  upgradeAgilityDesc: 'Increases base movement speed',
  upgradeFortuneName: 'Eye of Fortune',
  upgradeFortuneDesc: 'Increases base critical strike chance',
  upgradeBountyName: 'Prospector Pouch',
  upgradeBountyDesc: 'Grants bonus starting gold upon descent',

  wave: 'Wave',
  level: 'Floor',
  bossAppeared: 'LORD OF THE ABYSS HAS AWOKEN!',
  bossDefeated: 'LORD OF THE ABYSS DEFEATED!',
  dungeonCleared: 'DUNGEON CLEARED!',
  heroFallen: 'HERO HAS FALLEN',
  resurrectPrompt: 'Watch a short ad for an instant revival!',
  pressEToOpen: '[E] Open Chest',
  pressEToRest: '[E] Rest by Fire',
  pressEToEnter: '[E] Enter Portal',
  gold: 'Gold',
  score: 'Score',
  items: 'Items',
  paused: 'PAUSED',
  resumeBtn: 'RESUME',
  mainMenuBtn: 'MAIN MENU',
  restartBtn: 'RESTART',

  achievementsHeader: 'ACHIEVEMENTS',
  achBreakCratesTitle: 'Demolition Expert',
  achBreakCratesDesc: 'Smash 10 crates or barrels',
  achFirstBloodTitle: 'First Blood',
  achFirstBloodDesc: 'Slay your first dungeon monster',
  achGoldRushTitle: 'Gold Rush',
  achGoldRushDesc: 'Collect 50 gold coins',
  achCollectorTitle: 'Collector',
  achCollectorDesc: 'Equip 3 different items',
  achBossSlayerTitle: 'Demon Slayer',
  achBossSlayerDesc: 'Defeat the Archdemon of the Abyss',
  achNearDeathTitle: 'Second Wind',
  achNearDeathDesc: 'Revive using the Crown of Immortality',
  achSpeedrunnerTitle: 'Swift Stride',
  achSpeedrunnerDesc: 'Perform a tactical dodge with Shift',
  unlocked: 'Unlocked',
  locked: 'Locked',

  // Monetization keys
  resurrectAdBtn: '[!] RESURRECT (WATCH AD)',
  doubleEmbersBtn: '[x2] DOUBLE EMBERS (WATCH AD)',
  embersDoubled: '[OK] EMBERS DOUBLED!',
  freeEmbersAdBtn: '[+] +15 EMBERS (WATCH AD)',
  freeEmbersClaimed: '[OK] CLAIMED!',
  buyEmbersSmall: '100 Embers (49 YAN)',
  buyEmbersMedium: '300 Embers (129 YAN)',
  buyEmbersLarge: '1000 Embers (299 YAN)',
  shopHeader: 'EMBER SHOP',
};

const STORAGE_KEY = 'emberdeep_lang';

export class I18n {
  private static instance?: I18n;
  private currentLang: Language = 'ru';

  private constructor() {
    this.initLanguage();
  }

  static get(): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  private initLanguage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === 'ru' || saved === 'en') {
        this.currentLang = saved;
        return;
      }
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('en')) {
        this.currentLang = 'en';
      } else {
        this.currentLang = 'ru';
      }
    } catch {
      this.currentLang = 'ru';
    }
  }

  get lang(): Language {
    return this.currentLang;
  }

  setLanguage(lang: Language): void {
    this.currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  toggleLanguage(): Language {
    const next: Language = this.currentLang === 'ru' ? 'en' : 'ru';
    this.setLanguage(next);
    return next;
  }

  t(): TranslationDict {
    return this.currentLang === 'ru' ? RU : EN;
  }
}

export const t = (): TranslationDict => I18n.get().t();
