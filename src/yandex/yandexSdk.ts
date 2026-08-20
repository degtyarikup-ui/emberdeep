import { I18n } from '../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YaGames?: {
      init: (options?: { signed?: boolean }) => Promise<any>;
    };
    ysdk?: any;
  }
}

export class YandexSDK {
  private static instance?: YandexSDK;
  public ysdk: any = null;
  public isReady = false;
  private isInitializing = false;
  private payments: any = null;
  private lastInterstitialTime = 0;
  private static readonly INTERSTITIAL_COOLDOWN_MS = 90 * 1000; // 90 seconds recommended by Yandex

  private constructor() {
    // singleton
  }

  static get(): YandexSDK {
    if (!YandexSDK.instance) {
      YandexSDK.instance = new YandexSDK();
    }
    return YandexSDK.instance;
  }

  /**
   * Helper that waits for window.YaGames to be defined if /sdk.js has a slight load delay.
   */
  private async waitForYaGames(timeoutMs = 2500): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (window.YaGames) return true;

    const start = Date.now();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (window.YaGames) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 30);
    });
  }

  /**
   * Must be called and awaited BEFORE Phaser.Game is created.
   * Yandex platform requirement (п. 1.1 / 1.19):
   * YaGames.init() must be called as early as possible during game initialization.
   */
  async init(): Promise<void> {
    if (this.isReady || this.isInitializing) return;
    this.isInitializing = true;

    const hasYaGames = await this.waitForYaGames(2500);
    if (!hasYaGames || !window.YaGames) {
      console.log('[YandexSDK] Running outside Yandex Games environment or YaGames not found');
      this.isInitializing = false;
      return;
    }

    try {
      this.ysdk = await window.YaGames.init();
      this.isReady = true;
      window.ysdk = this.ysdk;
      console.log('[YandexSDK] Initialized successfully');

      // 1. Auto-detect environment language from Yandex platform (п. 2.14)
      try {
        const env = this.ysdk.environment;
        if (env && env.i18n && env.i18n.lang) {
          const lang = env.i18n.lang.toLowerCase();
          console.log('[YandexSDK] Platform environment language:', lang);
          if (lang === 'ru' || lang === 'be' || lang === 'uk' || lang === 'kk') {
            I18n.get().setLanguage('ru');
          } else {
            I18n.get().setLanguage('en');
          }
        }
      } catch (e) {
        console.warn('[YandexSDK] Language detection error:', e);
      }

      // 2. Listen to platform pause / resume events (п. 1.19.4)
      try {
        if (this.ysdk.on) {
          this.ysdk.on('game_api_pause', () => {
            console.log('[YandexSDK] Event: game_api_pause');
            const game = (window as any).game;
            if (game && game.sound) {
              game.sound.pauseAll();
            }
          });
          this.ysdk.on('game_api_resume', () => {
            console.log('[YandexSDK] Event: game_api_resume');
            const game = (window as any).game;
            if (game && game.sound) {
              game.sound.resumeAll();
            }
          });
        }
      } catch (e) {
        console.warn('[YandexSDK] Event listener setup error:', e);
      }

      // 3. Preload in-app payments if available
      void this.initPayments();
    } catch (err) {
      console.warn('[YandexSDK] Initialization error:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Call this after all game assets are loaded and the game is playable.
   * Signals to Yandex that the loading screen can be dismissed (п. 1.19.2 LoadingAPI.ready()).
   */
  gameReady(): void {
    if (!this.ysdk) return;
    try {
      if (this.ysdk.features && this.ysdk.features.LoadingAPI && typeof this.ysdk.features.LoadingAPI.ready === 'function') {
        this.ysdk.features.LoadingAPI.ready();
        console.log('[YandexSDK] LoadingAPI.ready() called successfully');
      }
    } catch (err) {
      console.warn('[YandexSDK] LoadingAPI.ready() error:', err);
    }
  }

  /**
   * GameplayAPI: notify platform when active gameplay starts or resumes (п. 1.19.3).
   */
  gameplayStart(): void {
    if (!this.ysdk) return;
    try {
      if (this.ysdk.features && this.ysdk.features.GameplayAPI && typeof this.ysdk.features.GameplayAPI.start === 'function') {
        this.ysdk.features.GameplayAPI.start();
        console.log('[YandexSDK] GameplayAPI.start() called');
      }
    } catch (err) {
      console.warn('[YandexSDK] GameplayAPI.start() error:', err);
    }
  }

  /**
   * GameplayAPI: notify platform when gameplay stops / pauses (меню, пауза, экран смерти).
   */
  gameplayStop(): void {
    if (!this.ysdk) return;
    try {
      if (this.ysdk.features && this.ysdk.features.GameplayAPI && typeof this.ysdk.features.GameplayAPI.stop === 'function') {
        this.ysdk.features.GameplayAPI.stop();
        console.log('[YandexSDK] GameplayAPI.stop() called');
      }
    } catch (err) {
      console.warn('[YandexSDK] GameplayAPI.stop() error:', err);
    }
  }

  /**
   * Show fullscreen interstitial ad with strict cooldown check (§ 4.4)
   */
  showFullscreenAdvWithCooldown(callbacks?: {
    onOpen?: () => void;
    onClose?: (wasShown: boolean) => void;
    onError?: (err: any) => void;
  }): void {
    const now = Date.now();
    if (now - this.lastInterstitialTime < YandexSDK.INTERSTITIAL_COOLDOWN_MS) {
      callbacks?.onClose?.(false);
      return;
    }
    this.lastInterstitialTime = now;
    this.showFullscreenAdv(callbacks);
  }

  /**
   * Show fullscreen interstitial ad (between levels, on death, etc.).
   */
  showFullscreenAdv(callbacks?: {
    onOpen?: () => void;
    onClose?: (wasShown: boolean) => void;
    onError?: (err: any) => void;
  }): void {
    if (!this.ysdk || !this.ysdk.adv) {
      callbacks?.onClose?.(false);
      return;
    }

    this.gameplayStop();

    const game = (window as any).game;
    const wasMuted = game?.sound?.mute ?? false;
    if (game?.sound) {
      game.sound.mute = true;
    }

    this.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {
          callbacks?.onOpen?.();
        },
        onClose: (wasShown: boolean) => {
          if (game?.sound && !wasMuted) {
            game.sound.mute = false;
          }
          this.gameplayStart();
          callbacks?.onClose?.(wasShown);
        },
        onError: (err: any) => {
          console.warn('[YandexSDK] Fullscreen ad error:', err);
          if (game?.sound && !wasMuted) {
            game.sound.mute = false;
          }
          this.gameplayStart();
          callbacks?.onError?.(err);
        },
      },
    });
  }

  /**
   * Show rewarded video ad (resurrect, double gold, reroll perks, etc.).
   */
  showRewardedVideo(callbacks: {
    onOpen?: () => void;
    onRewarded: () => void;
    onClose?: () => void;
    onError?: (err: any) => void;
  }): void {
    if (!this.ysdk || !this.ysdk.adv) {
      // Dev fallback: grant reward immediately
      callbacks.onRewarded();
      callbacks.onClose?.();
      return;
    }

    this.gameplayStop();

    const game = (window as any).game;
    const wasMuted = game?.sound?.mute ?? false;
    if (game?.sound) {
      game.sound.mute = true;
    }

    this.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {
          callbacks.onOpen?.();
        },
        onRewarded: () => {
          callbacks.onRewarded();
        },
        onClose: () => {
          if (game?.sound && !wasMuted) {
            game.sound.mute = false;
          }
          this.gameplayStart();
          callbacks.onClose?.();
        },
        onError: (err: any) => {
          console.warn('[YandexSDK] Rewarded video error:', err);
          if (game?.sound && !wasMuted) {
            game.sound.mute = false;
          }
          this.gameplayStart();
          callbacks.onError?.(err);
        },
      },
    });
  }

  /**
   * Initialize in-app purchases object (ysdk.getPayments())
   */
  async initPayments(): Promise<any> {
    if (this.payments) return this.payments;
    if (!this.ysdk || typeof this.ysdk.getPayments !== 'function') return null;
    try {
      this.payments = await this.ysdk.getPayments();
      console.log('[YandexSDK] Payments API initialized');

      // Consume any lingering unconsumed purchases
      void this.consumePendingPurchases();
      return this.payments;
    } catch (e) {
      console.warn('[YandexSDK] Payments init error (normal if inaps not yet approved):', e);
      return null;
    }
  }

  /**
   * Purchase an In-App product (e.g. 'embers_100', 'embers_300', 'embers_1000')
   */
  async purchase(productId: string): Promise<{ success: boolean; purchase?: any; error?: string }> {
    if (!this.payments) {
      await this.initPayments();
    }
    if (!this.payments) {
      console.warn('[YandexSDK] Payments not available');
      return { success: false, error: 'Payments unavailable' };
    }

    try {
      const purchase = await this.payments.purchase({ id: productId });
      console.log('[YandexSDK] Purchase success:', purchase);

      // Consumable item: consume the purchase token immediately so it can be bought again
      if (purchase && purchase.purchaseToken) {
        try {
          await this.payments.consumePurchase(purchase.purchaseToken);
        } catch (consumeErr) {
          console.warn('[YandexSDK] Consume purchase error:', consumeErr);
        }
      }

      return { success: true, purchase };
    } catch (err: any) {
      console.warn('[YandexSDK] Purchase error or cancelled:', err);
      return { success: false, error: err?.message || 'Cancelled' };
    }
  }

  /**
   * Auto-consumes any pending purchases
   */
  private async consumePendingPurchases(): Promise<void> {
    if (!this.payments || typeof this.payments.getPurchases !== 'function') return;
    try {
      const purchases = await this.payments.getPurchases();
      if (Array.isArray(purchases)) {
        for (const p of purchases) {
          if (p.purchaseToken) {
            await this.payments.consumePurchase(p.purchaseToken);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Save player data to Yandex cloud storage (§ 1.9)
   */
  async savePlayerData(data: Record<string, any>): Promise<void> {
    if (!this.ysdk || typeof this.ysdk.getPlayer !== 'function') return;
    try {
      const player = await this.ysdk.getPlayer();
      if (player && typeof player.setData === 'function') {
        await player.setData(data, true);
        console.log('[YandexSDK] Cloud data saved successfully');
      }
    } catch (e) {
      console.warn('[YandexSDK] Cloud save error:', e);
    }
  }

  /**
   * Load player data from Yandex cloud storage (§ 1.9)
   */
  async loadPlayerData(): Promise<Record<string, any> | null> {
    if (!this.ysdk || typeof this.ysdk.getPlayer !== 'function') return null;
    try {
      const player = await this.ysdk.getPlayer();
      if (player && typeof player.getData === 'function') {
        const data = await player.getData();
        console.log('[YandexSDK] Cloud data loaded successfully');
        return data;
      }
    } catch (e) {
      console.warn('[YandexSDK] Cloud load error:', e);
    }
    return null;
  }
}
