import { invokeTauri, reportScriptError, logClient, bridge } from "../ipc";
import type { WhatsPulseApi } from "../types";

export function initBootstrap(): void {
  if (window.__whatspulse) {
    return;
  }

  const api: WhatsPulseApi = {
    config: window.__whatspulseConfig || {},
    invoke: invokeTauri,
    report: reportScriptError,
    log: logClient,
    bridge,
  };
  window.__whatspulse = api;

  // Boss Key / Panic Mode listener in page (F12 or Ctrl+Shift+X)
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "X" || e.key === "x"))) {
        e.preventDefault();
        invokeTauri("trigger_panic_mode");
      }
    },
    true
  );

  // Polyfill HTML5 Notification so WhatsApp Web notifications trigger native desktop alerts
  try {
    interface CustomNotifInstance {
      id: string;
      title: string;
      body: string;
      icon: string | null;
      tag: string | null;
      onclick: ((this: Notification, ev: Event) => unknown) | null;
      onclose: ((this: Notification, ev: Event) => unknown) | null;
      listeners: Record<string, ((ev: Event) => void)[]>;
      addEventListener: (type: string, listener: (ev: Event) => void) => void;
      removeEventListener: (type: string, listener: (ev: Event) => void) => void;
      dispatchEvent: (event: Event) => boolean;
      close: () => void;
    }

    const activeNotifications: Record<string, CustomNotifInstance> = {};
    let notifSeq = 0;

    function CustomNotification(this: CustomNotifInstance, title: string, options?: NotificationOptions) {
      const opts = options || {};
      const id = "wp_notif_" + ++notifSeq;

      this.id = id;
      this.title = title;
      this.body = opts.body || "";
      this.icon = opts.icon || null;
      this.tag = opts.tag || null;
      this.onclick = null;
      this.onclose = null;
      this.listeners = {};

      this.addEventListener = (type: string, listener: (ev: Event) => void) => {
        if (typeof listener === "function") {
          this.listeners[type] = this.listeners[type] || [];
          this.listeners[type].push(listener);
        }
      };

      this.removeEventListener = (type: string, listener: (ev: Event) => void) => {
        if (this.listeners[type]) {
          this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
        }
      };

      this.dispatchEvent = (event: Event) => {
        const type = event?.type || "click";
        if (type === "click" && typeof this.onclick === "function") {
          try {
            this.onclick.call(this as unknown as Notification, event);
          } catch (e) {
            console.error("[WhatsPulse Notif]", e);
          }
        } else if (type === "close" && typeof this.onclose === "function") {
          try {
            this.onclose.call(this as unknown as Notification, event);
          } catch (e) {
            console.error("[WhatsPulse Notif]", e);
          }
        }
        if (this.listeners[type]) {
          for (const l of this.listeners[type]) {
            try {
              l.call(this, event);
            } catch (e) {
              console.error("[WhatsPulse Notif]", e);
            }
          }
        }
        return true;
      };

      this.close = () => {
        const evt = new Event("close");
        this.dispatchEvent(evt);
        delete activeNotifications[id];
        if (this.tag) delete activeNotifications[this.tag];
      };

      activeNotifications[id] = this;
      if (this.tag) {
        activeNotifications[this.tag] = this;
      }
      if (title) {
        activeNotifications["title_" + title] = this;
      }

      // Auto-clean old references after 5 minutes
      setTimeout(() => {
        delete activeNotifications[id];
      }, 300000);

      invokeTauri("show_notification", {
        id,
        title,
        body: this.body,
        icon: this.icon,
        tag: this.tag,
      });
    }

    (CustomNotification as unknown as { permission: string }).permission = "granted";
    (CustomNotification as unknown as { requestPermission: () => Promise<string> }).requestPermission = () => {
      return Promise.resolve("granted");
    };

    window.Notification = CustomNotification as unknown as typeof Notification;

    // Called when user clicks a desktop notification
    window.__whatspulseTriggerNotificationClick = (id?: string, tag?: string, title?: string) => {
      const notif =
        (id && activeNotifications[id]) ||
        (tag && activeNotifications[tag]) ||
        (title && activeNotifications["title_" + title]);

      if (notif) {
        try {
          const clickEvt = new Event("click");
          notif.dispatchEvent(clickEvt);
        } catch (e) {
          console.error("[WhatsPulse Notif Click]", e);
        }
      }

      // Fallback: search and click chat in #pane-side by contact/chat name
      if (title) {
        try {
          const cleanTitle = title.split(":")[0].trim();
          const contactEl =
            document.querySelector(`#pane-side [role="listitem"] span[title="${cleanTitle}"]`) ||
            document.querySelector(`#pane-side [role="listitem"] [title*="${cleanTitle}"]`);
          if (contactEl) {
            const row = contactEl.closest('[role="listitem"]') || contactEl.closest('[role="row"]');
            if (row) {
              row.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
              row.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
              (row as HTMLElement).click();
            }
          }
        } catch (e) {
          console.warn("[WhatsPulse Fallback Chat Open]", e);
        }
      }
    };
  } catch (e) {
    reportScriptError("notification-polyfill", e);
  }

  // Title / unread count observer: monitors document.title for "(2) WhatsApp"
  try {
    let lastUnreadCount = 0;
    const checkUnreadTitle = () => {
      const match = document.title.match(/^\((\d+)\)/);
      const count = match ? parseInt(match[1], 10) : 0;
      if (count !== lastUnreadCount) {
        lastUnreadCount = count;
        invokeTauri("update_unread_count", { count });
      }
    };

    const titleEl = document.querySelector("title");
    if (titleEl) {
      const titleObserver = new MutationObserver(checkUnreadTitle);
      titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    } else {
      setInterval(checkUnreadTitle, 1000);
    }
  } catch (e) {
    reportScriptError("unread-badge-observer", e);
  }
}
