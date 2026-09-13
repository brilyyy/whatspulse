import { reportScriptError } from "../ipc";

export function initStoragePersist(): void {
  try {
    if (!navigator.storage) {
      return;
    }
    const granted = () => Promise.resolve(true);
    Object.defineProperty(navigator.storage, "persist", { value: granted, configurable: true });
    Object.defineProperty(navigator.storage, "persisted", { value: granted, configurable: true });
  } catch (e) {
    reportScriptError("storage-persist", e);
  }
}
