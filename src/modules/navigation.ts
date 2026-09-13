import { closeSettingsWindow, triggerPanicMode } from "../services/tauri";
import "../types/config";

export function initNavigation(): void {
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
      if (activePane) {
        activePane.classList.add("active");
      }
    });
  });

  // Close Settings (via header buttons)
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnCloseSettingsTop = document.getElementById("btn-close-settings-top");

  btnCloseSettings?.addEventListener("click", closeSettingsWindow);
  btnCloseSettingsTop?.addEventListener("click", closeSettingsWindow);

  // Boss Key / Emergency Panic
  const btnTriggerPanic = document.getElementById("btn-trigger-panic");
  btnTriggerPanic?.addEventListener("click", triggerPanicMode);

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      const modalDirectChat = document.getElementById("modal-direct-chat");
      if (modalDirectChat?.classList.contains("active")) {
        modalDirectChat.classList.remove("active");
      } else {
        closeSettingsWindow();
      }
      return;
    }
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "X" || e.key === "x"))) {
      e.preventDefault();
      triggerPanicMode();
    }
  });

  // Global window functions for Tauri eval
  window.__whatspulseOnShow = (tab = "general") => {
    const targetItem = document.querySelector(`.nav-item[data-tab="${tab}"]`) as HTMLElement | null;
    if (targetItem) {
      targetItem.click();
    }
  };
}
