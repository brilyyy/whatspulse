import type { AppConfig } from "../types/config";
import { testNotification } from "../services/tauri";
import { showToast } from "../services/toast";

export function updateNotifIconModeUI(mode: string): void {
  const chips = document.querySelectorAll(".icon-mode-chip");
  chips.forEach((c) => {
    if (c.getAttribute("data-mode") === mode) c.classList.add("active");
    else c.classList.remove("active");
  });

  const secEmoji = document.getElementById("section-icon-emoji");
  const secSvg = document.getElementById("section-icon-svg");
  const secFile = document.getElementById("section-icon-file");

  if (secEmoji) secEmoji.style.display = mode === "emoji" ? "block" : "none";
  if (secSvg) secSvg.style.display = mode === "svg_preset" ? "block" : "none";
  if (secFile) secFile.style.display = mode === "custom_file" ? "block" : "none";
}

export function updateEmojiChipsUI(selectedEmoji: string): void {
  const chips = document.querySelectorAll(".emoji-chip");
  chips.forEach((c) => {
    if (c.getAttribute("data-emoji") === selectedEmoji) c.classList.add("active");
    else c.classList.remove("active");
  });
}

export function updateNotifPreviewBadge(): void {
  const preview = document.getElementById("notif-preview-badge");
  if (!preview) return;

  const activeMode =
    document.querySelector(".icon-mode-chip.active")?.getAttribute("data-mode") || "emoji";
  if (activeMode === "emoji") {
    const customEmoji = (document.getElementById("notif-custom-emoji") as HTMLInputElement | null)?.value.trim();
    preview.textContent = customEmoji || "💬";
  } else if (activeMode === "svg_preset") {
    const preset =
      (document.getElementById("notif-svg-preset") as HTMLSelectElement | null)?.value || "bubble_dots";
    if (preset === "bubble_pulse") preview.textContent = "⚡";
    else if (preset === "envelope") preview.textContent = "✉️";
    else preview.textContent = "🟢";
  } else if (activeMode === "custom_file") {
    preview.textContent = "📁";
  } else {
    preview.textContent = "📱";
  }
}

export function initNotifications(
  config: AppConfig,
  saveConfig: () => Promise<void>
): void {
  const notifEnabledEl = document.getElementById("notif-enabled") as HTMLInputElement | null;
  if (notifEnabledEl) notifEnabledEl.checked = config.notifications.enabled;

  const notifDndEl = document.getElementById("notif-dnd") as HTMLInputElement | null;
  if (notifDndEl) notifDndEl.checked = config.notifications.dnd;

  // Quiet Hours
  const quietHoursToggle = document.getElementById("quiet-hours-toggle") as HTMLInputElement | null;
  const quietHoursBox = document.getElementById("quiet-hours-box");
  const quietStart = document.getElementById("quiet-hours-start") as HTMLInputElement | null;
  const quietEnd = document.getElementById("quiet-hours-end") as HTMLInputElement | null;

  if (quietHoursToggle) {
    quietHoursToggle.checked = config.notifications.quiet_hours_enabled ?? false;
    if (quietHoursBox) {
      quietHoursBox.style.display = quietHoursToggle.checked ? "flex" : "none";
    }
  }
  if (quietStart) quietStart.value = config.notifications.quiet_hours_start || "22:00";
  if (quietEnd) quietEnd.value = config.notifications.quiet_hours_end || "07:00";

  // Notification Icon Settings
  const iconMode = config.notifications.icon_mode || "emoji";
  updateNotifIconModeUI(iconMode);

  const iconEmoji = config.notifications.icon_emoji || "💬";
  const customEmojiEl = document.getElementById("notif-custom-emoji") as HTMLInputElement | null;
  if (customEmojiEl) customEmojiEl.value = iconEmoji;
  updateEmojiChipsUI(iconEmoji);

  const svgPreset = config.notifications.svg_preset || "bubble_dots";
  const svgPresetEl = document.getElementById("notif-svg-preset") as HTMLSelectElement | null;
  if (svgPresetEl) svgPresetEl.value = svgPreset;

  const customFileEl = document.getElementById("notif-custom-file") as HTMLInputElement | null;
  if (customFileEl) customFileEl.value = config.notifications.custom_icon_path || "";

  updateNotifPreviewBadge();

  // Event listeners
  notifEnabledEl?.addEventListener("change", () => {
    config.notifications.enabled = notifEnabledEl.checked;
    saveConfig();
  });

  notifDndEl?.addEventListener("change", () => {
    config.notifications.dnd = notifDndEl.checked;
    saveConfig();
  });

  quietHoursToggle?.addEventListener("change", () => {
    config.notifications.quiet_hours_enabled = quietHoursToggle.checked;
    if (quietHoursBox) {
      quietHoursBox.style.display = quietHoursToggle.checked ? "flex" : "none";
    }
    saveConfig();
  });

  quietStart?.addEventListener("change", () => {
    config.notifications.quiet_hours_start = quietStart.value || "22:00";
    saveConfig();
  });

  quietEnd?.addEventListener("change", () => {
    config.notifications.quiet_hours_end = quietEnd.value || "07:00";
    saveConfig();
  });

  // Icon Mode Chips
  const iconModeChips = document.querySelectorAll(".icon-mode-chip");
  iconModeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const mode = chip.getAttribute("data-mode") || "emoji";
      config.notifications.icon_mode = mode;
      updateNotifIconModeUI(mode);
      updateNotifPreviewBadge();
      saveConfig();
    });
  });

  // Emoji Chips
  const emojiChips = document.querySelectorAll(".emoji-chip");
  emojiChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const emoji = chip.getAttribute("data-emoji") || "💬";
      config.notifications.icon_emoji = emoji;
      if (customEmojiEl) customEmojiEl.value = emoji;
      updateEmojiChipsUI(emoji);
      updateNotifPreviewBadge();
      saveConfig();
    });
  });

  customEmojiEl?.addEventListener("input", () => {
    const val = customEmojiEl.value.trim() || "💬";
    config.notifications.icon_emoji = val;
    updateEmojiChipsUI(val);
    updateNotifPreviewBadge();
  });
  customEmojiEl?.addEventListener("change", () => saveConfig());

  svgPresetEl?.addEventListener("change", () => {
    config.notifications.svg_preset = svgPresetEl.value || "bubble_dots";
    updateNotifPreviewBadge();
    saveConfig();
  });

  customFileEl?.addEventListener("change", () => {
    config.notifications.custom_icon_path = customFileEl.value.trim() || null;
    saveConfig();
  });

  document.getElementById("btn-browse-notif-icon")?.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".svg,.png,.ico";
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file && customFileEl) {
        const filePath = (file as unknown as { path?: string }).path || file.name;
        customFileEl.value = filePath;
        config.notifications.custom_icon_path = filePath;
        saveConfig();
      }
    };
    fileInput.click();
  });

  document.getElementById("btn-test-notif")?.addEventListener("click", async () => {
    try {
      await testNotification();
      showToast("Test notification sent!");
    } catch (e) {
      console.error("Test notification failed:", e);
      alert("Failed to send test notification: " + e);
    }
  });
}
