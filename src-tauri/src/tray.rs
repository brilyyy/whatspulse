use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use crate::config::SharedConfig;

pub fn create_tray(app: &AppHandle, config: SharedConfig) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Show/Hide WhatsPulse", true, None::<&str>)?;
    let direct_item = MenuItem::with_id(app, "direct_chat", "💬 Direct Chat...", true, None::<&str>)?;
    let panic_item = MenuItem::with_id(app, "panic", "🚨 Boss Key (Hide All)", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let about_item = MenuItem::with_id(app, "about", "ℹ️ About WhatsPulse", true, None::<&str>)?;
    let update_item = MenuItem::with_id(app, "check_update", "🔄 Check for Updates...", true, None::<&str>)?;
    let dnd_item = MenuItem::with_id(app, "dnd", "Toggle Do Not Disturb", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit WhatsPulse", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &toggle_item,
        &direct_item,
        &panic_item,
        &settings_item,
        &about_item,
        &update_item,
        &dnd_item,
        &quit_item,
    ])?;

    let icon = app.default_window_icon().cloned();

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("WhatsPulse")
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(icon) = icon {
        builder = builder.icon(icon);
    }

    let _tray = builder
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "toggle" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(is_visible) = window.is_visible() {
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                }
                "direct_chat" => {
                    crate::commands::open_direct_chat(app.clone());
                }
                "panic" => {
                    if let (Some(lock_state), Some(cfg_state)) = (
                        app.try_state::<crate::lock::SharedLockManager>(),
                        app.try_state::<crate::config::SharedConfig>(),
                    ) {
                        let _ = crate::commands::trigger_panic_mode(app.clone(), lock_state, cfg_state);
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("settings") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "about" => {
                    crate::commands::open_about(app.clone());
                }
                "check_update" => {
                    crate::commands::open_about(app.clone());
                }
                "dnd" => {
                    if let Some(state) = app.try_state::<SharedConfig>() {
                        let mut cfg = state.lock().unwrap();
                        cfg.notifications.dnd = !cfg.notifications.dnd;
                        cfg.save();
                        println!("[WhatsPulse Tray] DND toggled: {}", cfg.notifications.dnd);
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event({
            let config = config.clone();
            move |tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let cfg = config.lock().unwrap();
                    if cfg.tray.left_click_toggles {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(is_visible) = window.is_visible() {
                                if is_visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn update_tray_badge(app: &AppHandle, unread_count: u32) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if unread_count > 0 {
            format!("WhatsPulse ({unread_count} unread)")
        } else {
            "WhatsPulse".to_string()
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}
