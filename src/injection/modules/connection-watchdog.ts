import { reportScriptError, bridge } from "../ipc";

export function initConnectionWatchdog(): void {
  try {
    const Native = window.WebSocket;
    if (!Native || (Native as unknown as { __whatspulsePatched?: boolean }).__whatspulsePatched) {
      return;
    }
    let openCount = 0;
    let reported: boolean | null = null;

    function isWhatsApp(url: string | URL): boolean {
      try {
        return /(^|\.)whatsapp\.(net|com)$/.test(new URL(url, location.href).host);
      } catch {
        return false;
      }
    }

    function loggedIn(): boolean {
      return !!document.querySelector("#pane-side");
    }

    function report(up: boolean): void {
      if (up === reported) {
        return;
      }
      if (!up && !loggedIn()) {
        return; // never report the link down before the user is logged in
      }
      reported = up;
      bridge.connectionChanged(up);
    }

    function Patched(this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
      if (isWhatsApp(url)) {
        let counted = false;
        let settled = false;
        ws.addEventListener("open", () => {
          counted = true;
          openCount++;
          report(true);
        });
        const drop = () => {
          if (settled || !counted) {
            return;
          }
          settled = true;
          openCount = Math.max(0, openCount - 1);
          if (openCount === 0) {
            report(false);
          }
        };
        ws.addEventListener("close", drop);
        ws.addEventListener("error", drop);
      }
      return ws;
    }

    Patched.prototype = Native.prototype;
    const staticKeys: (keyof typeof WebSocket)[] = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    for (const k of staticKeys) {
      (Patched as unknown as Record<string, unknown>)[k] = Native[k];
    }
    (Patched as unknown as { __whatspulsePatched?: boolean }).__whatspulsePatched = true;
    window.WebSocket = Patched as unknown as typeof WebSocket;
  } catch (e) {
    reportScriptError("connection-watchdog", e);
  }
}
