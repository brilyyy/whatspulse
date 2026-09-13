export interface WindowConfig {
  start_minimized: boolean;
  close_to_tray: boolean;
  autostart?: boolean;
  width: number;
  height: number;
}

export interface TrayConfig {
  show_tray: boolean;
  left_click_toggles: boolean;
  unread_badge: boolean;
}

export interface AppearanceConfig {
  theme: string;
  zoom_factor: number;
  chat_list_collapsed: boolean;
  custom_css?: string;
  custom_wallpaper_url?: string;
  custom_wallpaper_opacity?: number;
}

export interface PrivacyConfig {
  enabled: boolean;
  blur_messages: boolean;
  blur_last_messages: boolean;
  blur_media: boolean;
  blur_media_gallery: boolean;
  blur_text_input: boolean;
  blur_profile_pictures: boolean;
  blur_contact_names: boolean;
  no_transition_delay: boolean;
  unblur_on_app_hover: boolean;
  blur_on_idle: boolean;
  idle_timeout_seconds: number;
  blur_radius: number;
  message_blur_level?: number;
}

export interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  dnd: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  icon_mode?: string;
  icon_emoji?: string;
  svg_preset?: string;
  custom_icon_path?: string | null;
}

export interface AppConfig {
  window: WindowConfig;
  tray: TrayConfig;
  appearance: AppearanceConfig;
  privacy: PrivacyConfig;
  notifications: NotificationConfig;
  user_agent: string | null;
  check_updates_on_start?: boolean;
}

export interface UpdateResponse {
  has_update: boolean;
  latest_version?: string;
  current_version: string;
  release_url?: string;
  body?: string;
}

declare global {
  interface Window {
    __whatspulseOnShow?: (tab?: string) => void;
    __whatspulseOpenDirectChat?: () => void;
  }
}

