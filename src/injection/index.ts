import { initBootstrap } from "./modules/bootstrap";
import { initStoragePersist } from "./modules/storage-persist";
import { initSwRecovery } from "./modules/sw-recovery";
import { initConnectionWatchdog } from "./modules/connection-watchdog";
import { initThemeControl } from "./modules/theme-control";
import { initPrivacyBlur } from "./modules/privacy-blur";
import { initNavSettings } from "./modules/nav-settings";
import { initChatListCollapse } from "./modules/chat-list-collapse";
import { initDownloadHandler } from "./modules/download-handler";
import { reportScriptError } from "./ipc";

(function main() {
  try {
    initBootstrap();
    initStoragePersist();
    initSwRecovery();
    initConnectionWatchdog();
    initThemeControl();
    initPrivacyBlur();
    initNavSettings();
    initChatListCollapse();
    initDownloadHandler();
  } catch (err) {
    reportScriptError("main-orchestrator", err);
  }
})();

export * from "./types";
