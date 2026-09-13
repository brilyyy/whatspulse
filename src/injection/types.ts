export interface WhatsPulsePrivacyConfig {
  enabled?: boolean;
  blur_radius?: number;
  blur_messages?: boolean;
  blur_last_messages?: boolean;
  blur_media?: boolean;
  blur_media_gallery?: boolean;
  blur_text_input?: boolean;
  blur_profile_pictures?: boolean;
  blur_contact_names?: boolean;
  no_transition_delay?: boolean;
  unblur_on_app_hover?: boolean;
  blur_on_idle?: boolean;
  idle_timeout_seconds?: number;
  message_blur_level?: number;
}

export interface WhatsPulseInjectedConfig {
  colorScheme?: string;
  blurLevel?: number;
  chatListCollapsed?: boolean;
  privacy?: WhatsPulsePrivacyConfig;
  customCss?: string;
  customWallpaperUrl?: string;
  customWallpaperOpacity?: number;
}

export interface WhatsPulseBridge {
  scriptFailed: (name: string, message: string) => void;
  log: (message: string) => void;
  connectionChanged: (up: boolean) => void;
  openSettings: () => void;
  openDirectChat: () => void;
  triggerPanicMode: () => void;
  retry: () => void;
}

export interface WhatsPulseApi {
  config: WhatsPulseInjectedConfig;
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  report: (name: string, error: unknown) => void;
  log: (message: string) => void;
  bridge: WhatsPulseBridge;
}

declare global {
  interface Window {
    __whatspulseConfig?: WhatsPulseInjectedConfig;
    __whatspulse?: WhatsPulseApi;
    __whatspulseSetTheme?: (mode: string) => void;
    __whatspulseSetCustomCss?: (css: string) => void;
    __whatspulseSetWallpaper?: (url: string, opacity?: number) => void;
    __whatspulseSetPrivacy?: (cfg?: WhatsPulsePrivacyConfig | null) => void;
    __whatspulseSetBlur?: (level: number) => void;
    __whatspulseOpenDirectChat?: () => void;
    __whatspulseTriggerNotificationClick?: (id: string, tag: string, title: string) => void;
    __TAURI__?: {
      core?: {
        invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    };
    __TAURI_INTERNALS__?: {
      invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }

  interface ServiceWorkerContainer {
    __whatspulsePatched?: boolean;
  }
}
