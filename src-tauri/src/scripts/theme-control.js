// name:     theme-control
// purpose:  make WhatsApp follow the app's theme setting (FEATURES A1). Drives
//           WhatsApp's own theme state — its WAWeb modules, the React store, and
//           the DOM/localStorage it persists to — rather than QStyleHints, which
//           the portal/KDE platform theme overrides before it reaches Blink
//           (verified 2026-08-27 via CDP). Sequence proven against live
//           WhatsApp Web.
// depends:  window.__whatspulse.config.colorScheme; already-loaded WhatsApp theme
//           modules (read from the registry, never require()d), .app-wrapper-web
//           React fiber, and `dark` body class (all optional — each step is
//           guarded and degrades to a no-op).
// verified: 2026-09-04 against WhatsApp Web 2.3000.x
// on-fail:  no-op; falls back to WhatsApp's own OS-following behaviour
// live-api: window.__whatspulseSetTheme('system'|'light'|'dark'); called from
//           WebView::applyThemeLive() on theme change and every page load.
(function () {
    'use strict';
    var api = window.__whatspulse || {};

    function osTheme() {
        try {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch (e) {
            return 'light';
        }
    }

    // A WhatsApp module's exports, but only if WhatsApp has already loaded it.
    // Reading the registry never triggers evaluation — unlike require(), which
    // force-resolves the module's whole dependency subtree.
    function loadedModule(name) {
        try {
            if (typeof require !== 'function') { return null; }
            var rec = require('__debug').modulesMap[name];
            if (!rec) { return null; }
            return rec.exports || (rec.publicModule && rec.publicModule.exports) || rec.defaultExport || null;
        } catch (e) {
            return null;
        }
    }

    function applyTheme(mode) {
        var system = mode === 'system';
        var isCustomDark = mode === 'amoled' || mode === 'catppuccin' || mode === 'nord'
            || mode === 'dracula' || mode === 'tokyonight' || mode === 'gruvbox' || mode === 'cyberpunk';
        var theme = system ? osTheme() : (isCustomDark || mode === 'dark' ? 'dark' : 'light');
        var isDark = theme === 'dark';

        // Apply custom palette overrides if active
        try {
            var style = document.getElementById('whatspulse-custom-palette');
            if (isCustomDark) {
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'whatspulse-custom-palette';
                    document.head.appendChild(style);
                }
                if (mode === 'amoled') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #000000 !important; '
                        + '--panel-header-background: #000000 !important; '
                        + '--conversation-panel-background: #000000 !important; '
                        + '--incoming-background: #111111 !important; '
                        + '--outgoing-background: #005c4b !important; '
                        + '--dropdown-background: #0d0d0d !important; '
                        + '--modal-background: #080808 !important; '
                        + '--compose-box-background: #0a0a0a !important; '
                        + '--border-strong: #1a1a1a !important; '
                        + '--border-subtle: #121212 !important; '
                        + '--border-list: #121212 !important; '
                        + '--background-default: #000000 !important; '
                        + '--background-default-hover: #0f0f0f !important; '
                        + '--background-default-active: #1a1a1a !important; }';
                } else if (mode === 'catppuccin') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #181825 !important; '
                        + '--panel-header-background: #11111b !important; '
                        + '--conversation-panel-background: #1e1e2e !important; '
                        + '--incoming-background: #313244 !important; '
                        + '--outgoing-background: #36504a !important; '
                        + '--dropdown-background: #1e1e2e !important; '
                        + '--modal-background: #181825 !important; '
                        + '--compose-box-background: #181825 !important; '
                        + '--border-strong: #45475a !important; '
                        + '--border-subtle: #313244 !important; '
                        + '--border-list: #313244 !important; '
                        + '--background-default: #181825 !important; '
                        + '--background-default-hover: #313244 !important; '
                        + '--background-default-active: #45475a !important; }';
                } else if (mode === 'nord') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #242933 !important; '
                        + '--panel-header-background: #1e222a !important; '
                        + '--conversation-panel-background: #2e3440 !important; '
                        + '--incoming-background: #3b4252 !important; '
                        + '--outgoing-background: #3b5066 !important; '
                        + '--dropdown-background: #2e3440 !important; '
                        + '--modal-background: #242933 !important; '
                        + '--compose-box-background: #242933 !important; '
                        + '--border-strong: #4c566a !important; '
                        + '--border-subtle: #3b4252 !important; '
                        + '--border-list: #3b4252 !important; '
                        + '--background-default: #242933 !important; '
                        + '--background-default-hover: #3b4252 !important; '
                        + '--background-default-active: #434c5e !important; }';
                } else if (mode === 'dracula') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #282a36 !important; '
                        + '--panel-header-background: #21222c !important; '
                        + '--conversation-panel-background: #282a36 !important; '
                        + '--incoming-background: #44475a !important; '
                        + '--outgoing-background: #4d3d70 !important; '
                        + '--dropdown-background: #21222c !important; '
                        + '--modal-background: #282a36 !important; '
                        + '--compose-box-background: #21222c !important; '
                        + '--border-strong: #6272a4 !important; '
                        + '--border-subtle: #44475a !important; '
                        + '--border-list: #44475a !important; '
                        + '--background-default: #282a36 !important; '
                        + '--background-default-hover: #44475a !important; '
                        + '--background-default-active: #6272a4 !important; '
                        + '--primary-strong: #bd93f9 !important; }';
                } else if (mode === 'tokyonight') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #1a1b26 !important; '
                        + '--panel-header-background: #16161e !important; '
                        + '--conversation-panel-background: #1a1b26 !important; '
                        + '--incoming-background: #24283b !important; '
                        + '--outgoing-background: #283457 !important; '
                        + '--dropdown-background: #16161e !important; '
                        + '--modal-background: #1a1b26 !important; '
                        + '--compose-box-background: #16161e !important; '
                        + '--border-strong: #3b4261 !important; '
                        + '--border-subtle: #24283b !important; '
                        + '--border-list: #24283b !important; '
                        + '--background-default: #1a1b26 !important; '
                        + '--background-default-hover: #24283b !important; '
                        + '--background-default-active: #3b4261 !important; '
                        + '--primary-strong: #7aa2f7 !important; }';
                } else if (mode === 'gruvbox') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #282828 !important; '
                        + '--panel-header-background: #1d2021 !important; '
                        + '--conversation-panel-background: #282828 !important; '
                        + '--incoming-background: #3c3836 !important; '
                        + '--outgoing-background: #3c483a !important; '
                        + '--dropdown-background: #1d2021 !important; '
                        + '--modal-background: #282828 !important; '
                        + '--compose-box-background: #1d2021 !important; '
                        + '--border-strong: #504945 !important; '
                        + '--border-subtle: #3c3836 !important; '
                        + '--border-list: #3c3836 !important; '
                        + '--background-default: #282828 !important; '
                        + '--background-default-hover: #3c3836 !important; '
                        + '--background-default-active: #504945 !important; '
                        + '--primary-strong: #fe8019 !important; }';
                } else if (mode === 'cyberpunk') {
                    style.textContent = 'html[data-color-mode="dark"], body.dark, [data-theme="dark"] { '
                        + '--app-background: #0d0b18 !important; '
                        + '--panel-header-background: #080610 !important; '
                        + '--conversation-panel-background: #0d0b18 !important; '
                        + '--incoming-background: #1d1830 !important; '
                        + '--outgoing-background: #004d40 !important; '
                        + '--dropdown-background: #080610 !important; '
                        + '--modal-background: #0d0b18 !important; '
                        + '--compose-box-background: #080610 !important; '
                        + '--border-strong: #00f0ff !important; '
                        + '--border-subtle: #2b2347 !important; '
                        + '--border-list: #2b2347 !important; '
                        + '--background-default: #0d0b18 !important; '
                        + '--background-default-hover: #1d1830 !important; '
                        + '--background-default-active: #2b2347 !important; '
                        + '--primary-strong: #fee801 !important; }';
                }
            } else if (style) {
                style.remove();
            }
        } catch (e) {}

        // 1. WhatsApp's own preference + theme modules — but only if WhatsApp has
        //    already loaded them. Never require() a WAWeb module here: forcing
        //    WAWebUserPrefsGeneral (and the storage subtree it depends on) to
        //    resolve before WhatsApp is ready corrupts the module system and blocks
        //    login. Until then, steps 2 and 3 below carry the theme; once WhatsApp
        //    loads these modules, C++ re-applies on loadFinished and this runs.
        try {
            var up = loadedModule('WAWebUserPrefsGeneral');
            if (up) {
                if (typeof up.setSystemThemeMode === 'function') { up.setSystemThemeMode(system); }
                if (typeof up.setTheme === 'function') { up.setTheme(theme); }
            }
            var tc = loadedModule('WAWebThemeContext');
            if (tc && typeof tc.applyThemeToUI === 'function') { tc.applyThemeToUI(theme); }
            var st = loadedModule('WAWebSystemTheme');
            if (st) { st.theme = theme; }
        } catch (e) { /* module internals changed */ }

        // 2. React store: walk the fiber ancestors for the component holding
        //    { theme, systemThemeMode } and setState; else forceUpdate upward.
        try {
            var wrapper = document.querySelector('.app-wrapper-web');
            var key = wrapper && Object.keys(wrapper).find(function (k) {
                return k.indexOf('__reactFiber') === 0 || k.indexOf('__reactInternalInstance') === 0;
            });
            if (key) {
                var fiber = wrapper[key];
                var found = false;
                while (fiber) {
                    var sn = fiber.stateNode;
                    if (sn && sn.state && sn.state.theme !== undefined &&
                        sn.state.systemThemeMode !== undefined && typeof sn.setState === 'function') {
                        sn.setState({ theme: theme, systemThemeMode: system });
                        found = true;
                        break;
                    }
                    fiber = fiber.return;
                }
                if (!found) {
                    fiber = wrapper[key];
                    var count = 0;
                    while (fiber && count < 10) {
                        if (fiber.stateNode && typeof fiber.stateNode.forceUpdate === 'function') {
                            try { fiber.stateNode.forceUpdate(); } catch (e) { /* ignore */ }
                            count++;
                        }
                        fiber = fiber.return;
                    }
                }
            }
        } catch (e) { /* React internals changed */ }

        // 3. DOM attributes + localStorage — persists across reloads, covers any
        //    CSS-only observers and WhatsApp's own startup read.
        try {
            var root = document.documentElement;
            root.setAttribute('data-theme', theme);
            root.setAttribute('data-color-mode', theme);
            root.style.colorScheme = theme;
            if (document.body) { document.body.classList.toggle('dark', isDark); }
            localStorage.setItem('theme', theme);
            if (system) {
                localStorage.setItem('system-theme-mode', 'true');
            } else {
                localStorage.removeItem('system-theme-mode');
            }
            try {
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'theme', newValue: theme, storageArea: localStorage, url: location.href
                }));
            } catch (e) { /* StorageEvent ctor unsupported */ }
        } catch (e) {
            api.report && api.report('theme-control', e);
        }
    }

    window.__whatspulseSetTheme = function (mode) { applyTheme(mode); };

    function applyCustomCss(css) {
        try {
            var style = document.getElementById('whatspulse-usercss');
            if (!style) {
                style = document.createElement('style');
                style.id = 'whatspulse-usercss';
                document.head.appendChild(style);
            }
            style.textContent = css || '';
        } catch (e) {
            api.report && api.report('theme-control', e);
        }
    }
    window.__whatspulseSetCustomCss = applyCustomCss;

    function applyWallpaper(url, opacity) {
        try {
            var style = document.getElementById('whatspulse-wallpaper');
            if (!style) {
                style = document.createElement('style');
                style.id = 'whatspulse-wallpaper';
                document.head.appendChild(style);
            }
            if (url && url.trim().length > 0) {
                var safeUrl = url.replace(/["'\\]/g, '');
                var op = typeof opacity === 'number' ? opacity : 0.15;
                style.textContent = '[data-testid="conversation-panel-wrapper"]::before, '
                    + '#main > div:nth-child(2)::before { '
                    + 'content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; '
                    + 'background-image: url("' + safeUrl + '"); background-size: cover; background-position: center; '
                    + 'opacity: ' + op + '; pointer-events: none; z-index: 1; } '
                    + '[data-testid="conversation-panel-wrapper"], #main { position: relative; }';
            } else {
                style.textContent = '';
            }
        } catch (e) {
            api.report && api.report('theme-control', e);
        }
    }
    window.__whatspulseSetWallpaper = applyWallpaper;

    // First paint: apply the configured theme, retrying briefly until WhatsApp's
    // modules are up (C++ also re-applies on every loadFinished).
    var initial = (api.config && api.config.colorScheme) || 'system';
    var tries = 0;
    function seed() {
        applyTheme(initial);
        if (api.config && api.config.customCss) {
            applyCustomCss(api.config.customCss);
        }
        if (api.config && api.config.customWallpaperUrl) {
            applyWallpaper(api.config.customWallpaperUrl, api.config.customWallpaperOpacity);
        }
        tries++;
        if (tries < 20 && typeof require !== 'function') {
            setTimeout(seed, 250);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', seed);
    } else {
        seed();
    }
})();
