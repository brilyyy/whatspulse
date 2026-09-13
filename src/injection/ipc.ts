import type { WhatsPulseBridge } from "./types";

export function invokeTauri(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  try {
    if (window.__TAURI__?.core && typeof window.__TAURI__.core.invoke === "function") {
      return window.__TAURI__.core.invoke(cmd, args).catch((err) => {
        console.warn(`[WhatsPulse IPC Error][${cmd}]`, err);
      });
    } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
      return window.__TAURI_INTERNALS__.invoke(cmd, args).catch((err) => {
        console.warn(`[WhatsPulse IPC Error][${cmd}]`, err);
      });
    }
  } catch (e) {
    console.error("[WhatsPulse IPC Exception]", e);
  }
  return Promise.resolve();
}

export function reportScriptError(name: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[WhatsPulse Script Error][${name}]`, message);
  invokeTauri("script_failed", { name, message });
}

export function logClient(message: unknown): void {
  console.log("[WhatsPulse Client]", message);
  invokeTauri("client_log", { message: String(message) });
}

export const bridge: WhatsPulseBridge = {
  scriptFailed(name: string, message: string) {
    invokeTauri("script_failed", { name, message });
  },
  log(message: string) {
    invokeTauri("client_log", { message: String(message) });
  },
  connectionChanged(up: boolean) {
    invokeTauri("connection_changed", { up });
  },
  openSettings() {
    invokeTauri("open_settings");
  },
  openDirectChat() {
    invokeTauri("open_direct_chat");
  },
  triggerPanicMode() {
    invokeTauri("trigger_panic_mode");
  },
  retry() {
    invokeTauri("retry_page");
  },
};
