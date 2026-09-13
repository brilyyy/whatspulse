use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Timelike;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub start_minimized: bool,
    pub close_to_tray: bool,
    #[serde(default)]
    pub autostart: bool,
    pub width: f64,
    pub height: f64,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            start_minimized: false,
            close_to_tray: true,
            autostart: false,
            width: 1050.0,
            height: 750.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrayConfig {
    pub show_tray: bool,
    pub left_click_toggles: bool,
    pub unread_badge: bool,
}

impl Default for TrayConfig {
    fn default() -> Self {
        Self {
            show_tray: true,
            left_click_toggles: true,
            unread_badge: true,
        }
    }
}

fn default_wallpaper_opacity() -> f64 {
    0.15
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceConfig {
    pub theme: String, // "system", "light", "dark", "amoled", "catppuccin", "nord", "dracula", "tokyonight", "gruvbox", "cyberpunk"
    pub zoom_factor: f64,
    pub chat_list_collapsed: bool,
    #[serde(default)]
    pub custom_css: String,
    #[serde(default)]
    pub custom_wallpaper_url: String,
    #[serde(default = "default_wallpaper_opacity")]
    pub custom_wallpaper_opacity: f64,
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            zoom_factor: 1.0,
            chat_list_collapsed: false,
            custom_css: String::new(),
            custom_wallpaper_url: String::new(),
            custom_wallpaper_opacity: default_wallpaper_opacity(),
        }
    }
}

fn default_true() -> bool {
    true
}

fn default_idle_timeout() -> u32 {
    120
}

fn default_blur_radius() -> u32 {
    8
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub blur_messages: bool,
    #[serde(default = "default_true")]
    pub blur_last_messages: bool,
    #[serde(default = "default_true")]
    pub blur_media: bool,
    #[serde(default = "default_true")]
    pub blur_media_gallery: bool,
    #[serde(default = "default_true")]
    pub blur_text_input: bool,
    #[serde(default)]
    pub blur_profile_pictures: bool,
    #[serde(default)]
    pub blur_contact_names: bool,
    #[serde(default)]
    pub no_transition_delay: bool,
    #[serde(default)]
    pub unblur_on_app_hover: bool,
    #[serde(default)]
    pub blur_on_idle: bool,
    #[serde(default = "default_idle_timeout")]
    pub idle_timeout_seconds: u32,
    #[serde(default = "default_blur_radius")]
    pub blur_radius: u32,
    #[serde(default)]
    pub message_blur_level: u32,
}

impl Default for PrivacyConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            blur_messages: true,
            blur_last_messages: true,
            blur_media: true,
            blur_media_gallery: true,
            blur_text_input: true,
            blur_profile_pictures: false,
            blur_contact_names: false,
            no_transition_delay: false,
            unblur_on_app_hover: false,
            blur_on_idle: false,
            idle_timeout_seconds: 120,
            blur_radius: 8,
            message_blur_level: 2,
        }
    }
}

fn default_quiet_start() -> String {
    "22:00".to_string()
}

fn default_quiet_end() -> String {
    "07:00".to_string()
}

fn default_notif_icon_mode() -> String {
    "emoji".to_string()
}

fn default_notif_emoji() -> String {
    "💬".to_string()
}

fn default_notif_svg_preset() -> String {
    "bubble_dots".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub enabled: bool,
    pub sound: bool,
    pub dnd: bool,
    #[serde(default)]
    pub quiet_hours_enabled: bool,
    #[serde(default = "default_quiet_start")]
    pub quiet_hours_start: String,
    #[serde(default = "default_quiet_end")]
    pub quiet_hours_end: String,
    #[serde(default = "default_notif_icon_mode")]
    pub icon_mode: String, // "emoji" (default), "svg_preset", "custom_file", "app"
    #[serde(default = "default_notif_emoji")]
    pub icon_emoji: String, // default: "💬"
    #[serde(default = "default_notif_svg_preset")]
    pub svg_preset: String, // "bubble_dots", "bubble_pulse", "envelope"
    #[serde(default)]
    pub custom_icon_path: Option<String>,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            sound: true,
            dnd: false,
            quiet_hours_enabled: false,
            quiet_hours_start: default_quiet_start(),
            quiet_hours_end: default_quiet_end(),
            icon_mode: default_notif_icon_mode(),
            icon_emoji: default_notif_emoji(),
            svg_preset: default_notif_svg_preset(),
            custom_icon_path: None,
        }
    }
}

pub fn is_time_in_range(current_minutes: u32, start_minutes: u32, end_minutes: u32) -> bool {
    if start_minutes <= end_minutes {
        current_minutes >= start_minutes && current_minutes < end_minutes
    } else {
        current_minutes >= start_minutes || current_minutes < end_minutes
    }
}

pub fn parse_hh_mm(s: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() == 2 {
        let h = parts[0].trim().parse::<u32>().ok()?;
        let m = parts[1].trim().parse::<u32>().ok()?;
        if h < 24 && m < 60 {
            return Some((h, m));
        }
    }
    None
}

impl NotificationConfig {
    pub fn is_in_quiet_hours(&self) -> bool {
        if !self.quiet_hours_enabled {
            return false;
        }
        let now = chrono::Local::now().time();
        let (start_h, start_m) = parse_hh_mm(&self.quiet_hours_start).unwrap_or((22, 0));
        let (end_h, end_m) = parse_hh_mm(&self.quiet_hours_end).unwrap_or((7, 0));

        let current_minutes = now.hour() * 60 + now.minute();
        let start_minutes = start_h * 60 + start_m;
        let end_minutes = end_h * 60 + end_m;

        is_time_in_range(current_minutes, start_minutes, end_minutes)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockConfig {
    pub enabled: bool,
    pub hash: Option<String>,
    pub salt: Option<String>,
    pub lock_on_start: bool,
    pub lock_on_hide: bool,
    pub idle_minutes: u32,
}

impl Default for LockConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            hash: None,
            salt: None,
            lock_on_start: true,
            lock_on_hide: false,
            idle_minutes: 15,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadsConfig {
    pub directory: Option<String>,
    pub ask_where_to_save: bool,
}

impl Default for DownloadsConfig {
    fn default() -> Self {
        Self {
            directory: None,
            ask_where_to_save: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub window: WindowConfig,
    pub tray: TrayConfig,
    pub appearance: AppearanceConfig,
    pub privacy: PrivacyConfig,
    pub notifications: NotificationConfig,
    pub lock: LockConfig,
    pub downloads: DownloadsConfig,
    pub user_agent: Option<String>,
    #[serde(default = "default_true")]
    pub check_updates_on_start: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            window: WindowConfig::default(),
            tray: TrayConfig::default(),
            appearance: AppearanceConfig::default(),
            privacy: PrivacyConfig::default(),
            notifications: NotificationConfig::default(),
            lock: LockConfig::default(),
            downloads: DownloadsConfig::default(),
            user_agent: None,
            check_updates_on_start: true,
        }
    }
}

pub type SharedConfig = Arc<Mutex<AppConfig>>;

impl AppConfig {
    pub fn config_path() -> PathBuf {
        let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("whatspulse");
        fs::create_dir_all(&path).ok();
        path.push("config.json");
        path
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&data) {
                return config;
            }
        }
        // Fallback: check legacy whatsie config
        let mut legacy_path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        legacy_path.push("whatsie");
        legacy_path.push("config.json");
        if let Ok(data) = fs::read_to_string(&legacy_path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&data) {
                config.save();
                return config;
            }
        }
        let default_config = Self::default();
        default_config.save();
        default_config
    }

    pub fn save(&self) {
        let path = Self::config_path();
        // Safe update backup: create config.json.bak before saving
        if path.exists() {
            let mut bak_path = path.clone();
            bak_path.set_extension("json.bak");
            let _ = fs::copy(&path, &bak_path);
        }
        if let Ok(serialized) = serde_json::to_string_pretty(self) {
            let _ = fs::write(path, serialized);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_serialization() {
        let mut config = AppConfig::default();
        config.window.autostart = true;
        config.notifications.quiet_hours_enabled = true;
        config.notifications.quiet_hours_start = "23:00".to_string();
        config.notifications.quiet_hours_end = "06:30".to_string();

        config.appearance.custom_css = "body { background: #000; }".to_string();
        config.appearance.custom_wallpaper_url = "https://example.com/bg.jpg".to_string();
        config.notifications.icon_mode = "emoji".to_string();
        config.notifications.icon_emoji = "💬".to_string();
        config.check_updates_on_start = true;

        let serialized = serde_json::to_string(&config).expect("serialize config");
        let deserialized: AppConfig = serde_json::from_str(&serialized).expect("deserialize config");
        assert_eq!(config.window.width, deserialized.window.width);
        assert_eq!(deserialized.window.autostart, true);
        assert_eq!(deserialized.notifications.quiet_hours_enabled, true);
        assert_eq!(deserialized.notifications.quiet_hours_start, "23:00");
        assert_eq!(deserialized.notifications.quiet_hours_end, "06:30");
        assert_eq!(config.appearance.theme, deserialized.appearance.theme);
        assert_eq!(config.appearance.custom_css, deserialized.appearance.custom_css);
        assert_eq!(config.appearance.custom_wallpaper_url, deserialized.appearance.custom_wallpaper_url);
        assert_eq!(config.notifications.icon_mode, deserialized.notifications.icon_mode);
        assert_eq!(config.notifications.icon_emoji, deserialized.notifications.icon_emoji);
        assert_eq!(deserialized.check_updates_on_start, true);
        assert_eq!(config.privacy.message_blur_level, deserialized.privacy.message_blur_level);
        assert_eq!(config.tray.show_tray, deserialized.tray.show_tray);
    }

    #[test]
    fn test_quiet_hours_range_logic() {
        // Normal range: 13:00 (780m) to 15:00 (900m)
        assert!(is_time_in_range(800, 780, 900)); // 13:20 -> in range
        assert!(!is_time_in_range(700, 780, 900)); // 11:40 -> out of range
        assert!(!is_time_in_range(950, 780, 900)); // 15:50 -> out of range

        // Overnight range: 22:00 (1320m) to 07:00 (420m)
        assert!(is_time_in_range(1350, 1320, 420)); // 22:30 -> in range
        assert!(is_time_in_range(1439, 1320, 420)); // 23:59 -> in range
        assert!(is_time_in_range(0, 1320, 420));    // 00:00 -> in range
        assert!(is_time_in_range(300, 1320, 420));  // 05:00 -> in range
        assert!(!is_time_in_range(420, 1320, 420)); // 07:00 -> end boundary (out)
        assert!(!is_time_in_range(720, 1320, 420)); // 12:00 -> out of range
        assert!(!is_time_in_range(1319, 1320, 420)); // 21:59 -> out of range
    }
}
