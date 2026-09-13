let toastTimeout: number | undefined;

export function showToast(msg = "Settings saved"): void {
  const toast = document.getElementById("toast");
  const toastMsg = toast?.querySelector(".toast-msg");
  if (toast) {
    if (toastMsg) {
      toastMsg.textContent = msg;
    }
    toast.classList.add("show");
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastTimeout = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }
}
