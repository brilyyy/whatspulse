import type { AppConfig } from "../types/config";
import {
  getAutostartStatus,
  setAutostart,
  checkUpdates,
  openAboutWindow,
} from "../services/tauri";
import { showToast } from "../services/toast";

export async function initGeneral(
  config: AppConfig,
  saveConfig: () => Promise<void>
): Promise<void> {
  const startMinEl = document.getElementById("start-minimized") as HTMLInputElement | null;
  if (startMinEl) startMinEl.checked = config.window.start_minimized;

  const closeTrayEl = document.getElementById("close-to-tray") as HTMLInputElement | null;
  if (closeTrayEl) closeTrayEl.checked = config.window.close_to_tray;

  const showTrayEl = document.getElementById("show-tray") as HTMLInputElement | null;
  if (showTrayEl) showTrayEl.checked = config.tray.show_tray;

  const trayToggleEl = document.getElementById("tray-click-toggles") as HTMLInputElement | null;
  if (trayToggleEl) trayToggleEl.checked = config.tray.left_click_toggles;

  const checkUpdatesStartEl = document.getElementById(
    "check-updates-on-start"
  ) as HTMLInputElement | null;
  if (checkUpdatesStartEl) checkUpdatesStartEl.checked = config.check_updates_on_start ?? true;

  // Autostart Status
  const autostartEl = document.getElementById("autostart-toggle") as HTMLInputElement | null;
  try {
    const isAutostart = await getAutostartStatus();
    if (autostartEl) autostartEl.checked = isAutostart;
  } catch (e) {
    console.warn("Autostart check error:", e);
  }

  // Event Listeners
  startMinEl?.addEventListener("change", () => {
    config.window.start_minimized = startMinEl.checked;
    saveConfig();
  });

  closeTrayEl?.addEventListener("change", () => {
    config.window.close_to_tray = closeTrayEl.checked;
    saveConfig();
  });

  showTrayEl?.addEventListener("change", () => {
    config.tray.show_tray = showTrayEl.checked;
    saveConfig();
  });

  trayToggleEl?.addEventListener("change", () => {
    config.tray.left_click_toggles = trayToggleEl.checked;
    saveConfig();
  });

  checkUpdatesStartEl?.addEventListener("change", () => {
    config.check_updates_on_start = checkUpdatesStartEl.checked;
    saveConfig();
  });

  autostartEl?.addEventListener("change", async () => {
    config.window.autostart = autostartEl.checked;
    try {
      await setAutostart(autostartEl.checked);
      saveConfig();
    } catch (e) {
      console.error("Failed to set autostart:", e);
    }
  });

  // Dedicated About Window
  document.getElementById("btn-open-about-win")?.addEventListener("click", () => {
    openAboutWindow();
  });

  // Manual Check for Updates
  const btnCheckUpdates = document.getElementById("btn-check-updates-now");
  const updateStatusText = document.getElementById("settings-update-status");
  btnCheckUpdates?.addEventListener("click", async () => {
    if (btnCheckUpdates) btnCheckUpdates.textContent = "Checking...";
    if (updateStatusText) updateStatusText.textContent = "Querying GitHub Releases...";
    try {
      const res = await checkUpdates();
      if (res.has_update && res.latest_version) {
        if (updateStatusText) {
          updateStatusText.innerHTML = `✨ Update Available: <b>v${res.latest_version}</b> (Current: v${res.current_version})`;
          updateStatusText.style.color = "#00e699";
        }
        if (
          confirm(
            `New WhatsPulse update v${res.latest_version} is available!\n\nOpen release download page?`
          )
        ) {
          window.open(
            res.release_url || "https://github.com/brilyyy/whatspulse/releases",
            "_blank"
          );
        }
      } else {
        if (updateStatusText) {
          updateStatusText.textContent = `WhatsPulse v${res.current_version} is up to date!`;
          updateStatusText.style.color = "#00e699";
        }
        showToast("You are using the latest version");
      }
    } catch (e) {
      if (updateStatusText) {
        updateStatusText.textContent = "Failed to check for updates: " + e;
        updateStatusText.style.color = "#ff4d4d";
      }
    } finally {
      if (btnCheckUpdates) btnCheckUpdates.textContent = "🔄 Check for Updates";
    }
  });
}
