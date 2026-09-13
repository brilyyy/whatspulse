import { openDownloadFile, reportScriptError, saveDownloadFile, showInFolder } from "../ipc";

interface ToastOptions {
  id: string;
  title: string;
  subtitle?: string;
  status: "downloading" | "success" | "error";
  filePath?: string;
}

class DownloadToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, HTMLElement> = new Map();
  private dismissTimers: Map<string, number> = new Map();

  constructor() {
    this.ensureStyles();
  }

  private ensureStyles(): void {
    if (document.getElementById("whatspulse-download-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "whatspulse-download-toast-styles";
    style.textContent = `
      #whatspulse-toast-container {
        position: fixed;
        bottom: 76px;
        right: 24px;
        z-index: 9999999;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        max-width: 380px;
        width: calc(100vw - 48px);
        pointer-events: none;
        font-family: inherit;
      }

      .wp-toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--dropdown-background, #202c33);
        color: var(--primary-strong, #e9edef);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-default, rgba(255, 255, 255, 0.12));
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        transform: translateY(16px);
        opacity: 0;
        box-sizing: border-box;
      }

      .wp-toast.wp-toast-visible {
        transform: translateY(0);
        opacity: 1;
      }

      .wp-toast-icon-wrap {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
      }

      .wp-toast-status-downloading .wp-toast-icon-wrap {
        background: rgba(0, 168, 132, 0.15);
        color: #00a884;
      }

      .wp-toast-status-success .wp-toast-icon-wrap {
        background: rgba(37, 211, 102, 0.2);
        color: #25d366;
      }

      .wp-toast-status-error .wp-toast-icon-wrap {
        background: rgba(234, 67, 53, 0.2);
        color: #ea4335;
      }

      .wp-toast-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .wp-toast-title {
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .wp-toast-subtitle {
        font-size: 12px;
        opacity: 0.75;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .wp-toast-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }

      .wp-toast-btn {
        appearance: none;
        border: 1px solid var(--border-default, rgba(255, 255, 255, 0.15));
        background: rgba(255, 255, 255, 0.06);
        color: inherit;
        font-size: 11.5px;
        font-weight: 500;
        padding: 4px 9px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .wp-toast-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .wp-toast-close-btn {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.55;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s ease;
        align-self: flex-start;
      }

      .wp-toast-close-btn:hover {
        opacity: 1;
      }

      @keyframes wp-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .wp-spinner {
        animation: wp-spin 0.9s linear infinite;
      }
    `;

    document.head.appendChild(style);
  }

  private getContainer(): HTMLElement {
    if (!this.container || !document.body.contains(this.container)) {
      let existing = document.getElementById("whatspulse-toast-container");
      if (!existing) {
        existing = document.createElement("div");
        existing.id = "whatspulse-toast-container";
        document.body.appendChild(existing);
      }
      this.container = existing;
    }
    return this.container;
  }

  public show(options: ToastOptions): void {
    const container = this.getContainer();
    const existing = this.toasts.get(options.id);

    if (existing) {
      this.update(options.id, options);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `wp-toast wp-toast-status-${options.status}`;
    toast.id = `wp-toast-${options.id}`;

    toast.innerHTML = this.renderContent(options);
    container.appendChild(toast);
    this.toasts.set(options.id, toast);

    this.attachEvents(toast, options);

    // Trigger appear transition
    requestAnimationFrame(() => {
      toast.classList.add("wp-toast-visible");
    });

    if (options.status === "success") {
      this.scheduleDismiss(options.id, 5000);
    } else if (options.status === "error") {
      this.scheduleDismiss(options.id, 7000);
    }
  }

  public update(id: string, options: Partial<ToastOptions>): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    if (options.status) {
      toast.className = `wp-toast wp-toast-visible wp-toast-status-${options.status}`;
    }

    const currentTitle = options.title ?? toast.querySelector(".wp-toast-title")?.textContent ?? "";
    const currentSub = options.subtitle ?? toast.querySelector(".wp-toast-subtitle")?.textContent ?? "";
    const currentStatus = options.status ?? (toast.classList.contains("wp-toast-status-success") ? "success" : "downloading");
    const currentPath = options.filePath ?? toast.getAttribute("data-filepath") ?? undefined;

    toast.innerHTML = this.renderContent({
      id,
      title: currentTitle,
      subtitle: currentSub,
      status: currentStatus,
      filePath: currentPath,
    });

    this.attachEvents(toast, {
      id,
      title: currentTitle,
      status: currentStatus,
      filePath: currentPath,
    });

    if (currentStatus === "success") {
      this.scheduleDismiss(id, 5000);
    } else if (currentStatus === "error") {
      this.scheduleDismiss(id, 7000);
    }
  }

  public dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    const timer = this.dismissTimers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      this.dismissTimers.delete(id);
    }

    toast.classList.remove("wp-toast-visible");
    window.setTimeout(() => {
      toast.remove();
      this.toasts.delete(id);
    }, 280);
  }

  private scheduleDismiss(id: string, ms: number): void {
    const existing = this.dismissTimers.get(id);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.dismiss(id);
    }, ms);
    this.dismissTimers.set(id, timer);
  }

  private renderContent(options: ToastOptions): string {
    const iconSvg =
      options.status === "downloading"
        ? `<svg class="wp-spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"></circle>
            <path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"></path>
          </svg>`
        : options.status === "success"
        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>`;

    const actionButtons =
      options.status === "success" && options.filePath
        ? `<div class="wp-toast-actions">
            <button class="wp-toast-btn wp-toast-btn-open" data-path="${escapeHtml(options.filePath)}">Open File</button>
            <button class="wp-toast-btn wp-toast-btn-folder" data-path="${escapeHtml(options.filePath)}">Show in Folder</button>
          </div>`
        : "";

    return `
      <div class="wp-toast-icon-wrap">
        ${iconSvg}
      </div>
      <div class="wp-toast-body" data-filepath="${options.filePath ? escapeHtml(options.filePath) : ""}">
        <div class="wp-toast-title" title="${escapeHtml(options.title)}">${escapeHtml(options.title)}</div>
        ${options.subtitle ? `<div class="wp-toast-subtitle">${escapeHtml(options.subtitle)}</div>` : ""}
        ${actionButtons}
      </div>
      <button class="wp-toast-close-btn" title="Dismiss">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
  }

  private attachEvents(toast: HTMLElement, options: ToastOptions): void {
    const closeBtn = toast.querySelector(".wp-toast-close-btn");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss(options.id);
    });

    const openBtn = toast.querySelector(".wp-toast-btn-open");
    openBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const path = (e.currentTarget as HTMLElement).getAttribute("data-path");
      if (path) {
        openDownloadFile(path);
      }
    });

    const folderBtn = toast.querySelector(".wp-toast-btn-folder");
    folderBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const path = (e.currentTarget as HTMLElement).getAttribute("data-path");
      if (path) {
        showInFolder(path);
      }
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const toastManager = new DownloadToastManager();
const activeDownloadUrls = new Set<string>();

async function processBlobDownload(url: string, suggestedFilename: string): Promise<void> {
  if (activeDownloadUrls.has(url)) return;
  activeDownloadUrls.add(url);

  const downloadId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const displayTitle = suggestedFilename || "WhatsApp Document";

  toastManager.show({
    id: downloadId,
    title: displayTitle,
    subtitle: "Downloading file...",
    status: "downloading",
  });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || undefined;
    const finalFilename = suggestedFilename || inferFilenameFromMime(mimeType);

    const base64Data = await readBlobAsDataUrl(blob);

    const result = await saveDownloadFile(finalFilename, base64Data, mimeType);

    if (result.success && result.file_path) {
      const sizeFormatted = result.size_bytes ? ` (${formatBytes(result.size_bytes)})` : "";
      toastManager.update(downloadId, {
        title: result.filename,
        subtitle: `Saved to Downloads${sizeFormatted}`,
        status: "success",
        filePath: result.file_path,
      });
    } else {
      toastManager.update(downloadId, {
        title: result.filename || displayTitle,
        subtitle: result.error || "Download failed",
        status: "error",
      });
    }
  } catch (err) {
    reportScriptError("blob-downloader", err);
    toastManager.update(downloadId, {
      title: displayTitle,
      subtitle: err instanceof Error ? err.message : "Failed to download media",
      status: "error",
    });
  } finally {
    window.setTimeout(() => {
      activeDownloadUrls.delete(url);
    }, 1000);
  }
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read blob as Base64"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

function inferFilenameFromMime(mime?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (!mime) return `whatsapp_file_${timestamp}`;

  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return `image_${timestamp}.jpg`;
  if (m.includes("png")) return `image_${timestamp}.png`;
  if (m.includes("webp")) return `sticker_${timestamp}.webp`;
  if (m.includes("mp4")) return `video_${timestamp}.mp4`;
  if (m.includes("ogg")) return `audio_${timestamp}.ogg`;
  if (m.includes("mpeg") || m.includes("mp3")) return `audio_${timestamp}.mp3`;
  if (m.includes("pdf")) return `document_${timestamp}.pdf`;
  return `download_${timestamp}`;
}

export function initDownloadHandler(): void {
  try {
    // 1. Monkey-patch HTMLAnchorElement.prototype.click
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const href = this.href || "";
      const isBlobOrData = href.startsWith("blob:") || href.startsWith("data:");
      const hasDownload = this.hasAttribute("download") || !!this.download;

      if (isBlobOrData || hasDownload) {
        const filename = this.download || this.getAttribute("download") || "";
        if (isBlobOrData) {
          processBlobDownload(href, filename);
          return; // Handled completely client-side
        }
      }

      return originalClick.apply(this);
    };

    // 2. Capture-phase click listener for any <a download> clicked by user
    window.addEventListener(
      "click",
      (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const anchor = target.closest("a") as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = anchor.href || "";
        const isBlobOrData = href.startsWith("blob:") || href.startsWith("data:");
        const hasDownload = anchor.hasAttribute("download") || !!anchor.download;

        if (isBlobOrData && (hasDownload || href.startsWith("blob:"))) {
          e.preventDefault();
          e.stopPropagation();
          const filename = anchor.download || anchor.getAttribute("download") || "";
          processBlobDownload(href, filename);
        }
      },
      true
    );

    console.log("[WhatsPulse] Download handler & in-page toast initialized");
  } catch (err) {
    reportScriptError("download-handler-init", err);
  }
}
