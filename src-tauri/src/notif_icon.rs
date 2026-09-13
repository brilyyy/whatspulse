use crate::config::NotificationConfig;
use std::fs;
use std::path::PathBuf;

pub fn generate_emoji_svg(emoji: &str) -> String {
    let clean_emoji = if emoji.trim().is_empty() { "💬" } else { emoji.trim() };
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="wp_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#25D366" />
      <stop offset="100%" stop-color="#075E54" />
    </linearGradient>
    <filter id="wp_shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#wp_grad)" filter="url(#wp_shadow)" />
  <text x="50%" y="54%" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="62" text-anchor="middle" dominant-baseline="central">{}</text>
</svg>"##,
        clean_emoji
    )
}

pub fn get_preset_svg(preset: &str) -> String {
    match preset {
        "bubble_pulse" => {
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="pulse_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="100%" stop-color="#4facfe" />
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="#12121a" />
  <circle cx="64" cy="64" r="44" fill="none" stroke="url(#pulse_grad)" stroke-width="4" opacity="0.6"/>
  <path d="M42 46h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H58l-14 11V84h-2a8 8 0 0 1-8-8V54a8 8 0 0 1 8-8z" fill="url(#pulse_grad)"/>
  <path d="M48 65h8l4-8 8 16 6-10 4 2h10" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"##.to_string()
        }
        "envelope" => {
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="env_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff9900" />
      <stop offset="100%" stop-color="#e65100" />
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="#1e1e24" />
  <rect x="28" y="40" width="72" height="48" rx="6" fill="url(#env_grad)" />
  <path d="M30 42l34 26 34-26" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"##.to_string()
        }
        _ /* "bubble_dots" */ => {
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bubble_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#25D366" />
      <stop offset="100%" stop-color="#128C7E" />
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="#111b21" />
  <path d="M36 42h56a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H60l-16 12V84h-8a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8z" fill="url(#bubble_grad)"/>
  <circle cx="50" cy="63" r="5" fill="#ffffff"/>
  <circle cx="64" cy="63" r="5" fill="#ffffff"/>
  <circle cx="78" cy="63" r="5" fill="#ffffff"/>
</svg>"##.to_string()
        }
    }
}

pub fn get_icon_cache_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(std::env::temp_dir);
    path.push("whatspulse");
    fs::create_dir_all(&path).ok();
    path.push("notif_icon.svg");
    path
}

pub fn resolve_notification_icon(config: &NotificationConfig) -> Option<String> {
    match config.icon_mode.as_str() {
        "app" => None,
        "custom_file" => {
            if let Some(ref path_str) = config.custom_icon_path {
                let path = PathBuf::from(path_str);
                if path.exists() {
                    return Some(path.to_string_lossy().to_string());
                }
            }
            // Fallback to emoji SVG if custom file path invalid
            let svg = generate_emoji_svg(&config.icon_emoji);
            let cache_path = get_icon_cache_path();
            if fs::write(&cache_path, svg).is_ok() {
                Some(cache_path.to_string_lossy().to_string())
            } else {
                None
            }
        }
        "svg_preset" => {
            let svg = get_preset_svg(&config.svg_preset);
            let cache_path = get_icon_cache_path();
            if fs::write(&cache_path, svg).is_ok() {
                Some(cache_path.to_string_lossy().to_string())
            } else {
                None
            }
        }
        _ /* "emoji" or default */ => {
            let svg = generate_emoji_svg(&config.icon_emoji);
            let cache_path = get_icon_cache_path();
            if fs::write(&cache_path, svg).is_ok() {
                Some(cache_path.to_string_lossy().to_string())
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_emoji_svg() {
        let svg = generate_emoji_svg("💬");
        assert!(svg.contains("<svg"));
        assert!(svg.contains("💬"));
        assert!(svg.contains("</svg>"));

        let empty_svg = generate_emoji_svg("");
        assert!(empty_svg.contains("💬"));
    }

    #[test]
    fn test_presets_svg() {
        let dots = get_preset_svg("bubble_dots");
        assert!(dots.contains("<svg"));

        let pulse = get_preset_svg("bubble_pulse");
        assert!(pulse.contains("pulse_grad"));

        let envelope = get_preset_svg("envelope");
        assert!(envelope.contains("env_grad"));
    }

    #[test]
    fn test_resolve_notification_icon() {
        let mut cfg = NotificationConfig::default();
        cfg.icon_mode = "emoji".to_string();
        cfg.icon_emoji = "🔥".to_string();

        let icon_path = resolve_notification_icon(&cfg);
        assert!(icon_path.is_some());
        let path = PathBuf::from(icon_path.unwrap());
        assert!(path.exists());
        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("🔥"));

        cfg.icon_mode = "app".to_string();
        assert_eq!(resolve_notification_icon(&cfg), None);
    }
}
