import type { DownloadResponse, WhatsPulseBridge } from "./types";

export function invokeTauri(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  try {
    if (window.__TAURI__?.core && typeof window.__TAURI__.core.invoke === "function") {
      return window.__TAURI__.core.invoke(cmd, args).catch((err) => {
        console.warn(`[WhatsPulse IPC Error][${cmd}]`, err);
        throw err;
      });
    } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
      return window.__TAURI_INTERNALS__.invoke(cmd, args).catch((err) => {
        console.warn(`[WhatsPulse IPC Error][${cmd}]`, err);
        throw err;
      });
    }
  } catch (e) {
    console.error("[WhatsPulse IPC Exception]", e);
    return Promise.reject(e);
  }
  return Promise.resolve();
}

export function reportScriptError(name: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[WhatsPulse Script Error][${name}]`, message);
  invokeTauri("script_failed", { name, message }).catch(() => {});
}

export function logClient(message: unknown): void {
  console.log("[WhatsPulse Client]", message);
  invokeTauri("client_log", { message: String(message) }).catch(() => {});
}

export async function saveDownloadFile(
  filename: string,
  dataBase64: string,
  mimeType?: string
): Promise<DownloadResponse> {
  try {
    const res = (await invokeTauri("save_download_file", {
      filename,
      mimeType,
      dataBase64,
    })) as DownloadResponse | undefined;

    if (res && typeof res.success === "boolean") {
      return res;
    }
    return {
      success: true,
      filename,
      size_bytes: 0,
    };
  } catch (err) {
    return {
      success: false,
      filename,
      size_bytes: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function openDownloadFile(path: string): Promise<void> {
  await invokeTauri("open_download_file", { path });
}

export async function showInFolder(path: string): Promise<void> {
  await invokeTauri("show_in_folder", { path });
}

export const bridge: WhatsPulseBridge = {
  scriptFailed(name: string, message: string) {
    invokeTauri("script_failed", { name, message }).catch(() => {});
  },
  log(message: string) {
    invokeTauri("client_log", { message: String(message) }).catch(() => {});
  },
  connectionChanged(up: boolean) {
    invokeTauri("connection_changed", { up }).catch(() => {});
  },
  openSettings() {
    invokeTauri("open_settings").catch(() => {});
  },
  openDirectChat() {
    invokeTauri("open_direct_chat").catch(() => {});
  },
  triggerPanicMode() {
    invokeTauri("trigger_panic_mode").catch(() => {});
  },
  retry() {
    invokeTauri("retry_page").catch(() => {});
  },
  saveDownloadFile,
  openDownloadFile,
  showInFolder,
};
