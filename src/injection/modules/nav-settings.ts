import { reportScriptError, bridge } from "../ipc";

const ID = "whatspulse-settings-nav";
const DIRECT_ID = "whatspulse-direct-chat-nav";
const DIRECT_ICON_VIEWBOX = "0 0 24 24";
const DIRECT_ICON =
  '<path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>';

const ICON_VIEWBOX = "0 0 64 64";
const ICON =
  '<path fill="currentColor" d="M 32 5 C 17.098857 5 5 16.969621 5 31.710938 C 5 37.047389 6.5860348 42.020918 9.3144531 46.193359 L 5 59 L 18.179688 54.65625 C 22.223999 57.046126 26.949584 58.419922 32 58.419922 C 46.901143 58.419922 59 46.452254 59 31.710938 C 59 16.969621 46.901143 5 32 5 z M 32 10.308594 C 43.939672 10.308594 53.634766 19.899327 53.634766 31.710938 C 53.634766 43.522547 43.939672 53.109375 32 53.109375 C 27.481058 53.109375 23.28555 51.738327 19.8125 49.390625 L 11.679688 52.072266 L 14.365234 44.101562 C 11.847131 40.603908 10.365234 36.327615 10.365234 31.710938 C 10.365234 19.899327 20.060328 10.308594 32 10.308594 z"/>' +
  '<path fill="currentColor" d="m 16.831427,21.17152 q 1.756611,-0.320463 3.560698,-0.462891 0.486629,-0.03561 0.985127,-0.03561 1.353065,0 2.789213,0.272987 0.439153,2.36193 0.83083,4.723859 0.391676,2.350061 0.747746,4.759467 0.04748,0.23738 0.344201,0.308594 0.296725,0.05935 0.367939,-0.11869 0.367939,-0.973258 0.747747,-2.278847 0.391676,-1.317458 0.783353,-2.670524 0.391677,-1.364934 0.735878,-2.670523 0.35607,-1.317458 0.652794,-2.290716 1.673528,-0.142428 3.406402,-0.23738 0.379807,-0.02374 0.759615,-0.01187 1.341196,0 2.634917,0.249249 0.747746,2.36193 1.471755,4.664515 0.735878,2.302584 1.424279,4.71199 0.04748,0.11869 0.154297,0.261118 0.106821,0.130559 0.23738,0.11869 0.142428,-0.01187 0.272987,-0.225511 0.130559,-0.225511 0.213642,-0.759616 0.58158,-4.427134 1.068209,-8.972959 1.103817,-0.23738 2.314454,-0.23738 0.308594,-0.01187 0.629057,0.01187 1.554838,0.07121 3.204628,0.225511 -0.07121,1.697266 -0.284856,3.750602 -0.201773,2.041467 -0.498498,4.189755 -0.284855,2.148288 -0.617187,4.308445 -0.332332,2.148288 -0.664664,4.082934 -0.320463,1.922777 -0.617188,3.548829 -0.284855,1.614183 -0.510366,2.682392 -1.317459,0.09495 -2.504358,0.166166 -1.186899,0.07121 -2.338192,0.11869 -1.151292,0.04748 -2.314454,0.05935 -1.151292,0.01187 -2.409405,0.01187 -0.04748,-0.23738 -0.154297,-0.854567 -0.09495,-0.617188 -0.225511,-1.471756 -0.130559,-0.854567 -0.296725,-1.815956 -0.154297,-0.961388 -0.308594,-1.827825 -0.142428,-0.878305 -0.272987,-1.590445 -0.130559,-0.724008 -0.201773,-1.044471 -0.09495,-0.439153 -0.284855,-0.640926 -0.178035,-0.201773 -0.379808,-0.189904 -0.189904,0.01187 -0.367939,0.23738 -0.166166,0.213642 -0.284856,0.59345 -0.142428,0.58158 -0.403546,1.542969 -0.249248,0.961388 -0.557842,2.148288 -0.296725,1.17503 -0.617188,2.480619 -0.320463,1.293721 -0.605319,2.563703 -1.341196,0.09495 -2.46875,0.142428 -0.902044,0.03561 -1.756611,0.03561 -0.213642,0 -0.427284,0 -1.056341,-0.01187 -2.136419,-0.07121 -1.06821,-0.05935 -2.255109,-0.106821 -0.605319,-2.82482 -1.05634,-5.614034 -0.451022,-2.801082 -0.842699,-5.578427 -0.391677,-2.789214 -0.783354,-5.590296 -0.379807,-2.812952 -0.890174,-5.602165 z"/>';

const OVERLAY =
  '[role="dialog"],[aria-modal="true"],[data-animate-modal-popup],' +
  "[data-animate-modal-backdrop],[data-animate-media-viewer]," +
  '[data-testid="drawer-fullscreen"],[data-testid="media-viewer-modal"]';

const OVERLAY_OPEN = '[data-animate-media-viewer],[data-testid="media-viewer-modal"]';

function overlayOpen(): boolean {
  return !!document.querySelector(OVERLAY_OPEN);
}

function railButtons(): HTMLButtonElement[] {
  return Array.prototype.slice
    .call(document.querySelectorAll("button"))
    .filter((b: HTMLButtonElement) => {
      if (b.closest(OVERLAY)) {
        return false;
      }
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.width <= 72 && r.left < 80;
    });
}

function mainRailPresent(rail: HTMLButtonElement[]): boolean {
  let n = 0;
  for (let i = 0; i < rail.length; i++) {
    const b = rail[i];
    if (b.getBoundingClientRect().top < 320 && b.querySelector("svg") && !b.querySelector("img")) {
      n++;
    }
  }
  return n >= 3;
}

function wrapperSharedWith(node: HTMLElement, other: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = node;
  while (cur.parentElement) {
    if (cur.parentElement.contains(other)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

interface Anchors {
  avatarWrapper: HTMLElement;
  templateWrapper: HTMLElement;
}

function anchors(): Anchors | null {
  if (overlayOpen()) {
    return null;
  }
  const rail = railButtons();
  rail.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  if (!mainRailPresent(rail)) {
    return null;
  }
  const mine = (b: HTMLElement) => b.closest('[id^="whatspulse-"]');
  let avatar: HTMLButtonElement | null = null;
  for (let i = rail.length - 1; i >= 0; i--) {
    if (!mine(rail[i])) {
      avatar = rail[i];
      break;
    }
  }
  if (!avatar || !avatar.querySelector("img")) {
    return null;
  }
  const avatarTop = avatar.getBoundingClientRect().top;
  let template: HTMLButtonElement | null = null;
  for (let j = rail.length - 1; j >= 0; j--) {
    const b = rail[j];
    if (
      b !== avatar &&
      !mine(b) &&
      b.querySelector("svg") &&
      !b.querySelector("img") &&
      b.getBoundingClientRect().top < avatarTop
    ) {
      template = b;
      break;
    }
  }
  if (!template) {
    return null;
  }
  const avatarWrapper = wrapperSharedWith(avatar, template);
  const templateWrapper = wrapperSharedWith(template, avatar);
  if (
    !avatarWrapper ||
    !templateWrapper ||
    avatarWrapper.parentElement !== templateWrapper.parentElement
  ) {
    return null;
  }
  const box = templateWrapper.getBoundingClientRect();
  if (box.width > 72 || box.height > 120) {
    return null;
  }
  return { avatarWrapper, templateWrapper };
}

function placed(a: Anchors | null): boolean {
  const entry = document.getElementById(ID);
  if (!entry || !entry.isConnected || !a) {
    return false;
  }
  if (entry.querySelector("[data-testid]")) {
    return false;
  }
  return (
    entry.parentElement === a.avatarWrapper.parentElement &&
    entry.nextElementSibling === a.avatarWrapper
  );
}

function install(): void {
  try {
    const a = anchors();
    if (!a) {
      return;
    }
    if (placed(a) && document.getElementById(DIRECT_ID)) {
      return;
    }

    const existing = document.getElementById(ID);
    if (existing) {
      existing.remove();
    }
    const existingDirect = document.getElementById(DIRECT_ID);
    if (existingDirect) {
      existingDirect.remove();
    }

    const avatarWrapper = a.avatarWrapper;
    const templateWrapper = a.templateWrapper;

    // 1. Settings entry
    const entry = templateWrapper.cloneNode(true) as HTMLElement;
    entry.id = ID;
    Array.prototype.slice
      .call(entry.querySelectorAll("[data-testid]"))
      .forEach((n: Element) => {
        n.removeAttribute("data-testid");
      });
    const button = (entry.querySelector("button") || entry) as HTMLElement;
    button.removeAttribute("data-navbar-item");
    button.removeAttribute("aria-pressed");
    button.removeAttribute("aria-selected");
    button.removeAttribute("aria-current");
    button.setAttribute("aria-label", "WhatsPulse Settings");
    button.setAttribute("title", "WhatsPulse Settings");
    const svg = button.querySelector("svg");
    if (svg) {
      svg.setAttribute("viewBox", ICON_VIEWBOX);
      svg.innerHTML = ICON;
    }

    // 2. Direct Chat entry
    const directEntry = templateWrapper.cloneNode(true) as HTMLElement;
    directEntry.id = DIRECT_ID;
    Array.prototype.slice
      .call(directEntry.querySelectorAll("[data-testid]"))
      .forEach((n: Element) => {
        n.removeAttribute("data-testid");
      });
    const directBtn = (directEntry.querySelector("button") || directEntry) as HTMLElement;
    directBtn.removeAttribute("data-navbar-item");
    directBtn.removeAttribute("aria-pressed");
    directBtn.removeAttribute("aria-selected");
    directBtn.removeAttribute("aria-current");
    directBtn.setAttribute("aria-label", "Direct Chat (Tanpa Simpan Nomor)");
    directBtn.setAttribute("title", "Direct Chat (Tanpa Simpan Nomor)");
    const directSvg = directBtn.querySelector("svg");
    if (directSvg) {
      directSvg.setAttribute("viewBox", DIRECT_ICON_VIEWBOX);
      directSvg.innerHTML = DIRECT_ICON;
    }

    if (avatarWrapper.parentElement) {
      avatarWrapper.parentElement.insertBefore(entry, avatarWrapper);
      avatarWrapper.parentElement.insertBefore(directEntry, entry);
    }
  } catch (e) {
    reportScriptError("nav-settings", e);
  }
}

const INPAGE_MODAL_ID = "whatspulse-direct-chat-modal";

export function showInpageDirectChat(): void {
  const existing = document.getElementById(INPAGE_MODAL_ID);
  if (existing) {
    existing.remove();
  }

  const isDark =
    document.body.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const bgBackdrop = "rgba(0, 0, 0, 0.72)";
  const bgCard = isDark ? "#111b21" : "#ffffff";
  const textPrimary = isDark ? "#e9edef" : "#111b21";
  const textSecondary = isDark ? "#8696a0" : "#667781";
  const borderCard = isDark ? "rgba(134, 150, 160, 0.2)" : "rgba(0, 0, 0, 0.12)";
  const bgInput = isDark ? "#202c33" : "#f0f2f5";
  const accentColor = "#00a884";

  const overlay = document.createElement("div");
  overlay.id = INPAGE_MODAL_ID;
  overlay.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999999;background:" +
    bgBackdrop +
    ";backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;animation:wpModalFadeIn .15s ease;";

  overlay.innerHTML =
    '<div style="background:' +
    bgCard +
    ";border:1px solid " +
    borderCard +
    ";border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.4);width:440px;max-width:92vw;padding:28px;color:" +
    textPrimary +
    ';box-sizing:border-box;">' +
    '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;">' +
    '<div style="width:40px;height:40px;border-radius:10px;background:rgba(0,168,132,0.15);color:' +
    accentColor +
    ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
    "</div>" +
    '<div style="flex:1;">' +
    '<h3 style="margin:0 0 4px;font-size:17px;font-weight:600;color:' +
    textPrimary +
    ';">Direct Chat</h3>' +
    '<p style="margin:0;font-size:12px;color:' +
    textSecondary +
    ';line-height:1.4;">Kirim pesan WhatsApp langsung tanpa menyimpan nomor ke kontak.</p>' +
    "</div>" +
    "</div>" +
    '<div style="margin-bottom:16px;">' +
    '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:' +
    textPrimary +
    ';">Nomor Telepon WhatsApp</label>' +
    '<input type="tel" id="wp-inpage-phone" placeholder="Contoh: 08123456789 atau +628123456789" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' +
    borderCard +
    ";background:" +
    bgInput +
    ";color:" +
    textPrimary +
    ';font-size:14px;box-sizing:border-box;outline:none;" />' +
    '<span style="display:block;font-size:11px;color:' +
    textSecondary +
    ';margin-top:4px;">Format lokal 08... otomatis dikonversi ke kode negara 628...</span>' +
    "</div>" +
    '<div style="margin-bottom:20px;">' +
    '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:' +
    textPrimary +
    ';">Pesan Pembuka (Opsional)</label>' +
    '<textarea id="wp-inpage-msg" rows="3" placeholder="Tuliskan pesan pembuka di sini..." style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ' +
    borderCard +
    ";background:" +
    bgInput +
    ";color:" +
    textPrimary +
    ';font-size:14px;box-sizing:border-box;outline:none;resize:vertical;font-family:inherit;"></textarea>' +
    "</div>" +
    '<div id="wp-inpage-error" style="display:none;margin-bottom:14px;padding:8px 12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:12px;"></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;">' +
    '<button id="wp-inpage-cancel" style="padding:8px 16px;border-radius:8px;border:none;background:transparent;color:' +
    textSecondary +
    ';font-size:13px;font-weight:500;cursor:pointer;">Batal</button>' +
    '<button id="wp-inpage-submit" style="padding:8px 18px;border-radius:8px;border:none;background:' +
    accentColor +
    ';color:#ffffff;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
    "Mulai Obrolan" +
    "</button>" +
    "</div>" +
    "</div>";

  function close() {
    overlay.remove();
  }

  function cleanPhone(num: string) {
    let digits = num.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "62" + digits.substring(1);
    }
    return digits;
  }

  function submit() {
    const phoneInput = overlay.querySelector("#wp-inpage-phone") as HTMLInputElement | null;
    const msgInput = overlay.querySelector("#wp-inpage-msg") as HTMLTextAreaElement | null;
    const errBanner = overlay.querySelector("#wp-inpage-error") as HTMLElement | null;

    const phone = phoneInput?.value.trim() || "";
    const msg = msgInput?.value.trim() || "";

    const cleaned = cleanPhone(phone);
    if (!cleaned) {
      if (errBanner) {
        errBanner.textContent = "Silakan masukkan nomor telepon WhatsApp yang valid.";
        errBanner.style.display = "block";
      }
      phoneInput?.focus();
      return;
    }

    close();
    const targetUrl =
      "https://web.whatsapp.com/send?phone=" +
      cleaned +
      (msg ? "&text=" + encodeURIComponent(msg) : "");
    window.location.assign(targetUrl);
  }

  overlay.querySelector("#wp-inpage-cancel")?.addEventListener("click", close);
  overlay.querySelector("#wp-inpage-submit")?.addEventListener("click", submit);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  overlay.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (
      e.key === "Enter" &&
      ((e.target as HTMLElement).id === "wp-inpage-phone" ||
        (e.ctrlKey && (e.target as HTMLElement).id === "wp-inpage-msg"))
    ) {
      submit();
    }
  });

  document.body.appendChild(overlay);
  const input = overlay.querySelector("#wp-inpage-phone") as HTMLInputElement | null;
  if (input) {
    setTimeout(() => {
      input.focus();
    }, 50);
  }
}

export function initNavSettings(): void {
  window.__whatspulseOpenDirectChat = showInpageDirectChat;

  // Delegated click handler for life of page
  document.addEventListener(
    "click",
    (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") {
        return;
      }
      if (target.closest("#" + ID)) {
        ev.preventDefault();
        ev.stopPropagation();
        if (overlayOpen()) {
          return;
        }
        bridge.openSettings();
      } else if (target.closest("#" + DIRECT_ID)) {
        ev.preventDefault();
        ev.stopPropagation();
        showInpageDirectChat();
      }
    },
    true
  );

  install();
  setInterval(install, 1000);
}
