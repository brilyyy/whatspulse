use crate::config::{AppConfig, SharedConfig};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn get_settings(config: State<'_, SharedConfig>) -> AppConfig {
    config.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    config: State<'_, SharedConfig>,
    new_config: AppConfig,
) -> Result<(), String> {
    {
        let mut cfg = config.lock().unwrap();
        *cfg = new_config.clone();
        cfg.save();
    }

    // Apply live changes to the main webview if active
    if let Some(main_win) = app.get_webview_window("main") {
        let theme = &new_config.appearance.theme;
        let blur = new_config.privacy.blur_radius;
        let zoom = new_config.appearance.zoom_factor;
        let privacy_json =
            serde_json::to_string(&new_config.privacy).unwrap_or_else(|_| "{}".to_string());
        let custom_css_json = serde_json::to_string(&new_config.appearance.custom_css)
            .unwrap_or_else(|_| "\"\"".to_string());
        let wp_url_json = serde_json::to_string(&new_config.appearance.custom_wallpaper_url)
            .unwrap_or_else(|_| "\"\"".to_string());
        let wp_opacity = new_config.appearance.custom_wallpaper_opacity;
        let js = format!(
            r#"
            if (typeof window.__whatspulseSetTheme === 'function') {{
                window.__whatspulseSetTheme('{theme}');
            }}
            if (typeof window.__whatspulseSetCustomCss === 'function') {{
                window.__whatspulseSetCustomCss({custom_css_json});
            }}
            if (typeof window.__whatspulseSetWallpaper === 'function') {{
                window.__whatspulseSetWallpaper({wp_url_json}, {wp_opacity});
            }}
            if (typeof window.__whatspulseSetPrivacy === 'function') {{
                window.__whatspulseSetPrivacy({privacy_json});
            }} else if (typeof window.__whatspulseSetBlur === 'function') {{
                window.__whatspulseSetBlur({blur});
            }}
            try {{
                document.body.style.zoom = '{zoom}';
            }} catch(e) {{}}
            "#
        );
        let _ = main_win.eval(&js);
    }

    Ok(())
}
