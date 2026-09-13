import type { AppConfig, PrivacyConfig } from "../types/config";

export function formatIdleTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  return mins === 1 ? "1 min" : `${mins} mins`;
}

export function updateLiveSimulator(privacy: PrivacyConfig): void {
  if (!privacy) return;
  const frame = document.getElementById("sim-frame");
  if (!frame) return;

  const isMaster = privacy.enabled !== false;
  const radius = privacy.blur_radius || 8;

  frame.style.setProperty("--sim-blur-radius", `${radius}px`);

  if (!isMaster) {
    frame.classList.add("sim-all-disabled");
  } else {
    frame.classList.remove("sim-all-disabled");
  }

  if (privacy.no_transition_delay) {
    frame.classList.add("sim-no-delay");
  } else {
    frame.classList.remove("sim-no-delay");
  }

  if (privacy.unblur_on_app_hover) {
    frame.classList.add("sim-app-hover-active");
  } else {
    frame.classList.remove("sim-app-hover-active");
  }

  const toggleBlurClass = (id: string, shouldBlur: boolean) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isMaster && shouldBlur) {
      el.classList.add("sim-blur-target");
    } else {
      el.classList.remove("sim-blur-target");
    }
  };

  toggleBlurClass("sim-avatar-wrap", privacy.blur_profile_pictures === true);
  toggleBlurClass("sim-name", privacy.blur_contact_names === true);
  toggleBlurClass("sim-message-text", privacy.blur_messages !== false);
  toggleBlurClass("sim-media-box", privacy.blur_media !== false);
  toggleBlurClass("sim-input-box", privacy.blur_text_input !== false);
}

export function updatePrivacyUI(privacy: PrivacyConfig): void {
  if (!privacy) return;

  const masterToggle = document.getElementById("privacy-master-toggle") as HTMLInputElement | null;
  const masterStatus = document.getElementById("privacy-master-status");
  const masterCard = document.querySelector(".master-privacy-card");

  const isEnabled = privacy.enabled !== false;
  if (masterToggle) masterToggle.checked = isEnabled;
  if (masterStatus) {
    masterStatus.textContent = isEnabled ? "Active Protection" : "Disabled";
    masterStatus.className = isEnabled ? "status-pill pill-active" : "status-pill pill-disabled";
  }
  if (masterCard) {
    if (isEnabled) {
      masterCard.classList.remove("disabled");
    } else {
      masterCard.classList.add("disabled");
    }
  }

  const setCheck = (id: string, val: boolean) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = val;
  };

  setCheck("blur-messages", privacy.blur_messages !== false);
  setCheck("blur-last-messages", privacy.blur_last_messages !== false);
  setCheck("blur-media", privacy.blur_media !== false);
  setCheck("blur-media-gallery", privacy.blur_media_gallery !== false);
  setCheck("blur-text-input", privacy.blur_text_input !== false);
  setCheck("blur-profile-pictures", privacy.blur_profile_pictures === true);
  setCheck("blur-contact-names", privacy.blur_contact_names === true);
  setCheck("no-transition-delay", privacy.no_transition_delay === true);
  setCheck("unblur-on-app-hover", privacy.unblur_on_app_hover === true);
  setCheck("blur-on-idle", privacy.blur_on_idle === true);

  const idleGroup = document.getElementById("idle-timeout-group");
  const idleSlider = document.getElementById("idle-timeout-slider") as HTMLInputElement | null;
  const idleDisplay = document.getElementById("idle-timeout-display");
  const timeout = privacy.idle_timeout_seconds || 120;
  if (idleGroup) idleGroup.style.display = privacy.blur_on_idle ? "block" : "none";
  if (idleSlider) idleSlider.value = String(timeout);
  if (idleDisplay) idleDisplay.textContent = formatIdleTime(timeout);

  const radius = privacy.blur_radius || 8;
  const radiusSlider = document.getElementById("blur-radius-slider") as HTMLInputElement | null;
  const radiusDisplay = document.getElementById("blur-radius-display");
  if (radiusSlider) radiusSlider.value = String(radius);
  if (radiusDisplay) radiusDisplay.textContent = `${radius}px`;

  const radiusPills = document.querySelectorAll(".blur-radius-pill");
  radiusPills.forEach((p) => {
    const r = parseInt(p.getAttribute("data-radius") || "8", 10);
    if (r === radius) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  updateLiveSimulator(privacy);
}

export function initPrivacy(
  config: AppConfig,
  saveConfig: () => Promise<void>
): void {
  updatePrivacyUI(config.privacy);

  // Master privacy toggle
  const masterToggle = document.getElementById("privacy-master-toggle") as HTMLInputElement | null;
  masterToggle?.addEventListener("change", () => {
    config.privacy.enabled = masterToggle.checked;
    updatePrivacyUI(config.privacy);
    saveConfig();
  });

  // Granular privacy checkboxes
  const privacyCheckboxKeys: { id: string; key: keyof PrivacyConfig }[] = [
    { id: "blur-messages", key: "blur_messages" },
    { id: "blur-last-messages", key: "blur_last_messages" },
    { id: "blur-media", key: "blur_media" },
    { id: "blur-media-gallery", key: "blur_media_gallery" },
    { id: "blur-text-input", key: "blur_text_input" },
    { id: "blur-profile-pictures", key: "blur_profile_pictures" },
    { id: "blur-contact-names", key: "blur_contact_names" },
    { id: "no-transition-delay", key: "no_transition_delay" },
    { id: "unblur-on-app-hover", key: "unblur_on_app_hover" },
    { id: "blur-on-idle", key: "blur_on_idle" },
  ];

  privacyCheckboxKeys.forEach(({ id, key }) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.addEventListener("change", () => {
      const idleGroup = document.getElementById("idle-timeout-group");
      if (id === "blur-on-idle" && idleGroup) {
        idleGroup.style.display = el.checked ? "block" : "none";
      }
      (config.privacy as unknown as Record<string, unknown>)[key] = el.checked;
      saveConfig();
      updateLiveSimulator(config.privacy);
    });
  });

  // Idle timeout slider & display
  const idleTimeoutSlider = document.getElementById("idle-timeout-slider") as HTMLInputElement | null;
  const idleTimeoutDisplay = document.getElementById("idle-timeout-display");
  idleTimeoutSlider?.addEventListener("input", () => {
    const val = parseInt(idleTimeoutSlider.value, 10);
    if (idleTimeoutDisplay) idleTimeoutDisplay.textContent = formatIdleTime(val);
    config.privacy.idle_timeout_seconds = val;
  });
  idleTimeoutSlider?.addEventListener("change", () => {
    saveConfig();
  });

  // Blur radius slider & preset pills
  const blurRadiusSlider = document.getElementById("blur-radius-slider") as HTMLInputElement | null;
  const blurRadiusDisplay = document.getElementById("blur-radius-display");
  const radiusPills = document.querySelectorAll(".blur-radius-pill");

  const setRadiusValue = (radius: number) => {
    config.privacy.blur_radius = radius;
    if (blurRadiusSlider) blurRadiusSlider.value = String(radius);
    if (blurRadiusDisplay) blurRadiusDisplay.textContent = `${radius}px`;
    radiusPills.forEach((p) => {
      const r = parseInt(p.getAttribute("data-radius") || "8", 10);
      if (r === radius) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
    updateLiveSimulator(config.privacy);
  };

  blurRadiusSlider?.addEventListener("input", () => {
    setRadiusValue(parseInt(blurRadiusSlider.value, 10));
  });
  blurRadiusSlider?.addEventListener("change", () => {
    saveConfig();
  });

  radiusPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const radiusVal = parseInt(pill.getAttribute("data-radius") || "8", 10);
      setRadiusValue(radiusVal);
      saveConfig();
    });
  });
}
