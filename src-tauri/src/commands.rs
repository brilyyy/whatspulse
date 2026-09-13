use crate::config::{AppConfig, SharedConfig};
use crate::lock::{LockManager, SharedLockManager};
use crate::tray::update_tray_badge;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn client_log(message: String) {
    println!("[WhatsPulse Web] {message}");
}

#[tauri::command]
pub fn script_failed(name: String, message: String) {
    eprintln!("[WhatsPulse Web Script Failure] {name}: {message}");
}

#[tauri::command]
pub fn connection_changed(up: bool) {
    println!(
        "[WhatsPulse Web] Connection status: {}",
        if up { "Online" } else { "Offline" }
    );
}

#[tauri::command]
pub fn open_settings(app: AppHandle) {
    if let Some(settings_win) = app.get_webview_window("settings") {
        let _ = settings_win
            .eval("if (window.__whatspulseOnShow) window.__whatspulseOnShow('general');");
        let _ = settings_win.show();
        let _ = settings_win.set_focus();
    }
}

#[tauri::command]
pub fn close_settings(app: AppHandle) {
    if let Some(settings_win) = app.get_webview_window("settings") {
        let _ = settings_win.hide();
    }
}

#[tauri::command]
pub fn retry_page(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.eval("window.location.reload();");
    }
}

#[tauri::command]
pub fn update_unread_count(app: AppHandle, count: u32) {
    update_tray_badge(&app, count);
}

#[tauri::command]
pub fn show_notification(
    app: AppHandle,
    config: State<'_, SharedConfig>,
    id: Option<String>,
    title: String,
    body: String,
    icon: Option<String>,
    tag: Option<String>,
) -> Result<(), String> {
    let (notif_enabled, custom_icon) = {
        let cfg = config.lock().unwrap();
        if !cfg.notifications.enabled
            || cfg.notifications.dnd
            || cfg.notifications.is_in_quiet_hours()
        {
            (false, None)
        } else {
            (
                true,
                crate::notif_icon::resolve_notification_icon(&cfg.notifications),
            )
        }
    };
    if !notif_enabled {
        return Ok(());
    }

    let mut notif = notify_rust::Notification::new();
    notif.appname("WhatsPulse");
    notif.summary(&title);
    notif.body(&body);
    if let Some(ref icon_path) = custom_icon {
        notif.icon(icon_path);
    } else if let Some(ref icon_path) = icon {
        notif.icon(icon_path);
    }
    notif.action("default", "Open");

    let handle = notif.show().map_err(|e| e.to_string())?;

    let app_clone = app.clone();
    let id_clone = id.unwrap_or_default();
    let tag_clone = tag.unwrap_or_default();
    let title_clone = title.clone();

    std::thread::spawn(move || {
        handle.wait_for_action(move |action| {
            if action == "default" {
                if let Some(main_win) = app_clone.get_webview_window("main") {
                    let _ = main_win.unminimize();
                    let _ = main_win.show();
                    let _ = main_win.set_focus();

                    let safe_id = serde_json::to_string(&id_clone).unwrap_or_default();
                    let safe_tag = serde_json::to_string(&tag_clone).unwrap_or_default();
                    let safe_title = serde_json::to_string(&title_clone).unwrap_or_default();
                    let js = format!(
                        "if (window.__whatspulseTriggerNotificationClick) window.__whatspulseTriggerNotificationClick({safe_id}, {safe_tag}, {safe_title});"
                    );
                    let _ = main_win.eval(&js);
                }
            }
        });
    });

    Ok(())
}

#[tauri::command]
pub fn test_notification(config: State<'_, SharedConfig>) -> Result<(), String> {
    let custom_icon = {
        let cfg = config.lock().unwrap();
        crate::notif_icon::resolve_notification_icon(&cfg.notifications)
    };
    let mut notif = notify_rust::Notification::new();
    notif.appname("WhatsPulse");
    notif.summary("WhatsPulse Preview");
    notif.body("Notification icon and alerts are working! 💬");
    if let Some(ref icon_path) = custom_icon {
        notif.icon(icon_path);
    }
    let _ = notif.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_about(app: AppHandle) {
    if let Some(about_win) = app.get_webview_window("about") {
        let _ = about_win.show();
        let _ = about_win.set_focus();
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub body: Option<String>,
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    use tauri_plugin_updater::UpdaterExt;
    let current_version = app.package_info().version.to_string();
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => Ok(UpdateInfo {
                available: true,
                current_version,
                latest_version: Some(update.version.clone()),
                body: update.body.clone(),
            }),
            Ok(None) => Ok(UpdateInfo {
                available: false,
                current_version,
                latest_version: None,
                body: None,
            }),
            Err(e) => Err(format!("Check update failed: {}", e)),
        },
        Err(e) => Err(format!("Updater not available: {}", e)),
    }
}

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

#[tauri::command]
pub fn is_locked(lock_state: State<'_, SharedLockManager>) -> bool {
    lock_state.lock().unwrap().is_locked
}

#[tauri::command]
pub fn verify_passcode(
    app: AppHandle,
    config: State<'_, SharedConfig>,
    lock_state: State<'_, SharedLockManager>,
    passcode: String,
) -> bool {
    let cfg = config.lock().unwrap();
    if let Some(ref hash) = cfg.lock.hash {
        let valid = LockManager::verify_passcode(&passcode, hash);
        if valid {
            let mut state = lock_state.lock().unwrap();
            state.is_locked = false;
            state.record_activity();

            if let Some(main_win) = app.get_webview_window("main") {
                let _ = main_win.show();
                let _ = main_win.set_focus();
            }
            if let Some(settings_win) = app.get_webview_window("settings") {
                let _ = settings_win.hide();
            }
        }
        valid
    } else {
        true
    }
}

#[tauri::command]
pub fn set_passcode(config: State<'_, SharedConfig>, passcode: String) -> Result<(), String> {
    let hash = LockManager::hash_passcode(&passcode)?;
    let mut cfg = config.lock().unwrap();
    cfg.lock.enabled = true;
    cfg.lock.hash = Some(hash);
    cfg.save();
    Ok(())
}

#[tauri::command]
pub fn remove_passcode(
    config: State<'_, SharedConfig>,
    current_passcode: String,
) -> Result<(), String> {
    let mut cfg = config.lock().unwrap();
    if let Some(ref hash) = cfg.lock.hash {
        if !LockManager::verify_passcode(&current_passcode, hash) {
            return Err("Invalid passcode".to_string());
        }
    }
    cfg.lock.enabled = false;
    cfg.lock.hash = None;
    cfg.save();
    Ok(())
}

pub fn clean_phone_number(input: &str) -> String {
    let mut digits: String = input.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.starts_with('0') {
        digits = format!("62{}", &digits[1..]);
    }
    digits
}

fn urlencode_str(input: &str) -> String {
    let mut encoded = String::new();
    for byte in input.bytes() {
        match byte {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            b' ' => encoded.push_str("%20"),
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

#[tauri::command]
pub fn direct_chat(app: AppHandle, phone: String, message: Option<String>) -> Result<(), String> {
    let clean = clean_phone_number(&phone);
    if clean.is_empty() {
        return Err("Nomor telepon tidak valid".to_string());
    }

    if let Some(main_win) = app.get_webview_window("main") {
        let msg_encoded = urlencode_str(message.as_deref().unwrap_or(""));
        let url = format!("https://web.whatsapp.com/send?phone={clean}&text={msg_encoded}");
        let js = format!("window.location.assign('{url}');");
        let _ = main_win.eval(&js);
        let _ = main_win.show();
        let _ = main_win.set_focus();

        if let Some(settings_win) = app.get_webview_window("settings") {
            let _ = settings_win.hide();
        }
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub fn open_direct_chat(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.unminimize();
        let _ = main_win.show();
        let _ = main_win.set_focus();
        let _ = main_win
            .eval("if (window.__whatspulseOpenDirectChat) window.__whatspulseOpenDirectChat();");
    } else if let Some(settings_win) = app.get_webview_window("settings") {
        let _ = settings_win
            .eval("if (window.__whatspulseOpenDirectChat) window.__whatspulseOpenDirectChat();");
        let _ = settings_win.show();
        let _ = settings_win.set_focus();
    }
}

#[tauri::command]
pub fn trigger_panic_mode(
    app: AppHandle,
    lock_state: State<'_, SharedLockManager>,
    config: State<'_, SharedConfig>,
) -> Result<(), String> {
    // 1. Hide both windows immediately
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
        let js = r#"
        (function() {
            var veil = document.getElementById('whatspulse-privacy-veil');
            if (veil) { veil.style.display = 'block'; }
            var audios = document.querySelectorAll('audio, video');
            for (var i = 0; i < audios.length; i++) {
                try { audios[i].pause(); audios[i].muted = true; } catch(e) {}
            }
        })();
        "#;
        let _ = main_win.eval(js);
    }
    if let Some(settings_win) = app.get_webview_window("settings") {
        let _ = settings_win.hide();
    }

    // 2. Lock state immediately if passcode is enabled
    let cfg = config.lock().unwrap();
    if cfg.lock.enabled {
        let mut state = lock_state.lock().unwrap();
        state.is_locked = true;
    }

    Ok(())
}

fn autostart_desktop_path() -> Option<std::path::PathBuf> {
    let mut path = dirs::config_dir()?;
    path.push("autostart");
    std::fs::create_dir_all(&path).ok()?;
    path.push("whatspulse.desktop");
    Some(path)
}

#[tauri::command]
pub fn get_autostart_status(config: State<'_, SharedConfig>) -> bool {
    let cfg = config.lock().unwrap();
    if let Some(path) = autostart_desktop_path() {
        path.exists() || cfg.window.autostart
    } else {
        cfg.window.autostart
    }
}

#[tauri::command]
pub fn set_autostart(config: State<'_, SharedConfig>, enable: bool) -> Result<bool, String> {
    {
        let mut cfg = config.lock().unwrap();
        cfg.window.autostart = enable;
        cfg.save();
    }

    if let Some(desktop_path) = autostart_desktop_path() {
        if enable {
            let current_exe =
                std::env::current_exe().unwrap_or_else(|_| std::path::PathBuf::from("whatspulse"));
            let exe_str = current_exe.to_string_lossy();
            let content = format!(
                "[Desktop Entry]\n\
                Type=Application\n\
                Name=WhatsPulse\n\
                Comment=Modern & lightweight WhatsApp Web desktop client\n\
                Exec=\"{}\" --minimized\n\
                Icon=whatspulse\n\
                Terminal=false\n\
                StartupNotify=false\n\
                X-GNOME-Autostart-enabled=true\n",
                exe_str
            );
            std::fs::write(&desktop_path, content).map_err(|e| e.to_string())?;
        } else if desktop_path.exists() {
            let _ = std::fs::remove_file(&desktop_path);
        }
        Ok(enable)
    } else {
        Err("Could not determine autostart directory".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_phone_number() {
        assert_eq!(clean_phone_number("081234567890"), "6281234567890");
        assert_eq!(clean_phone_number("+62 812-3456-7890"), "6281234567890");
        assert_eq!(clean_phone_number("6281234567890"), "6281234567890");
        assert_eq!(clean_phone_number("(021) 123456"), "6221123456");
    }

    #[test]
    fn test_urlencode_str() {
        assert_eq!(urlencode_str("Halo WhatsPulse!"), "Halo%20WhatsPulse%21");
        assert_eq!(urlencode_str("test"), "test");
    }
}
