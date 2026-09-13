use crate::config::AppConfig;

fn strip_comments_and_empty_lines(raw: &str) -> String {
    raw.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with("//"))
        .collect::<Vec<&str>>()
        .join("\n")
}

pub fn build_injection_bundle(config: &AppConfig) -> String {
    let bootstrap_js = strip_comments_and_empty_lines(include_str!("scripts/bootstrap.js"));
    let storage_persist_js = strip_comments_and_empty_lines(include_str!("scripts/storage-persist.js"));
    let sw_recovery_js = strip_comments_and_empty_lines(include_str!("scripts/sw-recovery.js"));
    let connection_js = strip_comments_and_empty_lines(include_str!("scripts/connection-watchdog.js"));
    let theme_js = strip_comments_and_empty_lines(include_str!("scripts/theme-control.js"));
    let blur_js = strip_comments_and_empty_lines(include_str!("scripts/privacy-blur.js"));
    let nav_js = strip_comments_and_empty_lines(include_str!("scripts/nav-settings.js"));
    let collapse_js = strip_comments_and_empty_lines(include_str!("scripts/chat-list-collapse.js"));

    let config_json = serde_json::json!({
        "colorScheme": config.appearance.theme,
        "blurLevel": config.privacy.blur_radius,
        "chatListCollapsed": config.appearance.chat_list_collapsed,
        "privacy": config.privacy,
        "customCss": config.appearance.custom_css,
        "customWallpaperUrl": config.appearance.custom_wallpaper_url,
        "customWallpaperOpacity": config.appearance.custom_wallpaper_opacity,
    });

    format!(
        r#"window.__whatspulseConfig={config_json};
{bootstrap_js}
{storage_persist_js}
{sw_recovery_js}
{connection_js}
{theme_js}
{blur_js}
{nav_js}
{collapse_js}"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_comments() {
        let code = "// comment 1\n  \nvar x = 1;\n// comment 2\nvar y = 2;";
        let cleaned = strip_comments_and_empty_lines(code);
        assert_eq!(cleaned, "var x = 1;\nvar y = 2;");
    }

    #[test]
    fn test_build_injection_bundle() {
        let cfg = AppConfig::default();
        let bundle = build_injection_bundle(&cfg);
        assert!(bundle.contains("window.__whatspulseConfig="));
        assert!(bundle.contains("window.__whatspulse"));
    }
}
