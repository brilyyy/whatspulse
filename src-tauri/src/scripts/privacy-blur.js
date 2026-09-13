// name:     privacy-blur
// purpose:  Comprehensive Privacy Blur Extension for WhatsApp Web.
//           Blurs messages, previews, media, gallery thumbnails, text input,
//           contact/group names, and avatars with granular controls,
//           customizable blur radii via CSS variables, idle protection veil,
//           and instant/hover unblur modes.
// reference: https://github.com/aryomuzakki/privacy-whatsapp-web-auto-blur
// verified: 2026-09-13 against WhatsApp Web 2.3000.x

(function () {
    'use strict';
    var STYLE_ID = 'whatspulse-privacy-blur';
    var OVERLAY_ID = 'whatspulse-idle-overlay';
    var currentConfig = null;
    var idleTimer = null;
    var isIdleActive = false;

    function getRadii(cfg) {
        var base = (cfg && typeof cfg.blur_radius === 'number' && cfg.blur_radius > 0)
            ? cfg.blur_radius
            : 8;

        return {
            ms: base + 'px',
            msp: base + 'px',
            mdp: Math.max(Math.round(base * 2.2), 16) + 'px',
            mdg: Math.max(Math.round(base * 2.2), 16) + 'px',
            nm: Math.max(Math.round(base * 0.65), 4) + 'px',
            pp: base + 'px',
            ppLg: Math.max(Math.round(base * 1.5), 12) + 'px',
            ppSm: Math.max(Math.round(base * 0.4), 3) + 'px',
            wi: Math.max(Math.round(base * 1.6), 14) + 'px'
        };
    }

    function buildCss(cfg) {
        if (!cfg || cfg.enabled === false) {
            return '';
        }

        var r = getRadii(cfg);
        var noDelay = cfg.no_transition_delay === true;
        var hoverDelay = noDelay ? '0.04s !important' : '0.1s';
        var hoverDuration = noDelay ? '0.04s !important' : '0.15s';

        var css = [];

        // CSS Variables injected into root / body
        css.push(
            ':root, body {',
            '  --ms-blur: ' + r.ms + ';',
            '  --msp-blur: ' + r.msp + ';',
            '  --mdp-blur: ' + r.mdp + ';',
            '  --mdg-blur: ' + r.mdg + ';',
            '  --nm-blur: ' + r.nm + ';',
            '  --pp-blur: ' + r.pp + ';',
            '  --pp-lg-blur: ' + r.ppLg + ';',
            '  --pp-sm-blur: ' + r.ppSm + ';',
            '  --wi-blur: ' + r.wi + ';',
            '}'
        );

        // Common hover transition timing
        var hoverTrans = 'transition-delay: ' + hoverDelay + '; transition-duration: ' + hoverDuration + ';';

        // 1. All messages in chat
        if (cfg.blur_messages !== false) {
            css.push(
                '/* Messages blur */',
                'div[data-testid="msg-container"], ._2AOIt div:first-child, ._3cupO, ._1BOF7 ._1sykI {',
                '  filter: blur(var(--ms-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                '/* Normal message padding fix to prevent cutoffs */',
                'div[data-testid="msg-container"] > span:first-child ~ div:nth-child(2),',
                'div[data-testid="msg-container"] > div:first-child {',
                '  padding-right: 36px !important;',
                '}',
                '/* Pseudo background on stickers when blurred */',
                'div[data-testid="msg-container"] span._ajxd._ajxk ._ajxj._ajxd {',
                '  background-color: var(--incoming-background, rgba(0,0,0,0.1)) !important;',
                '  border-radius: 7.5px !important;',
                '  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13) !important;',
                '}',
                'div[data-testid="msg-container"]:has(span._ajxd._ajxk ._ajxj._ajxd):hover span._ajxd._ajxk ._ajxj._ajxd {',
                '  background-color: transparent !important;',
                '  border-radius: 0 !important;',
                '  box-shadow: none !important;',
                '}',
                '/* Messages hover unblur */',
                'div[data-testid="msg-container"]:hover, ._2AOIt:hover div:first-child, ._3cupO:hover, ._1BOF7 ._1sykI:hover {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}'
            );
        }

        // 2. Last messages preview in chat list
        if (cfg.blur_last_messages !== false) {
            css.push(
                '/* Messages preview in chat list */',
                'div.xjbqb8w.x1iyjqo2.x1f6kntn.x1fc57z9.x6ikm8r.x10wlt62.x1yc453h.xlyipyv.xuxw1ft.xo1l8bm,',
                'div[data-testid="cell-frame-secondary-title"],',
                '.vQ0w7,',
                '#pane-side [role="listitem"] [role="gridcell"] span[title] ~ span {',
                '  filter: blur(var(--msp-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                'div.xjbqb8w.x1iyjqo2.x1f6kntn.x1fc57z9.x6ikm8r.x10wlt62.x1yc453h.xlyipyv.xuxw1ft.xo1l8bm:hover,',
                'div[data-testid="cell-frame-secondary-title"]:hover,',
                '.vQ0w7:hover,',
                '#pane-side [role="listitem"]:hover [role="gridcell"] span[title] ~ span {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}'
            );
        }

        // 3. Media preview in chat (images, videos, stickers, voice notes, links)
        if (cfg.blur_media !== false) {
            css.push(
                '/* Media preview in chat panel */',
                'div[data-testid="msg-container"]:not(:has([data-testid="quoted-message"])) :is(div, button)[role="button"][class]:not(.x13yyeie, .x1dxgm4b, .x7fhd9j, ._ak3u, ._aju3, [data-js-context-icon], .x1a06ls3, .x6ikm8r.x10wlt62.xlyipyv, .x1bvqhpb.x12lo8hy, .xo1mcw5.x1xlr1w8, ._ahy-, :has(span.xhslqc4)),',
                '[data-testid="quoted-message"]:has([style^="background-image"], img:not(.emoji):not(._aju3), span[data-testid="sticker-container"]),',
                '[data-testid="quoted-message"] [data-testid="chat-msg-symbol"],',
                '[data-testid="quoted-message"] [data-testid="chat-msg-symbol"] + span,',
                'div.x78zum5.x6s0dn4.x15zctf7.x1xegmmw.xdwrcjd,',
                '[data-testid="quoted-message"] [data-testid="msgImage"],',
                '[data-testid="link-preview-container"] > img:not(.emoji):not(._aju3),',
                '[data-testid="link-preview-container"] > div > img:not(.emoji):not(._aju3),',
                '[data-testid="msg-container"] div > button:has(>img),',
                'span[data-testid="sticker-container"]:has(>[role="button"], >button),',
                'div.xz9dduz > div:first-child,',
                '[data-testid="media-editor-canvas"],',
                '[role="list"] div.x6ikm8r.x10wlt62.x1280gxy,',
                '#main [role="row"] img, #main [role="row"] video, #main [role="row"] [data-testid="audio-player"] {',
                '  filter: blur(var(--mdp-blur)) grayscale(1) !important;',
                '  transition: initial;',
                '  transition-delay: 0s;',
                '}',
                '/* Media hover unblur */',
                'div[data-testid="msg-container"]:hover :is(div, button)[role="button"][class]:not(.x13yyeie, .x1dxgm4b, .x7fhd9j, ._ak3u, ._aju3, [data-js-context-icon], .x1a06ls3, .x6ikm8r.x10wlt62.xlyipyv),',
                '[data-testid="quoted-message"]:has([style^="background-image"], img:not(.emoji):not(._aju3), span[data-testid="sticker-container"]):hover,',
                '[data-testid="quoted-message"]:hover [data-testid="chat-msg-symbol"],',
                '[data-testid="quoted-message"]:hover [data-testid="chat-msg-symbol"] + span,',
                'div.x78zum5.x6s0dn4.x15zctf7.x1xegmmw.xdwrcjd:hover,',
                '[data-testid="quoted-message"] [data-testid="msgImage"]:hover,',
                '[data-testid="link-preview-container"] > img:not(.emoji):not(._aju3):hover,',
                '[data-testid="link-preview-container"] > div > img:not(.emoji):not(._aju3):hover,',
                '[data-testid="msg-container"] div > button:has(>img):hover,',
                'span[data-testid="sticker-container"]:has(>[role="button"], >button):hover,',
                'div.xz9dduz > div:first-child:hover,',
                '[data-testid="media-editor-canvas"]:hover,',
                '[role="list"]:hover div.x6ikm8r.x10wlt62.x1280gxy,',
                '#main [role="row"]:hover img, #main [role="row"]:hover video, #main [role="row"]:hover [data-testid="audio-player"] {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}'
            );
        }

        // 4. Media gallery / details panel
        if (cfg.blur_media_gallery !== false) {
            css.push(
                '/* Media gallery & overlay thumbnails */',
                'div.x1n2onr6.x78zum5.x6s0dn4.xl56j7k.xh8yej3.xeuugli.x5yr21d.xdt5ytf > div > div:first-child,',
                'div.x1conndi,',
                'div[role="listitem"] button > div[style^="background-image"],',
                '[data-testid="media-gallery"] img, [data-testid="image-thumb"] {',
                '  filter: blur(var(--mdg-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                'div.x1n2onr6.x78zum5.x6s0dn4.xl56j7k.xh8yej3.xeuugli.x5yr21d.xdt5ytf > div > div:first-child:hover,',
                'div.x1conndi:hover,',
                'div[role="listitem"] button > div[style^="background-image"]:hover,',
                '[data-testid="media-gallery"] img:hover, [data-testid="image-thumb"]:hover {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}',
                '/* Prevent cropped blur in dialogs */',
                'div[role="dialog"] > .x10wlt62 {',
                '  overflow: visible !important;',
                '}'
            );
        }

        // 5. Text input (compose box)
        if (cfg.blur_text_input !== false) {
            css.push(
                '/* Compose box text input */',
                'div.lexical-rich-text-input, footer [contenteditable="true"], footer [role="textbox"] {',
                '  filter: grayscale(1) opacity(0.25) !important;',
                '  transition: filter 0.15s ease, opacity 0.15s ease !important;',
                '}',
                'div.lexical-rich-text-input:hover, div.lexical-rich-text-input:focus-within,',
                'footer:hover [contenteditable="true"], footer [contenteditable="true"]:focus,',
                'footer:focus-within [contenteditable="true"] {',
                '  filter: grayscale(0) opacity(1) !important;',
                '  ' + hoverTrans,
                '}'
            );
        }

        // 6. Profile pictures / avatars
        if (cfg.blur_profile_pictures === true) {
            css.push(
                '/* Profile pictures in chat list, header, group info, etc. */',
                'div.x78zum5>div.x6s0dn4.x78zum5.x1c4vz4f.x2lah0s.x1y332i5.x18d9i69.xexx8yu.xbmws1g > div,',
                'div.x6s0dn4.x78zum5.x1c4vz4f.x2lah0s.x18d9i69.xexx8yu > div,',
                'div[role="dialog"] ._ak8h,',
                'header div[role="button"]:first-child div.x1n2onr6.x16ye13r.x5lhr3w,',
                'div.x16ye13r.x10l6tqk.x1wnpwf8.x1vjfegm div[role="button"],',
                'div.x1okw0bk.x1g6eq07 div.x1n2onr6.x1c9tyrk.xeusxvb.x1pahc9y.x1ertn4p,',
                'div.x2lah0s.x1c4vz4f.xdl72j9.x1g6eq07,',
                'div.x1n2onr6.x1c4vz4f.x2lah0s.xdl72j9.x19991ni.x13dflua.xz4gly6.x67bb7w.x1hc1fzr,',
                'div.overlay ._ak8h,',
                '#pane-side [role="listitem"] img, #main header img,',
                '[data-testid="avatar"] img, [data-testid="chat-avatar"] img {',
                '  filter: blur(var(--pp-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                '/* Overlay large profile pic */',
                'div.overlay div.xh8yej3.x5yr21d.x6ikm8r.x10wlt62.xiy17q3.x1lvsgvq.x1tbiz1a.xyyilfv {',
                '  filter: blur(var(--pp-lg-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                '/* Profile pictures hover unblur */',
                'div.x78zum5>div.x6s0dn4.x78zum5.x1c4vz4f.x2lah0s.x1y332i5.x18d9i69.xexx8yu.xbmws1g > div:hover,',
                'div.x6s0dn4.x78zum5.x1c4vz4f.x2lah0s.x18d9i69.xexx8yu > div:hover,',
                'div[role="dialog"] ._ak8h:hover,',
                'header div[role="button"]:first-child div.x1n2onr6.x16ye13r.x5lhr3w:hover,',
                'div.x16ye13r.x10l6tqk.x1wnpwf8.x1vjfegm div[role="button"]:hover,',
                'div.x1okw0bk.x1g6eq07 div.x1n2onr6.x1c9tyrk.xeusxvb.x1pahc9y.x1ertn4p:hover,',
                'div.x2lah0s.x1c4vz4f.xdl72j9.x1g6eq07:hover,',
                'div.overlay ._ak8h:hover,',
                'div.overlay div.xh8yej3.x5yr21d.x6ikm8r.x10wlt62.xiy17q3.x1lvsgvq.x1tbiz1a.xyyilfv:hover,',
                '#pane-side [role="listitem"]:hover img, #main header:hover img,',
                '[data-testid="avatar"]:hover img, [data-testid="chat-avatar"]:hover img {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}',
                '/* Prevent cropped avatar blur */',
                'div._ak1d > div:first-child > div:first-child {',
                '  overflow: visible !important;',
                '}'
            );
        }

        // 7. Contact and Group Names
        if (cfg.blur_contact_names === true) {
            css.push(
                '/* Names in chat list, header, group info, and messages */',
                'div[role="gridcell"] div.x14ug900.x78zum5.x1iyjqo2.x1jchvi3.xdod15v.x6ikm8r.x10wlt62.x1mzt3pk.x1yc453h.xo1l8bm:not(.x1gslohp),',
                'div[role="button"][class=""] ._ak8q:has(*),',
                'div[role="dialog"] ._ak8q,',
                'div[role="button"].x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli > div:nth-child(1),',
                'div[role="button"].x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli > div:nth-child(2),',
                'div:has(>span[data-testid="author"]),',
                'div.overlay ._ak8q,',
                'div._ak1d > div:first-child > div:first-child > :not(:first-child),',
                '#pane-side [role="listitem"] span[title],',
                '#main header span[title], #main header [dir="auto"] {',
                '  filter: blur(var(--nm-blur)) grayscale(1) !important;',
                '  transition-delay: 0s;',
                '}',
                '/* Names hover unblur */',
                'div[role="gridcell"] div.x14ug900.x78zum5.x1iyjqo2.x1jchvi3.xdod15v.x6ikm8r.x10wlt62.x1mzt3pk.x1yc453h.xo1l8bm:not(.x1gslohp):hover,',
                'div[role="button"][class=""] ._ak8q:has(*):hover,',
                'div[role="dialog"] ._ak8q:hover,',
                'div[role="button"].x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli > div:nth-child(1):hover,',
                'div[role="button"].x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli > div:nth-child(2):hover,',
                'div:has(>span[data-testid="author"]):hover,',
                'div.overlay ._ak8q:hover,',
                'div._ak1d > div:first-child > div:first-child > :not(:first-child):hover,',
                '#pane-side [role="listitem"]:hover span[title],',
                '#main header:hover span[title], #main header:hover [dir="auto"] {',
                '  filter: blur(0) grayscale(0) !important;',
                '  ' + hoverTrans,
                '}'
            );
        }

        // 8. Unblur on App Hover (when cursor is anywhere within the WhatsApp window)
        if (cfg.unblur_on_app_hover === true) {
            css.push(
                '/* Unblur all elements when cursor is inside the app */',
                'body:hover div[data-testid="msg-container"],',
                'body:hover div.xjbqb8w.x1iyjqo2.x1f6kntn.x1fc57z9.x6ikm8r.x10wlt62.x1yc453h.xlyipyv.xuxw1ft.xo1l8bm,',
                'body:hover div.lexical-rich-text-input,',
                'body:hover div.x78zum5>div.x6s0dn4.x78zum5.x1c4vz4f.x2lah0s.x1y332i5.x18d9i69.xexx8yu.xbmws1g > div,',
                'body:hover div[role="gridcell"] div.x14ug900.x78zum5.x1iyjqo2.x1jchvi3.xdod15v.x6ikm8r.x10wlt62.x1mzt3pk.x1yc453h.xo1l8bm,',
                'body:hover #pane-side *, body:hover #main *, body:hover footer * {',
                '  filter: none !important;',
                '  opacity: 1 !important;',
                '  transition-delay: 0s !important;',
                '}'
            );
        }

        return css.join('\n');
    }

    function removeIdleOverlay() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.remove();
        }
        document.body.style.filter = '';
        isIdleActive = false;
    }

    function showIdleOverlay() {
        if (isIdleActive) return;
        var existing = document.getElementById(OVERLAY_ID);
        if (!existing) {
            var overlay = document.createElement('div');
            overlay.id = OVERLAY_ID;
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;backdrop-filter:blur(var(--wi-blur, 14px));-webkit-backdrop-filter:blur(var(--wi-blur, 14px));background:rgba(10,14,19,0.78);z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;animation:wpFadeIn .2s ease;';
            overlay.innerHTML = '<div style="background:#131b24;border:1px solid rgba(0,230,153,0.3);box-shadow:0 12px 40px rgba(0,0,0,0.6);border-radius:18px;padding:32px 40px;text-align:center;max-width:380px;">' +
                '<div style="width:56px;height:56px;border-radius:50%;background:rgba(0,230,153,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#00e699;">' +
                '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>' +
                '</div>' +
                '<h3 style="margin:0 0 8px;font-family:system-ui,-apple-system,sans-serif;font-size:18px;font-weight:600;color:#ffffff;">Privacy Shield Active</h3>' +
                '<p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#8a99a8;line-height:1.5;">Move mouse or click anywhere to unblur WhatsApp.</p>' +
                '</div>';
            overlay.addEventListener('click', function () {
                removeIdleOverlay();
                resetIdleTimer();
            });
            document.body.appendChild(overlay);
        }
        isIdleActive = true;
    }

    function resetIdleTimer() {
        if (isIdleActive) {
            removeIdleOverlay();
        }
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        if (currentConfig && currentConfig.enabled !== false && currentConfig.blur_on_idle === true) {
            var timeoutMs = (currentConfig.idle_timeout_seconds || 120) * 1000;
            idleTimer = setTimeout(function () {
                showIdleOverlay();
            }, timeoutMs);
        }
    }

    function setupIdleListeners() {
        var events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
        for (var i = 0; i < events.length; i++) {
            window.addEventListener(events[i], resetIdleTimer, { passive: true });
        }
    }

    function apply(cfg) {
        currentConfig = cfg || {};
        var styleEl = document.getElementById(STYLE_ID);

        if (!currentConfig || currentConfig.enabled === false) {
            if (styleEl) styleEl.remove();
            removeIdleOverlay();
            return;
        }

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(styleEl);
        }

        styleEl.textContent = buildCss(currentConfig);
        resetIdleTimer();
    }

    // Expose global methods with WhatsPulse namespace
    window.__whatspulseSetPrivacy = apply;

    // Backward compatibility with previous blur level
    window.__whatspulseSetBlur = function (level) {
        if (!currentConfig) currentConfig = {};
        currentConfig.enabled = level > 0;
        currentConfig.blur_radius = level <= 0 ? 0 : (level === 1 ? 4 : (level === 2 ? 8 : 14));
        apply(currentConfig);
    };

    // Initialize from bootstrap config
    setupIdleListeners();
    var initial = (window.__whatspulseConfig && window.__whatspulseConfig.privacy) || null;
    if (!initial && window.__whatspulseConfig) {
        var lvl = window.__whatspulseConfig.blurLevel || 0;
        initial = {
            enabled: lvl > 0,
            blur_radius: lvl <= 0 ? 0 : (lvl === 1 ? 4 : (lvl === 2 ? 8 : 14)),
            blur_messages: true,
            blur_last_messages: true,
            blur_media: true,
            blur_media_gallery: true,
            blur_text_input: true
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { apply(initial); });
    } else {
        apply(initial);
    }
})();
