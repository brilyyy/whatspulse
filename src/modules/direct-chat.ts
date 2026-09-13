import { directChatApi } from "../services/tauri";
import { showToast } from "../services/toast";
import "../types/config";

export function initDirectChat(): void {
  const modalDirectChat = document.getElementById("modal-direct-chat");
  const btnOpenDirectSidebar = document.getElementById("btn-open-direct-chat-sidebar");
  const btnCancelDirect = document.getElementById("btn-cancel-direct-chat");
  const btnSubmitDirect = document.getElementById("btn-submit-direct-chat");
  const directPhoneInput = document.getElementById("direct-chat-phone") as HTMLInputElement | null;
  const directMsgInput = document.getElementById("direct-chat-msg") as HTMLTextAreaElement | null;
  const directErr = document.getElementById("direct-chat-error");

  function openDirectChatModal() {
    if (directErr) {
      directErr.textContent = "";
      directErr.style.display = "none";
    }
    if (directPhoneInput) directPhoneInput.value = "";
    if (directMsgInput) directMsgInput.value = "";
    modalDirectChat?.classList.add("active");
    setTimeout(() => directPhoneInput?.focus(), 100);
  }

  function closeDirectChatModal() {
    modalDirectChat?.classList.remove("active");
  }

  async function submitDirectChat() {
    const phone = directPhoneInput?.value?.trim() || "";
    const message = directMsgInput?.value?.trim() || "";

    if (!phone) {
      if (directErr) {
        directErr.textContent = "Silakan masukkan nomor telepon WhatsApp.";
        directErr.style.display = "block";
      }
      directPhoneInput?.focus();
      return;
    }

    try {
      await directChatApi(phone, message || null);
      closeDirectChatModal();
      showToast("Membuka obrolan WhatsApp...");
    } catch (err: unknown) {
      if (directErr) {
        directErr.textContent = String(err);
        directErr.style.display = "block";
      }
    }
  }

  btnOpenDirectSidebar?.addEventListener("click", openDirectChatModal);
  btnCancelDirect?.addEventListener("click", closeDirectChatModal);
  btnSubmitDirect?.addEventListener("click", submitDirectChat);
  directPhoneInput?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") submitDirectChat();
  });

  window.__whatspulseOpenDirectChat = openDirectChatModal;
}
