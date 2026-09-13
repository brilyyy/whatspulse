import { reportScriptError, logClient } from "../ipc";

export function initSwRecovery(): void {
  try {
    if (!("serviceWorker" in navigator) || navigator.serviceWorker.__whatspulsePatched) {
      return;
    }
    const FLAG = "__whatspulse_sw_recovered";
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = function (...args: Parameters<typeof register>) {
      return register(...args).catch((err: unknown) => {
        try {
          if (!sessionStorage.getItem(FLAG)) {
            sessionStorage.setItem(FLAG, "1");
            logClient("service worker registration failed, recovering: " + err);
            navigator.serviceWorker
              .getRegistrations()
              .then((rs) => Promise.all(rs.map((r) => r.unregister())))
              .then(() => {
                location.reload();
              });
          }
        } catch {
          /* ignore */
        }
        throw err;
      });
    };
    navigator.serviceWorker.__whatspulsePatched = true;
  } catch (e) {
    reportScriptError("sw-recovery", e);
  }
}
