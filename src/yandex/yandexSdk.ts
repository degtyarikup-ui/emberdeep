import { I18n } from '../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<any>;
    };
    ysdk?: any;
  }
}

export class YandexSDK {
  private static instance?: YandexSDK;
  public ysdk: any = null;
  public isReady = false;

  private constructor() {
    // singleton
  }

  static get(): YandexSDK {
    if (!YandexSDK.instance) {
      YandexSDK.instance = new YandexSDK();
    }
    return YandexSDK.instance;
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.YaGames) {
      console.log('[YandexSDK] Running outside Yandex Games environment');
      return;
    }

    try {
      this.ysdk = await window.YaGames.init();
      this.isReady = true;
      window.ysdk = this.ysdk;
      console.log('[YandexSDK] Initialized successfully');

      // Auto-detect environment language
      if (this.ysdk.environment && this.ysdk.environment.i18n) {
        const lang = this.ysdk.environment.i18n.lang;
        if (lang === 'ru' || lang === 'be' || lang === 'uk' || lang === 'kk') {
          I18n.get().setLanguage('ru');
        } else {
          I18n.get().setLanguage('en');
        }
      }

      // Notify Yandex that game has loaded
      if (this.ysdk.features && this.ysdk.features.LoadingAPI) {
        this.ysdk.features.LoadingAPI.ready();
      }
    } catch (err) {
      console.warn('[YandexSDK] Initialization error:', err);
    }
  }

  showFullscreenAdv(callbacks?: { onOpen?: () => void; onClose?: (wasShown: boolean) => void; onError?: (err: any) => void }): void {
    if (!this.ysdk || !this.ysdk.adv) {
      callbacks?.onClose?.(false);
      return;
    }

    this.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => callbacks?.onOpen?.(),
        onClose: (wasShown: boolean) => callbacks?.onClose?.(wasShown),
        onError: (err: any) => callbacks?.onError?.(err),
      },
    });
  }

  showRewardedVideo(callbacks: { onOpen?: () => void; onRewarded: () => void; onClose?: () => void; onError?: (err: any) => void }): void {
    if (!this.ysdk || !this.ysdk.adv) {
      // In dev environment or non-yandex, grant reward directly
      callbacks.onRewarded();
      callbacks.onClose?.();
      return;
    }

    this.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => callbacks.onOpen?.(),
        onRewarded: () => callbacks.onRewarded(),
        onClose: () => callbacks.onClose?.(),
        onError: (err: any) => callbacks.onError?.(err),
      },
    });
  }
}
