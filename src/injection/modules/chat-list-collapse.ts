import { reportScriptError } from "../ipc";

const ID = "whatspulse-collapse-nav";
const STYLE_ID = "whatspulse-chat-list-collapse";
const PANE_ATTR = "data-whatspulse-pane";
const STORAGE_KEY = "whatspulse:chatListCollapsed";
const STRIP_WIDTH = "97px";

const ICON_COLLAPSE =
  '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>';
const ICON_EXPAND =
  '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>';

let collapsed = false;
try {
  collapsed = localStorage.getItem(STORAGE_KEY) === "1";
} catch {
  /* private mode */
}

function collapseCss(): string {
  return (
    "[" +
    PANE_ATTR +
    "]{flex-grow:0!important;flex-shrink:0!important;" +
    "flex-basis:auto!important;width:" +
    STRIP_WIDTH +
    "!important;" +
    "min-width:" +
    STRIP_WIDTH +
    "!important;max-width:" +
    STRIP_WIDTH +
    "!important}" +
    "#side,#pane-side{overflow-x:hidden!important}" +
    '#pane-side [role="row"]{overflow:hidden!important}'
  );
}

function untagPanes(): void {
  document.querySelectorAll("[" + PANE_ATTR + "]").forEach((e) => {
    e.removeAttribute(PANE_ATTR);
  });
}

function tagPanes(): void {
  const side = document.querySelector("#side");
  if (!side || !side.parentElement) {
    return;
  }
  const wrap = side.parentElement;
  const w = wrap.getBoundingClientRect();
  untagPanes();
  document.querySelectorAll("div").forEach((e) => {
    const r = e.getBoundingClientRect();
    if (Math.abs(r.left - w.left) > 0.6) {
      return;
    }
    if (Math.abs(r.height - w.height) > 0.6) {
      return;
    }
    e.setAttribute(PANE_ATTR, "1");
  });
  wrap.setAttribute(PANE_ATTR, "1");
}

function apply(): void {
  try {
    const el = document.getElementById(STYLE_ID);
    if (collapsed) {
      tagPanes();
      let style = el;
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = collapseCss();
    } else {
      if (el) {
        el.remove();
      }
      untagPanes();
    }
  } catch (e) {
    reportScriptError("chat-list-collapse", e);
  }
}

function toggle(): void {
  collapsed = !collapsed;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode */
  }
  apply();
  install();
}

const OVERLAY_OPEN = '[data-animate-media-viewer],[data-testid="media-viewer-modal"]';

function overlayOpen(): boolean {
  return !!document.querySelector(OVERLAY_OPEN);
}

function railButtons(): HTMLButtonElement[] {
  return Array.prototype.slice
    .call(document.querySelectorAll("button"))
    .filter((b: HTMLButtonElement) => {
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

interface CollapseAnchors {
  templateWrapper: HTMLElement;
  parent: HTMLElement;
  reference: HTMLElement;
}

function anchors(): CollapseAnchors | null {
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
    !avatarWrapper.parentElement ||
    avatarWrapper.parentElement !== templateWrapper.parentElement
  ) {
    return null;
  }
  const box = templateWrapper.getBoundingClientRect();
  if (box.width > 72 || box.height > 120) {
    return null;
  }
  const settings = document.getElementById("whatspulse-settings-nav");
  const reference =
    settings && settings.parentElement === avatarWrapper.parentElement
      ? settings
      : avatarWrapper;
  return { templateWrapper, parent: avatarWrapper.parentElement, reference };
}

function placed(a: CollapseAnchors | null): boolean {
  const entry = document.getElementById(ID);
  if (!entry || !entry.isConnected || !a) {
    return false;
  }
  if (entry.querySelector("[data-testid]")) {
    return false;
  }
  return entry.parentElement === a.parent && entry.nextElementSibling === a.reference;
}

function install(): void {
  try {
    const a = anchors();
    if (!a) {
      return;
    }
    let entry = document.getElementById(ID);
    if (!placed(a)) {
      if (entry) {
        entry.remove();
      }
      entry = a.templateWrapper.cloneNode(true) as HTMLElement;
      entry.id = ID;
      Array.prototype.slice
        .call(entry.querySelectorAll("[data-testid]"))
        .forEach((n: Element) => {
          n.removeAttribute("data-testid");
        });
      a.parent.insertBefore(entry, a.reference);
    }
    const button = (entry?.querySelector("button") || entry) as HTMLElement | null;
    if (button) {
      button.removeAttribute("data-navbar-item");
      button.removeAttribute("aria-pressed");
      button.removeAttribute("aria-selected");
      button.removeAttribute("aria-current");
      const label = collapsed ? "Expand chat list" : "Collapse chat list";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      const svg = button.querySelector("svg");
      if (svg) {
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.innerHTML = collapsed ? ICON_EXPAND : ICON_COLLAPSE;
      }
    }
  } catch (e) {
    reportScriptError("chat-list-collapse", e);
  }
}

export function initChatListCollapse(): void {
  document.addEventListener(
    "click",
    (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function" || !target.closest("#" + ID)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (overlayOpen()) {
        return;
      }
      toggle();
    },
    true
  );

  function tick() {
    install();
    if (collapsed) {
      apply();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      apply();
      install();
    });
  } else {
    apply();
    install();
  }
  setInterval(tick, 1000);
}
