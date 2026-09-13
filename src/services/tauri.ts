import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, UpdateResponse } from "../types/config";

export async function fetchSettings(): Promise<AppConfig> {
  return await invoke<AppConfig>("get_settings");
}

export async function saveSettingsApi(newConfig: AppConfig): Promise<void> {
  await invoke("save_settings", { newConfig });
}

export async function closeSettingsWindow(): Promise<void> {
  try {
    await invoke("close_settings");
  } catch (e) {
    console.error("Failed to close settings window:", e);
  }
}

export async function triggerPanicMode(): Promise<void> {
  try {
    await invoke("trigger_panic_mode");
  } catch (e) {
    console.error("Failed to trigger panic mode:", e);
  }
}

export async function testNotification(): Promise<void> {
  await invoke("test_notification");
}

export async function openAboutWindow(): Promise<void> {
  try {
    await invoke("open_about");
  } catch (e) {
    console.error("Failed to open about window:", e);
  }
}

export async function checkUpdates(): Promise<UpdateResponse> {
  return await invoke<UpdateResponse>("check_for_updates");
}

export async function getAutostartStatus(): Promise<boolean> {
  return await invoke<boolean>("get_autostart_status");
}

export async function setAutostart(enable: boolean): Promise<boolean> {
  return await invoke<boolean>("set_autostart", { enable });
}

export async function directChatApi(phone: string, message?: string | null): Promise<void> {
  await invoke("direct_chat", { phone, message: message || null });
}
