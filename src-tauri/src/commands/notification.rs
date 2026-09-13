use crate::config::SharedConfig;
use crate::tray::update_tray_badge;
use tauri::{AppHandle, Manager, State};

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
