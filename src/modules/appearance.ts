import type { AppConfig } from "../types/config";

export function applyTheme(theme: string): void {
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

export function updateThemeCardUI(theme: string): void {
  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    if (card.getAttribute("data-theme-val") === theme) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });
}

export function updateZoomUI(factor: number): void {
  const zoomIndicator = document.getElementById("zoom-indicator");
  const zoomRange = document.getElementById("zoom-range") as HTMLInputElement | null;
  const zoomSelect = document.getElementById("zoom-select") as HTMLSelectElement | null;
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

export function initAppearance(
  config: AppConfig,
  saveConfig: (silent?: boolean) => Promise<void>
): void {
  // Initial populate
  updateThemeCardUI(config.appearance.theme);
  applyTheme(config.appearance.theme);
  updateZoomUI(config.appearance.zoom_factor);

  const customCssEl = document.getElementById("custom-css") as HTMLTextAreaElement | null;
  if (customCssEl) customCssEl.value = config.appearance.custom_css || "";

  const wallpaperUrlEl = document.getElementById("wallpaper-url") as HTMLInputElement | null;
  if (wallpaperUrlEl) wallpaperUrlEl.value = config.appearance.custom_wallpaper_url || "";

  const wallpaperOpacityEl = document.getElementById("wallpaper-opacity") as HTMLInputElement | null;
  const wallpaperOpacityVal = document.getElementById("wallpaper-opacity-val");
  const opacity = config.appearance.custom_wallpaper_opacity ?? 0.15;
  if (wallpaperOpacityEl) wallpaperOpacityEl.value = String(opacity);
  if (wallpaperOpacityVal) wallpaperOpacityVal.textContent = `${Math.round(opacity * 100)}%`;

  // Theme card selector
  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const themeVal = card.getAttribute("data-theme-val") || "dark";
      config.appearance.theme = themeVal;
      updateThemeCardUI(themeVal);
      applyTheme(themeVal);
      saveConfig();
    });
  });

  // Zoom preset pills & range
  const presetPills = document.querySelectorAll(".preset-pill");
  const zoomRange = document.getElementById("zoom-range") as HTMLInputElement | null;

  presetPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const zoomVal = parseFloat(pill.getAttribute("data-zoom") || "1.0");
      config.appearance.zoom_factor = zoomVal;
      updateZoomUI(zoomVal);
      saveConfig();
    });
  });

  zoomRange?.addEventListener("input", () => {
    const zoomVal = parseFloat(zoomRange.value);
    config.appearance.zoom_factor = zoomVal;
    updateZoomUI(zoomVal);
  });

  zoomRange?.addEventListener("change", () => {
    saveConfig();
  });

  // Custom CSS Editor
  customCssEl?.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = customCssEl.selectionStart;
      const end = customCssEl.selectionEnd;
      customCssEl.value =
        customCssEl.value.substring(0, start) + "  " + customCssEl.value.substring(end);
      customCssEl.selectionStart = customCssEl.selectionEnd = start + 2;
    }
  });

  let cssDebounce: number | undefined;
  customCssEl?.addEventListener("input", () => {
    const statusText = document.getElementById("css-status-text");
    if (statusText) statusText.textContent = "Saving changes...";
    config.appearance.custom_css = customCssEl.value;
    if (cssDebounce) clearTimeout(cssDebounce);
    cssDebounce = window.setTimeout(async () => {
      await saveConfig(true);
      if (statusText) statusText.textContent = "Synced with WhatsApp Web";
    }, 500);
  });

  const snippets: Record<string, string> = {
    "snippet-bubble": `\n/* Custom Message Bubble Colors */\n.message-out { background-color: #056162 !important; border-radius: 12px 12px 2px 12px !important; }\n.message-in { background-color: #262d31 !important; border-radius: 12px 12px 12px 2px !important; }\n`,
    "snippet-font": `\n/* Modern Clean Typography */\n* {\n  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;\n}\n`,
    "snippet-sidebar": `\n/* Ultra Compact Sidebar */\n#side {\n  min-width: 260px !important;\n  max-width: 280px !important;\n}\n`,
    "snippet-hide-status": `\n/* Hide Status Stories & Communities Tabs */\nbutton[aria-label*="Status"], button[aria-label*="Communities"] {\n  display: none !important;\n}\n`,
  };

  Object.entries(snippets).forEach(([id, code]) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (!customCssEl) return;
      customCssEl.value += code;
      customCssEl.scrollTop = customCssEl.scrollHeight;
      config.appearance.custom_css = customCssEl.value;
      saveConfig();
    });
  });

  document.getElementById("btn-clear-css")?.addEventListener("click", () => {
    if (!customCssEl) return;
    if (confirm("Are you sure you want to clear all custom CSS?")) {
      customCssEl.value = "";
      config.appearance.custom_css = "";
      saveConfig();
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
        config.appearance.custom_css = text;
        saveConfig();
      }
    };
    fileInput.click();
  });

  // Custom Chat Wallpaper
  wallpaperUrlEl?.addEventListener("change", () => {
    config.appearance.custom_wallpaper_url = wallpaperUrlEl.value.trim();
    saveConfig();
  });

  wallpaperOpacityEl?.addEventListener("input", () => {
    const val = parseFloat(wallpaperOpacityEl.value);
    if (wallpaperOpacityVal) wallpaperOpacityVal.textContent = `${Math.round(val * 100)}%`;
    config.appearance.custom_wallpaper_opacity = val;
  });

  wallpaperOpacityEl?.addEventListener("change", () => {
    saveConfig();
  });
}
