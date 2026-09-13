import type { AppConfig } from "./types/config";
import { fetchSettings, saveSettingsApi } from "./services/tauri";
import { showToast } from "./services/toast";
import { initNavigation } from "./modules/navigation";
import { initGeneral } from "./modules/general";
import { initAppearance } from "./modules/appearance";
import { initPrivacy } from "./modules/privacy";
import { initNotifications } from "./modules/notifications";
import { initDirectChat } from "./modules/direct-chat";

let currentConfig: AppConfig | null = null;

async function saveCurrentSettings(silent = false): Promise<void> {
  if (!currentConfig) return;
  try {
    await saveSettingsApi(currentConfig);
    if (!silent) {
      showToast("Settings saved");
    }
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

async function bootstrap(): Promise<void> {
  try {
    currentConfig = await fetchSettings();

    initNavigation();
    initGeneral(currentConfig, saveCurrentSettings);
    initAppearance(currentConfig, saveCurrentSettings);
    initPrivacy(currentConfig, saveCurrentSettings);
    initNotifications(currentConfig, saveCurrentSettings);
    initDirectChat();
  } catch (err) {
    console.error("Failed to bootstrap WhatsPulse settings:", err);
  }
}

window.addEventListener("DOMContentLoaded", bootstrap);
