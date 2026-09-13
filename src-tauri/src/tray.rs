use crate::config::SharedConfig;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn create_tray(
    app: &AppHandle,
    is_dnd: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open_wa", "Open WhatsPulse", true, None::<&str>)?;
    let reload_item = MenuItem::with_id(app, "reload_wa", "Reload WhatsApp", true, None::<&str>)?;
    let direct_item = MenuItem::with_id(app, "direct_chat", "Direct Chat...", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;

    let dnd_item = CheckMenuItem::with_id(app, "dnd", "Do Not Disturb", true, is_dnd, None::<&str>)?;
    let panic_item = MenuItem::with_id(app, "panic", "Boss Key (Hide All)", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let devtools_item = MenuItem::with_id(app, "devtools", "Inspect / Debug", true, None::<&str>)?;
    let update_item = MenuItem::with_id(app, "check_update", "Check for Updates...", true, None::<&str>)?;
    let about_item = MenuItem::with_id(app, "about", "About WhatsPulse", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;

    let quit_item = MenuItem::with_id(app, "quit", "Quit WhatsPulse", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &open_item,
        &reload_item,
        &direct_item,
        &sep1,
        &dnd_item,
        &panic_item,
        &sep2,
        &settings_item,
        &devtools_item,
        &update_item,
        &about_item,
        &sep3,
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
                "open_wa" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                "reload_wa" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        let _ = window.eval("window.location.reload();");
                    }
                }
                "toggle" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(is_visible) = window.is_visible() {
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                }
                "direct_chat" => {
                    crate::commands::open_direct_chat(app.clone());
                }
                "panic" => {
                    let _ = crate::commands::trigger_panic_mode(app.clone());
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("settings") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "devtools" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        if window.is_devtools_open() {
                            window.close_devtools();
                        } else {
                            window.open_devtools();
                        }
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
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    ..
                }
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
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
