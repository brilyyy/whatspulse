import { invoke } from "@tauri-apps/api/core";

interface WindowConfig {
  start_minimized: boolean;
  close_to_tray: boolean;
  autostart?: boolean;
  width: number;
  height: number;
}

interface TrayConfig {
  show_tray: boolean;
  left_click_toggles: boolean;
  unread_badge: boolean;
}

interface AppearanceConfig {
  theme: string;
  zoom_factor: number;
  chat_list_collapsed: boolean;
  custom_css?: string;
  custom_wallpaper_url?: string;
  custom_wallpaper_opacity?: number;
}

interface PrivacyConfig {
  enabled: boolean;
  blur_messages: boolean;
  blur_last_messages: boolean;
  blur_media: boolean;
  blur_media_gallery: boolean;
  blur_text_input: boolean;
  blur_profile_pictures: boolean;
  blur_contact_names: boolean;
  no_transition_delay: boolean;
  unblur_on_app_hover: boolean;
  blur_on_idle: boolean;
  idle_timeout_seconds: number;
  blur_radius: number;
  message_blur_level?: number;
}

interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  dnd: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  icon_mode?: string;
  icon_emoji?: string;
  svg_preset?: string;
  custom_icon_path?: string | null;
}

interface AppConfig {
  window: WindowConfig;
  tray: TrayConfig;
  appearance: AppearanceConfig;
  privacy: PrivacyConfig;
  notifications: NotificationConfig;
  user_agent: string | null;
  check_updates_on_start?: boolean;
}

declare global {
  interface Window {
    __whatspulseOnShow?: (tab?: string) => void;
    __whatspulseOpenDirectChat?: () => void;
  }
}

let currentConfig: AppConfig | null = null;
let toastTimeout: number | undefined;

function showToast(msg = "Settings saved") {
  const toast = document.getElementById("toast");
  const toastMsg = toast?.querySelector(".toast-msg");
  if (toast) {
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }
}

function applyTheme(theme: string) {
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.body.removeAttribute("data-app-theme");
  } else if (
    theme === "amoled" ||
    theme === "catppuccin" ||
    theme === "nord" ||
    theme === "dracula" ||
    theme === "tokyonight" ||
    theme === "gruvbox" ||
    theme === "cyberpunk"
  ) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-app-theme", theme);
  } else {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.removeAttribute("data-app-theme");
  }
}

function updateThemeCardUI(theme: string) {
  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    if (card.getAttribute("data-theme-val") === theme) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });
}

function updateNotifIconModeUI(mode: string) {
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

function updateEmojiChipsUI(selectedEmoji: string) {
  const chips = document.querySelectorAll(".emoji-chip");
  chips.forEach((c) => {
    if (c.getAttribute("data-emoji") === selectedEmoji) c.classList.add("active");
    else c.classList.remove("active");
  });
}

function updateNotifPreviewBadge() {
  const preview = document.getElementById("notif-preview-badge");
  if (!preview) return;

  const activeMode = document.querySelector(".icon-mode-chip.active")?.getAttribute("data-mode") || "emoji";
  if (activeMode === "emoji") {
    const customEmoji = (document.getElementById("notif-custom-emoji") as HTMLInputElement)?.value.trim();
    preview.textContent = customEmoji || "💬";
  } else if (activeMode === "svg_preset") {
    const preset = (document.getElementById("notif-svg-preset") as HTMLSelectElement)?.value || "bubble_dots";
    if (preset === "bubble_pulse") preview.textContent = "⚡";
    else if (preset === "envelope") preview.textContent = "✉️";
    else preview.textContent = "🟢";
  } else if (activeMode === "custom_file") {
    preview.textContent = "📁";
  } else {
    preview.textContent = "📱";
  }
}

function formatIdleTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  return mins === 1 ? "1 min" : `${mins} mins`;
}

function updateLiveSimulator(privacy: PrivacyConfig) {
  if (!privacy) return;
  const frame = document.getElementById("sim-frame");
  if (!frame) return;

  const isMaster = privacy.enabled !== false;
  const radius = privacy.blur_radius || 8;

  frame.style.setProperty("--sim-blur-radius", `${radius}px`);

  if (!isMaster) {
    frame.classList.add("sim-all-disabled");
  } else {
    frame.classList.remove("sim-all-disabled");
  }

  if (privacy.no_transition_delay) {
    frame.classList.add("sim-no-delay");
  } else {
    frame.classList.remove("sim-no-delay");
  }

  if (privacy.unblur_on_app_hover) {
    frame.classList.add("sim-app-hover-active");
  } else {
    frame.classList.remove("sim-app-hover-active");
  }

  const toggleBlurClass = (id: string, shouldBlur: boolean) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isMaster && shouldBlur) {
      el.classList.add("sim-blur-target");
    } else {
      el.classList.remove("sim-blur-target");
    }
  };

  toggleBlurClass("sim-avatar-wrap", privacy.blur_profile_pictures === true);
  toggleBlurClass("sim-name", privacy.blur_contact_names === true);
  toggleBlurClass("sim-message-text", privacy.blur_messages !== false);
  toggleBlurClass("sim-media-box", privacy.blur_media !== false);
  toggleBlurClass("sim-input-box", privacy.blur_text_input !== false);
}

function updatePrivacyUI(privacy: PrivacyConfig) {
  if (!privacy) return;

  const masterToggle = document.getElementById("privacy-master-toggle") as HTMLInputElement;
  const masterStatus = document.getElementById("privacy-master-status");
  const masterCard = document.querySelector(".master-privacy-card");

  const isEnabled = privacy.enabled !== false;
  if (masterToggle) masterToggle.checked = isEnabled;
  if (masterStatus) {
    masterStatus.textContent = isEnabled ? "Active Protection" : "Disabled";
    masterStatus.className = isEnabled ? "status-pill pill-active" : "status-pill pill-disabled";
  }
  if (masterCard) {
    if (isEnabled) {
      masterCard.classList.remove("disabled");
    } else {
      masterCard.classList.add("disabled");
    }
  }

  const setCheck = (id: string, val: boolean) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) el.checked = val;
  };

  setCheck("blur-messages", privacy.blur_messages !== false);
  setCheck("blur-last-messages", privacy.blur_last_messages !== false);
  setCheck("blur-media", privacy.blur_media !== false);
  setCheck("blur-media-gallery", privacy.blur_media_gallery !== false);
  setCheck("blur-text-input", privacy.blur_text_input !== false);
  setCheck("blur-profile-pictures", privacy.blur_profile_pictures === true);
  setCheck("blur-contact-names", privacy.blur_contact_names === true);
  setCheck("no-transition-delay", privacy.no_transition_delay === true);
  setCheck("unblur-on-app-hover", privacy.unblur_on_app_hover === true);
  setCheck("blur-on-idle", privacy.blur_on_idle === true);

  const idleGroup = document.getElementById("idle-timeout-group");
  const idleSlider = document.getElementById("idle-timeout-slider") as HTMLInputElement;
  const idleDisplay = document.getElementById("idle-timeout-display");
  const timeout = privacy.idle_timeout_seconds || 120;
  if (idleGroup) idleGroup.style.display = privacy.blur_on_idle ? "block" : "none";
  if (idleSlider) idleSlider.value = String(timeout);
  if (idleDisplay) idleDisplay.textContent = formatIdleTime(timeout);

  const radius = privacy.blur_radius || 8;
  const radiusSlider = document.getElementById("blur-radius-slider") as HTMLInputElement;
  const radiusDisplay = document.getElementById("blur-radius-display");
  if (radiusSlider) radiusSlider.value = String(radius);
  if (radiusDisplay) radiusDisplay.textContent = `${radius}px`;

  const radiusPills = document.querySelectorAll(".blur-radius-pill");
  radiusPills.forEach((p) => {
    const r = parseInt(p.getAttribute("data-radius") || "8", 10);
    if (r === radius) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  updateLiveSimulator(privacy);
}

function updateZoomUI(factor: number) {
  const zoomIndicator = document.getElementById("zoom-indicator");
  const zoomRange = document.getElementById("zoom-range") as HTMLInputElement;
  const zoomSelect = document.getElementById("zoom-select") as HTMLSelectElement;
  const presetPills = document.querySelectorAll(".preset-pill");

  const percentage = Math.round(factor * 100);
  if (zoomIndicator) zoomIndicator.textContent = `${percentage}%`;
  if (zoomRange) zoomRange.value = String(factor);
  if (zoomSelect) zoomSelect.value = String(factor);

  presetPills.forEach((pill) => {
    const pillVal = parseFloat(pill.getAttribute("data-zoom") || "1.0");
    if (Math.abs(pillVal - factor) < 0.02) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });
}

async function loadSettings() {
  try {
    const cfg = await invoke<AppConfig>("get_settings");
    currentConfig = cfg;

    // Window & Tray
    const startMinEl = document.getElementById("start-minimized") as HTMLInputElement;
    if (startMinEl) startMinEl.checked = cfg.window.start_minimized;

    const closeTrayEl = document.getElementById("close-to-tray") as HTMLInputElement;
    if (closeTrayEl) closeTrayEl.checked = cfg.window.close_to_tray;

    const showTrayEl = document.getElementById("show-tray") as HTMLInputElement;
    if (showTrayEl) showTrayEl.checked = cfg.tray.show_tray;

    const trayToggleEl = document.getElementById("tray-click-toggles") as HTMLInputElement;
    if (trayToggleEl) trayToggleEl.checked = cfg.tray.left_click_toggles;

    const checkUpdatesStartEl = document.getElementById("check-updates-on-start") as HTMLInputElement;
    if (checkUpdatesStartEl) checkUpdatesStartEl.checked = cfg.check_updates_on_start ?? true;

    // Appearance
    updateThemeCardUI(cfg.appearance.theme);
    applyTheme(cfg.appearance.theme);
    updateZoomUI(cfg.appearance.zoom_factor);

    const customCssEl = document.getElementById("custom-css") as HTMLTextAreaElement;
    if (customCssEl) customCssEl.value = cfg.appearance.custom_css || "";

    const wallpaperUrlEl = document.getElementById("wallpaper-url") as HTMLInputElement;
    if (wallpaperUrlEl) wallpaperUrlEl.value = cfg.appearance.custom_wallpaper_url || "";

    const wallpaperOpacityEl = document.getElementById("wallpaper-opacity") as HTMLInputElement;
    const wallpaperOpacityVal = document.getElementById("wallpaper-opacity-val");
    const opacity = cfg.appearance.custom_wallpaper_opacity ?? 0.15;
    if (wallpaperOpacityEl) wallpaperOpacityEl.value = String(opacity);
    if (wallpaperOpacityVal) wallpaperOpacityVal.textContent = `${Math.round(opacity * 100)}%`;

    // Privacy
    updatePrivacyUI(cfg.privacy);

    // Notifications
    const notifEnabledEl = document.getElementById("notif-enabled") as HTMLInputElement;
    if (notifEnabledEl) notifEnabledEl.checked = cfg.notifications.enabled;

    const notifDndEl = document.getElementById("notif-dnd") as HTMLInputElement;
    if (notifDndEl) notifDndEl.checked = cfg.notifications.dnd;

    // Quiet Hours
    const quietHoursToggle = document.getElementById("quiet-hours-toggle") as HTMLInputElement;
    const quietHoursBox = document.getElementById("quiet-hours-box");
    const quietStart = document.getElementById("quiet-hours-start") as HTMLInputElement;
    const quietEnd = document.getElementById("quiet-hours-end") as HTMLInputElement;
    if (quietHoursToggle) {
      quietHoursToggle.checked = cfg.notifications.quiet_hours_enabled ?? false;
      if (quietHoursBox) {
        quietHoursBox.style.display = quietHoursToggle.checked ? "flex" : "none";
      }
    }
    if (quietStart) quietStart.value = cfg.notifications.quiet_hours_start || "22:00";
    if (quietEnd) quietEnd.value = cfg.notifications.quiet_hours_end || "07:00";

    // Notification Icon Settings
    const iconMode = cfg.notifications.icon_mode || "emoji";
    updateNotifIconModeUI(iconMode);

    const iconEmoji = cfg.notifications.icon_emoji || "💬";
    const customEmojiEl = document.getElementById("notif-custom-emoji") as HTMLInputElement;
    if (customEmojiEl) customEmojiEl.value = iconEmoji;
    updateEmojiChipsUI(iconEmoji);

    const svgPreset = cfg.notifications.svg_preset || "bubble_dots";
    const svgPresetEl = document.getElementById("notif-svg-preset") as HTMLSelectElement;
    if (svgPresetEl) svgPresetEl.value = svgPreset;

    const customFileEl = document.getElementById("notif-custom-file") as HTMLInputElement;
    if (customFileEl) customFileEl.value = cfg.notifications.custom_icon_path || "";

    updateNotifPreviewBadge();

    // Autostart
    try {
      const isAutostart = await invoke<boolean>("get_autostart_status");
      const autostartEl = document.getElementById("autostart-toggle") as HTMLInputElement;
      if (autostartEl) autostartEl.checked = isAutostart;
    } catch (e) {
      console.warn("Autostart check error:", e);
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

async function saveSettings(silent = false) {
  if (!currentConfig) return;

  const startMinEl = document.getElementById("start-minimized") as HTMLInputElement;
  const closeTrayEl = document.getElementById("close-to-tray") as HTMLInputElement;
  const showTrayEl = document.getElementById("show-tray") as HTMLInputElement;
  const trayToggleEl = document.getElementById("tray-click-toggles") as HTMLInputElement;
  const checkUpdatesStartEl = document.getElementById("check-updates-on-start") as HTMLInputElement;
  const notifEnabledEl = document.getElementById("notif-enabled") as HTMLInputElement;
  const notifDndEl = document.getElementById("notif-dnd") as HTMLInputElement;

  // Appearance fields
  const customCssEl = document.getElementById("custom-css") as HTMLTextAreaElement;
  if (customCssEl) currentConfig.appearance.custom_css = customCssEl.value;

  const wallpaperUrlEl = document.getElementById("wallpaper-url") as HTMLInputElement;
  if (wallpaperUrlEl) currentConfig.appearance.custom_wallpaper_url = wallpaperUrlEl.value.trim();

  const wallpaperOpacityEl = document.getElementById("wallpaper-opacity") as HTMLInputElement;
  if (wallpaperOpacityEl) currentConfig.appearance.custom_wallpaper_opacity = parseFloat(wallpaperOpacityEl.value) || 0.15;

  // Privacy Config Elements
  const masterToggle = document.getElementById("privacy-master-toggle") as HTMLInputElement;
  const blurMessages = document.getElementById("blur-messages") as HTMLInputElement;
  const blurLastMessages = document.getElementById("blur-last-messages") as HTMLInputElement;
  const blurMedia = document.getElementById("blur-media") as HTMLInputElement;
  const blurMediaGallery = document.getElementById("blur-media-gallery") as HTMLInputElement;
  const blurTextInput = document.getElementById("blur-text-input") as HTMLInputElement;
  const blurProfilePictures = document.getElementById("blur-profile-pictures") as HTMLInputElement;
  const blurContactNames = document.getElementById("blur-contact-names") as HTMLInputElement;
  const noTransitionDelay = document.getElementById("no-transition-delay") as HTMLInputElement;
  const unblurOnAppHover = document.getElementById("unblur-on-app-hover") as HTMLInputElement;
  const blurOnIdle = document.getElementById("blur-on-idle") as HTMLInputElement;
  const idleSlider = document.getElementById("idle-timeout-slider") as HTMLInputElement;
  const radiusSlider = document.getElementById("blur-radius-slider") as HTMLInputElement;

  if (masterToggle) currentConfig.privacy.enabled = masterToggle.checked;
  if (blurMessages) currentConfig.privacy.blur_messages = blurMessages.checked;
  if (blurLastMessages) currentConfig.privacy.blur_last_messages = blurLastMessages.checked;
  if (blurMedia) currentConfig.privacy.blur_media = blurMedia.checked;
  if (blurMediaGallery) currentConfig.privacy.blur_media_gallery = blurMediaGallery.checked;
  if (blurTextInput) currentConfig.privacy.blur_text_input = blurTextInput.checked;
  if (blurProfilePictures) currentConfig.privacy.blur_profile_pictures = blurProfilePictures.checked;
  if (blurContactNames) currentConfig.privacy.blur_contact_names = blurContactNames.checked;
  if (noTransitionDelay) currentConfig.privacy.no_transition_delay = noTransitionDelay.checked;
  if (unblurOnAppHover) currentConfig.privacy.unblur_on_app_hover = unblurOnAppHover.checked;
  if (blurOnIdle) currentConfig.privacy.blur_on_idle = blurOnIdle.checked;
  if (idleSlider) currentConfig.privacy.idle_timeout_seconds = parseInt(idleSlider.value, 10) || 120;
  if (radiusSlider) currentConfig.privacy.blur_radius = parseInt(radiusSlider.value, 10) || 8;

  if (startMinEl) currentConfig.window.start_minimized = startMinEl.checked;
  if (closeTrayEl) currentConfig.window.close_to_tray = closeTrayEl.checked;
  if (showTrayEl) currentConfig.tray.show_tray = showTrayEl.checked;
  if (trayToggleEl) currentConfig.tray.left_click_toggles = trayToggleEl.checked;
  if (checkUpdatesStartEl) currentConfig.check_updates_on_start = checkUpdatesStartEl.checked;

  if (notifEnabledEl) currentConfig.notifications.enabled = notifEnabledEl.checked;
  if (notifDndEl) currentConfig.notifications.dnd = notifDndEl.checked;

  // Quiet Hours
  const quietHoursToggle = document.getElementById("quiet-hours-toggle") as HTMLInputElement;
  const quietStart = document.getElementById("quiet-hours-start") as HTMLInputElement;
  const quietEnd = document.getElementById("quiet-hours-end") as HTMLInputElement;
  if (quietHoursToggle) currentConfig.notifications.quiet_hours_enabled = quietHoursToggle.checked;
  if (quietStart) currentConfig.notifications.quiet_hours_start = quietStart.value || "22:00";
  if (quietEnd) currentConfig.notifications.quiet_hours_end = quietEnd.value || "07:00";

  // Notification Icon
  const activeIconChip = document.querySelector(".icon-mode-chip.active");
  if (activeIconChip) {
    currentConfig.notifications.icon_mode = activeIconChip.getAttribute("data-mode") || "emoji";
  }
  const customEmojiEl = document.getElementById("notif-custom-emoji") as HTMLInputElement;
  if (customEmojiEl) currentConfig.notifications.icon_emoji = customEmojiEl.value.trim() || "💬";

  const svgPresetEl = document.getElementById("notif-svg-preset") as HTMLSelectElement;
  if (svgPresetEl) currentConfig.notifications.svg_preset = svgPresetEl.value || "bubble_dots";

  const customFileEl = document.getElementById("notif-custom-file") as HTMLInputElement;
  if (customFileEl) currentConfig.notifications.custom_icon_path = customFileEl.value.trim() || null;

  // Autostart
  const autostartEl = document.getElementById("autostart-toggle") as HTMLInputElement;
  if (autostartEl) {
    currentConfig.window.autostart = autostartEl.checked;
    invoke("set_autostart", { enable: autostartEl.checked }).catch(console.error);
  }

  try {
    await invoke("save_settings", { newConfig: currentConfig });
    if (!silent) showToast("Settings saved");
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

function setupEventListeners() {
  // Tabs navigation
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");
      navItems.forEach((n) => n.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      item.classList.add("active");
      const activePane = document.getElementById("tab-" + targetTab);
      if (activePane) activePane.classList.add("active");
    });
  });

  // Theme card selector
  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const themeVal = card.getAttribute("data-theme-val") || "dark";
      if (!currentConfig) return;
      currentConfig.appearance.theme = themeVal;
      updateThemeCardUI(themeVal);
      applyTheme(themeVal);
      saveSettings();
    });
  });

  // Zoom preset pills & range
  const presetPills = document.querySelectorAll(".preset-pill");
  const zoomRange = document.getElementById("zoom-range") as HTMLInputElement;

  presetPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const zoomVal = parseFloat(pill.getAttribute("data-zoom") || "1.0");
      if (!currentConfig) return;
      currentConfig.appearance.zoom_factor = zoomVal;
      updateZoomUI(zoomVal);
      saveSettings();
    });
  });

  zoomRange?.addEventListener("input", () => {
    const zoomVal = parseFloat(zoomRange.value);
    if (!currentConfig) return;
    currentConfig.appearance.zoom_factor = zoomVal;
    updateZoomUI(zoomVal);
  });

  zoomRange?.addEventListener("change", () => {
    saveSettings();
  });

  // Stylus Custom CSS Editor
  const customCssEl = document.getElementById("custom-css") as HTMLTextAreaElement;
  customCssEl?.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = customCssEl.selectionStart;
      const end = customCssEl.selectionEnd;
      customCssEl.value = customCssEl.value.substring(0, start) + "  " + customCssEl.value.substring(end);
      customCssEl.selectionStart = customCssEl.selectionEnd = start + 2;
    }
  });

  let cssDebounce: number | undefined;
  customCssEl?.addEventListener("input", () => {
    const statusText = document.getElementById("css-status-text");
    if (statusText) statusText.textContent = "Saving changes...";
    if (cssDebounce) clearTimeout(cssDebounce);
    cssDebounce = window.setTimeout(async () => {
      await saveSettings(true);
      if (statusText) statusText.textContent = "Synced with WhatsApp Web";
    }, 500);
  });

  const snippets: Record<string, string> = {
    "snippet-bubble": `\n/* Custom Message Bubble Colors */\n.message-out { background-color: #056162 !important; border-radius: 12px 12px 2px 12px !important; }\n.message-in { background-color: #262d31 !important; border-radius: 12px 12px 12px 2px !important; }\n`,
    "snippet-font": `\n/* Modern Clean Typography */\n* {\n  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;\n}\n`,
    "snippet-sidebar": `\n/* Ultra Compact Sidebar */\n#side {\n  min-width: 260px !important;\n  max-width: 280px !important;\n}\n`,
    "snippet-hide-status": `\n/* Hide Status Stories & Communities Tabs */\nbutton[aria-label*="Status"], button[aria-label*="Communities"] {\n  display: none !important;\n}\n`
  };

  Object.entries(snippets).forEach(([id, code]) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (!customCssEl) return;
      customCssEl.value += code;
      customCssEl.scrollTop = customCssEl.scrollHeight;
      saveSettings();
    });
  });

  document.getElementById("btn-clear-css")?.addEventListener("click", () => {
    if (!customCssEl) return;
    if (confirm("Are you sure you want to clear all custom CSS?")) {
      customCssEl.value = "";
      saveSettings();
    }
  });

  document.getElementById("btn-export-css")?.addEventListener("click", () => {
    if (!customCssEl) return;
    const blob = new Blob([customCssEl.value], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whatspulse-userstyle.css";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-import-css")?.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".css,text/css";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (file && customCssEl) {
        const text = await file.text();
        customCssEl.value = text;
        saveSettings();
      }
    };
    fileInput.click();
  });

  // Custom Chat Wallpaper
  const wallpaperUrlEl = document.getElementById("wallpaper-url") as HTMLInputElement;
  const wallpaperOpacityEl = document.getElementById("wallpaper-opacity") as HTMLInputElement;
  const wallpaperOpacityVal = document.getElementById("wallpaper-opacity-val");

  wallpaperUrlEl?.addEventListener("change", () => saveSettings());
  wallpaperOpacityEl?.addEventListener("input", () => {
    const val = parseFloat(wallpaperOpacityEl.value);
    if (wallpaperOpacityVal) wallpaperOpacityVal.textContent = `${Math.round(val * 100)}%`;
  });
  wallpaperOpacityEl?.addEventListener("change", () => saveSettings());

  // Master privacy toggle
  const masterToggle = document.getElementById("privacy-master-toggle") as HTMLInputElement;
  masterToggle?.addEventListener("change", () => {
    if (!currentConfig) return;
    currentConfig.privacy.enabled = masterToggle.checked;
    updatePrivacyUI(currentConfig.privacy);
    saveSettings();
  });

  // Granular privacy checkboxes
  const privacyCheckboxIds = [
    "blur-messages",
    "blur-last-messages",
    "blur-media",
    "blur-media-gallery",
    "blur-text-input",
    "blur-profile-pictures",
    "blur-contact-names",
    "no-transition-delay",
    "unblur-on-app-hover",
    "blur-on-idle",
  ];

  privacyCheckboxIds.forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement;
    el?.addEventListener("change", () => {
      if (!currentConfig) return;
      const idleGroup = document.getElementById("idle-timeout-group");
      if (id === "blur-on-idle" && idleGroup) {
        idleGroup.style.display = el.checked ? "block" : "none";
      }
      saveSettings();
      updateLiveSimulator(currentConfig.privacy);
    });
  });

  // Idle timeout slider & display
  const idleTimeoutSlider = document.getElementById("idle-timeout-slider") as HTMLInputElement;
  const idleTimeoutDisplay = document.getElementById("idle-timeout-display");
  idleTimeoutSlider?.addEventListener("input", () => {
    const val = parseInt(idleTimeoutSlider.value, 10);
    if (idleTimeoutDisplay) idleTimeoutDisplay.textContent = formatIdleTime(val);
    if (currentConfig) currentConfig.privacy.idle_timeout_seconds = val;
  });
  idleTimeoutSlider?.addEventListener("change", () => {
    saveSettings();
  });

  // Blur radius slider & preset pills
  const blurRadiusSlider = document.getElementById("blur-radius-slider") as HTMLInputElement;
  const blurRadiusDisplay = document.getElementById("blur-radius-display");
  const radiusPills = document.querySelectorAll(".blur-radius-pill");

  const setRadiusValue = (radius: number) => {
    if (!currentConfig) return;
    currentConfig.privacy.blur_radius = radius;
    if (blurRadiusSlider) blurRadiusSlider.value = String(radius);
    if (blurRadiusDisplay) blurRadiusDisplay.textContent = `${radius}px`;
    radiusPills.forEach((p) => {
      const r = parseInt(p.getAttribute("data-radius") || "8", 10);
      if (r === radius) p.classList.add("active");
      else p.classList.remove("active");
    });
    updateLiveSimulator(currentConfig.privacy);
  };

  blurRadiusSlider?.addEventListener("input", () => {
    setRadiusValue(parseInt(blurRadiusSlider.value, 10));
  });
  blurRadiusSlider?.addEventListener("change", () => {
    saveSettings();
  });

  radiusPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const radiusVal = parseInt(pill.getAttribute("data-radius") || "8", 10);
      setRadiusValue(radiusVal);
      saveSettings();
    });
  });

  // Auto-save toggle switches
  const toggleIds = [
    "start-minimized",
    "autostart-toggle",
    "close-to-tray",
    "show-tray",
    "tray-click-toggles",
    "check-updates-on-start",
    "notif-enabled",
    "notif-dnd",
    "quiet-hours-toggle",
  ];

  toggleIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => saveSettings());
    }
  });

  const quietHoursToggle = document.getElementById("quiet-hours-toggle") as HTMLInputElement;
  const quietHoursBox = document.getElementById("quiet-hours-box");
  const quietStart = document.getElementById("quiet-hours-start") as HTMLInputElement;
  const quietEnd = document.getElementById("quiet-hours-end") as HTMLInputElement;

  quietHoursToggle?.addEventListener("change", () => {
    if (quietHoursBox) {
      quietHoursBox.style.display = quietHoursToggle.checked ? "flex" : "none";
    }
  });
  quietStart?.addEventListener("change", () => saveSettings());
  quietEnd?.addEventListener("change", () => saveSettings());

  // Notification Icon Controls
  const iconModeChips = document.querySelectorAll(".icon-mode-chip");
  iconModeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const mode = chip.getAttribute("data-mode") || "emoji";
      updateNotifIconModeUI(mode);
      updateNotifPreviewBadge();
      saveSettings();
    });
  });

  const emojiChips = document.querySelectorAll(".emoji-chip");
  emojiChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const emoji = chip.getAttribute("data-emoji") || "💬";
      const customEmojiEl = document.getElementById("notif-custom-emoji") as HTMLInputElement;
      if (customEmojiEl) customEmojiEl.value = emoji;
      updateEmojiChipsUI(emoji);
      updateNotifPreviewBadge();
      saveSettings();
    });
  });

  const customEmojiInput = document.getElementById("notif-custom-emoji") as HTMLInputElement;
  customEmojiInput?.addEventListener("input", () => {
    const val = customEmojiInput.value.trim() || "💬";
    updateEmojiChipsUI(val);
    updateNotifPreviewBadge();
  });
  customEmojiInput?.addEventListener("change", () => saveSettings());

  const svgPresetSelect = document.getElementById("notif-svg-preset") as HTMLSelectElement;
  svgPresetSelect?.addEventListener("change", () => {
    updateNotifPreviewBadge();
    saveSettings();
  });

  const customIconFileInput = document.getElementById("notif-custom-file") as HTMLInputElement;
  customIconFileInput?.addEventListener("change", () => saveSettings());

  document.getElementById("btn-browse-notif-icon")?.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".svg,.png,.ico";
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file && customIconFileInput) {
        if ((file as any).path) {
          customIconFileInput.value = (file as any).path;
        } else {
          customIconFileInput.value = file.name;
        }
        saveSettings();
      }
    };
    fileInput.click();
  });

  document.getElementById("btn-test-notif")?.addEventListener("click", async () => {
    try {
      await invoke("test_notification");
      showToast("Test notification sent!");
    } catch (e) {
      console.error("Test notification failed:", e);
      alert("Failed to send test notification: " + e);
    }
  });

  // Dedicated About Window
  document.getElementById("btn-open-about-win")?.addEventListener("click", async () => {
    try {
      await invoke("open_about");
    } catch (e) {
      console.error("Failed to open about window:", e);
    }
  });

  // Manual Check for Updates
  const btnCheckUpdates = document.getElementById("btn-check-updates-now");
  const updateStatusText = document.getElementById("settings-update-status");
  btnCheckUpdates?.addEventListener("click", async () => {
    if (btnCheckUpdates) btnCheckUpdates.textContent = "Checking...";
    if (updateStatusText) updateStatusText.textContent = "Querying GitHub Releases...";
    try {
      const res = await invoke<{ has_update: boolean; latest_version?: string; current_version: string; release_url?: string; body?: string }>("check_for_updates");
      if (res.has_update && res.latest_version) {
        if (updateStatusText) {
          updateStatusText.innerHTML = `✨ Update Available: <b>v${res.latest_version}</b> (Current: v${res.current_version})`;
          updateStatusText.style.color = "#00e699";
        }
        if (confirm(`New WhatsPulse update v${res.latest_version} is available!\n\nOpen release download page?`)) {
          window.open(res.release_url || "https://github.com/brilyyy/whatspulse/releases", "_blank");
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

  // Password visibility eye toggles
  const eyeButtons = document.querySelectorAll(".btn-toggle-eye");
  eyeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      if (!targetId) return;
      const input = document.getElementById(targetId) as HTMLInputElement;
      if (input) {
        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "🙈";
        } else {
          input.type = "password";
          btn.textContent = "👁️";
        }
      }
    });
  });

  // Direct Chat Modal Logic
  const modalDirectChat = document.getElementById("modal-direct-chat");
  const btnOpenDirectSidebar = document.getElementById("btn-open-direct-chat-sidebar");
  const btnCancelDirect = document.getElementById("btn-cancel-direct-chat");
  const btnSubmitDirect = document.getElementById("btn-submit-direct-chat");
  const directPhoneInput = document.getElementById("direct-chat-phone") as HTMLInputElement;
  const directMsgInput = document.getElementById("direct-chat-msg") as HTMLTextAreaElement;
  const directErr = document.getElementById("direct-chat-error");

  function openDirectChatModal() {
    if (directErr) {
      directErr.textContent = "";
      directErr.style.display = "none";
    }
    if (directPhoneInput) directPhoneInput.value = "";
    if (directMsgInput) directMsgInput.value = "";
    modalDirectChat?.classList.add("active");
    setTimeout(() => directPhoneInput?.focus(), 100);
  }

  function closeDirectChatModal() {
    modalDirectChat?.classList.remove("active");
  }

  async function submitDirectChat() {
    const phone = directPhoneInput?.value?.trim() || "";
    const message = directMsgInput?.value?.trim() || "";

    if (!phone) {
      if (directErr) {
        directErr.textContent = "Silakan masukkan nomor telepon WhatsApp.";
        directErr.style.display = "block";
      }
      directPhoneInput?.focus();
      return;
    }

    try {
      await invoke("direct_chat", { phone, message: message || null });
      closeDirectChatModal();
      showToast("Membuka obrolan WhatsApp...");
    } catch (err: any) {
      if (directErr) {
        directErr.textContent = String(err);
        directErr.style.display = "block";
      }
    }
  }

  btnOpenDirectSidebar?.addEventListener("click", openDirectChatModal);
  btnCancelDirect?.addEventListener("click", closeDirectChatModal);
  btnSubmitDirect?.addEventListener("click", submitDirectChat);
  directPhoneInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitDirectChat();
  });

  // Boss Key / Emergency Panic
  const btnTriggerPanic = document.getElementById("btn-trigger-panic");
  async function triggerPanic() {
    try {
      await invoke("trigger_panic_mode");
    } catch (e) {
      console.error("Failed to trigger panic mode:", e);
    }
  }
  btnTriggerPanic?.addEventListener("click", triggerPanic);

  window.addEventListener("keydown", (e) => {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "X" || e.key === "x"))) {
      e.preventDefault();
      triggerPanic();
    }
  });

  // Global window functions for Tauri eval
  window.__whatspulseOnShow = (tab = "general") => {
    const targetItem = document.querySelector(`.nav-item[data-tab="${tab}"]`) as HTMLElement;
    if (targetItem) targetItem.click();
  };

  window.__whatspulseOpenDirectChat = openDirectChatModal;
}

window.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadSettings();
});
