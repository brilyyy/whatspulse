import { reportScriptError } from "../ipc";

function osTheme(): "dark" | "light" {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

interface DebugModuleRecord {
  exports?: Record<string, unknown>;
  publicModule?: { exports?: Record<string, unknown> };
  defaultExport?: Record<string, unknown>;
}

declare const require: ((id: string) => { modulesMap: Record<string, DebugModuleRecord> }) | undefined;

function loadedModule(name: string): Record<string, unknown> | null {
  try {
    if (typeof require !== "function") {
      return null;
    }
    const rec = require("__debug").modulesMap[name];
    if (!rec) {
      return null;
    }
    return rec.exports || rec.publicModule?.exports || rec.defaultExport || null;
  } catch {
    return null;
  }
}

export function applyTheme(mode: string): void {
  const system = mode === "system";
  const isCustomDark =
    mode === "amoled" ||
    mode === "catppuccin" ||
    mode === "nord" ||
    mode === "dracula" ||
    mode === "tokyonight" ||
    mode === "gruvbox" ||
    mode === "cyberpunk";
  const theme = system ? osTheme() : isCustomDark || mode === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  // Apply custom palette overrides if active
  try {
    let style = document.getElementById("whatspulse-custom-palette");
    if (isCustomDark) {
      if (!style) {
        style = document.createElement("style");
        style.id = "whatspulse-custom-palette";
        document.head.appendChild(style);
      }
      if (mode === "amoled") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #000000 !important; " +
          "--panel-header-background: #000000 !important; " +
          "--conversation-panel-background: #000000 !important; " +
          "--incoming-background: #111111 !important; " +
          "--outgoing-background: #005c4b !important; " +
          "--dropdown-background: #0d0d0d !important; " +
          "--modal-background: #080808 !important; " +
          "--compose-box-background: #0a0a0a !important; " +
          "--border-strong: #1a1a1a !important; " +
          "--border-subtle: #121212 !important; " +
          "--border-list: #121212 !important; " +
          "--background-default: #000000 !important; " +
          "--background-default-hover: #0f0f0f !important; " +
          "--background-default-active: #1a1a1a !important; }";
      } else if (mode === "catppuccin") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #181825 !important; " +
          "--panel-header-background: #11111b !important; " +
          "--conversation-panel-background: #1e1e2e !important; " +
          "--incoming-background: #313244 !important; " +
          "--outgoing-background: #36504a !important; " +
          "--dropdown-background: #1e1e2e !important; " +
          "--modal-background: #181825 !important; " +
          "--compose-box-background: #181825 !important; " +
          "--border-strong: #45475a !important; " +
          "--border-subtle: #313244 !important; " +
          "--border-list: #313244 !important; " +
          "--background-default: #181825 !important; " +
          "--background-default-hover: #313244 !important; " +
          "--background-default-active: #45475a !important; }";
      } else if (mode === "nord") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #242933 !important; " +
          "--panel-header-background: #1e222a !important; " +
          "--conversation-panel-background: #2e3440 !important; " +
          "--incoming-background: #3b4252 !important; " +
          "--outgoing-background: #3b5066 !important; " +
          "--dropdown-background: #2e3440 !important; " +
          "--modal-background: #242933 !important; " +
          "--compose-box-background: #242933 !important; " +
          "--border-strong: #4c566a !important; " +
          "--border-subtle: #3b4252 !important; " +
          "--border-list: #3b4252 !important; " +
          "--background-default: #242933 !important; " +
          "--background-default-hover: #3b4252 !important; " +
          "--background-default-active: #434c5e !important; }";
      } else if (mode === "dracula") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #282a36 !important; " +
          "--panel-header-background: #21222c !important; " +
          "--conversation-panel-background: #282a36 !important; " +
          "--incoming-background: #44475a !important; " +
          "--outgoing-background: #4d3d70 !important; " +
          "--dropdown-background: #21222c !important; " +
          "--modal-background: #282a36 !important; " +
          "--compose-box-background: #21222c !important; " +
          "--border-strong: #6272a4 !important; " +
          "--border-subtle: #44475a !important; " +
          "--border-list: #44475a !important; " +
          "--background-default: #282a36 !important; " +
          "--background-default-hover: #44475a !important; " +
          "--background-default-active: #6272a4 !important; " +
          "--primary-strong: #bd93f9 !important; }";
      } else if (mode === "tokyonight") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #1a1b26 !important; " +
          "--panel-header-background: #16161e !important; " +
          "--conversation-panel-background: #1a1b26 !important; " +
          "--incoming-background: #24283b !important; " +
          "--outgoing-background: #283457 !important; " +
          "--dropdown-background: #16161e !important; " +
          "--modal-background: #1a1b26 !important; " +
          "--compose-box-background: #16161e !important; " +
          "--border-strong: #3b4261 !important; " +
          "--border-subtle: #24283b !important; " +
          "--border-list: #24283b !important; " +
          "--background-default: #1a1b26 !important; " +
          "--background-default-hover: #24283b !important; " +
          "--background-default-active: #3b4261 !important; " +
          "--primary-strong: #7aa2f7 !important; }";
      } else if (mode === "gruvbox") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #282828 !important; " +
          "--panel-header-background: #1d2021 !important; " +
          "--conversation-panel-background: #282828 !important; " +
          "--incoming-background: #3c3836 !important; " +
          "--outgoing-background: #3c483a !important; " +
          "--dropdown-background: #1d2021 !important; " +
          "--modal-background: #282828 !important; " +
          "--compose-box-background: #1d2021 !important; " +
          "--border-strong: #504945 !important; " +
          "--border-subtle: #3c3836 !important; " +
          "--border-list: #3c3836 !important; " +
          "--background-default: #282828 !important; " +
          "--background-default-hover: #3c3836 !important; " +
          "--background-default-active: #504945 !important; " +
          "--primary-strong: #fe8019 !important; }";
      } else if (mode === "cyberpunk") {
        style.textContent =
          'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { ' +
          "--app-background: #0d0b18 !important; " +
          "--panel-header-background: #080610 !important; " +
          "--conversation-panel-background: #0d0b18 !important; " +
          "--incoming-background: #1d1830 !important; " +
          "--outgoing-background: #004d40 !important; " +
          "--dropdown-background: #080610 !important; " +
          "--modal-background: #0d0b18 !important; " +
          "--compose-box-background: #080610 !important; " +
          "--border-strong: #00f0ff !important; " +
          "--border-subtle: #2b2347 !important; " +
          "--border-list: #2b2347 !important; " +
          "--background-default: #0d0b18 !important; " +
          "--background-default-hover: #1d1830 !important; " +
          "--background-default-active: #2b2347 !important; " +
          "--primary-strong: #fee801 !important; }";
      }
    } else if (style) {
      style.remove();
    }
  } catch {
    /* ignore */
  }

  // 1. WhatsApp's own preference + theme modules
  try {
    const up = loadedModule("WAWebUserPrefsGeneral") as {
      setSystemThemeMode?: (s: boolean) => void;
      setTheme?: (t: string) => void;
    } | null;
    if (up) {
      if (typeof up.setSystemThemeMode === "function") {
        up.setSystemThemeMode(system);
      }
      if (typeof up.setTheme === "function") {
        up.setTheme(theme);
      }
    }
    const tc = loadedModule("WAWebThemeContext") as {
      applyThemeToUI?: (t: string) => void;
    } | null;
    if (tc && typeof tc.applyThemeToUI === "function") {
      tc.applyThemeToUI(theme);
    }
    const st = loadedModule("WAWebSystemTheme") as { theme?: string } | null;
    if (st) {
      st.theme = theme;
    }
  } catch {
    /* module internals changed */
  }

  // 2. React store: walk the fiber ancestors
  try {
    interface ReactFiberNode {
      stateNode?: {
        state?: { theme?: unknown; systemThemeMode?: unknown };
        setState?: (s: { theme: string; systemThemeMode: boolean }) => void;
        forceUpdate?: () => void;
      };
      return?: ReactFiberNode;
    }

    const wrapper = document.querySelector(".app-wrapper-web") as
      | (Element & Record<string, unknown>)
      | null;
    const key =
      wrapper &&
      Object.keys(wrapper).find(
        (k) => k.indexOf("__reactFiber") === 0 || k.indexOf("__reactInternalInstance") === 0
      );
    if (key && wrapper) {
      let fiber = wrapper[key] as ReactFiberNode | undefined;
      let found = false;
      while (fiber) {
        const sn = fiber.stateNode;
        if (
          sn?.state?.theme !== undefined &&
          sn?.state?.systemThemeMode !== undefined &&
          typeof sn.setState === "function"
        ) {
          sn.setState({ theme, systemThemeMode: system });
          found = true;
          break;
        }
        fiber = fiber.return;
      }
      if (!found) {
        fiber = wrapper[key] as ReactFiberNode | undefined;
        let count = 0;
        while (fiber && count < 10) {
          if (fiber.stateNode && typeof fiber.stateNode.forceUpdate === "function") {
            try {
              fiber.stateNode.forceUpdate();
            } catch {
              /* ignore */
            }
            count++;
          }
          fiber = fiber.return;
        }
      }
    }
  } catch {
    /* React internals changed */
  }

  // 3. DOM attributes + localStorage
  try {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-color-mode", theme);
    root.style.colorScheme = theme;
    if (document.body) {
      document.body.classList.toggle("dark", isDark);
    }
    localStorage.setItem("theme", theme);
    if (system) {
      localStorage.setItem("system-theme-mode", "true");
    } else {
      localStorage.removeItem("system-theme-mode");
    }
    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "theme",
          newValue: theme,
          storageArea: localStorage,
          url: location.href,
        })
      );
    } catch {
      /* StorageEvent ctor unsupported */
    }
  } catch (e) {
    reportScriptError("theme-control", e);
  }
}

export function applyCustomCss(css?: string): void {
  try {
    let style = document.getElementById("whatspulse-usercss");
    if (!style) {
      style = document.createElement("style");
      style.id = "whatspulse-usercss";
      document.head.appendChild(style);
    }
    style.textContent = css || "";
  } catch (e) {
    reportScriptError("theme-control", e);
  }
}

export function applyWallpaper(url?: string, opacity?: number): void {
  try {
    let style = document.getElementById("whatspulse-wallpaper");
    if (!style) {
      style = document.createElement("style");
      style.id = "whatspulse-wallpaper";
      document.head.appendChild(style);
    }
    if (url && url.trim().length > 0) {
      const safeUrl = url.replace(/["'\\]/g, "");
      const op = typeof opacity === "number" ? opacity : 0.15;
      style.textContent =
        '[data-testid="conversation-panel-wrapper"]::before, ' +
        "#main > div:nth-child(2)::before { " +
        'content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
        'background-image: url("' +
        safeUrl +
        '"); background-size: cover; background-position: center; ' +
        "opacity: " +
        op +
        "; pointer-events: none; z-index: 1; } " +
        '[data-testid="conversation-panel-wrapper"], #main { position: relative; }';
    } else {
      style.textContent = "";
    }
  } catch (e) {
    reportScriptError("theme-control", e);
  }
}

export function initThemeControl(): void {
  window.__whatspulseSetTheme = applyTheme;
  window.__whatspulseSetCustomCss = applyCustomCss;
  window.__whatspulseSetWallpaper = applyWallpaper;

  const initial = window.__whatspulseConfig?.colorScheme || "system";
  let tries = 0;

  function seed() {
    applyTheme(initial);
    if (window.__whatspulseConfig?.customCss) {
      applyCustomCss(window.__whatspulseConfig.customCss);
    }
    if (window.__whatspulseConfig?.customWallpaperUrl) {
      applyWallpaper(
        window.__whatspulseConfig.customWallpaperUrl,
        window.__whatspulseConfig.customWallpaperOpacity
      );
    }
    tries++;
    if (tries < 20 && typeof require !== "function") {
      setTimeout(seed, 250);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", seed);
  } else {
    seed();
  }
}
