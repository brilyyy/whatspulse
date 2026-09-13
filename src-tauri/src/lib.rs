pub mod commands;
pub mod config;
pub mod notif_icon;
pub mod scripts;
pub mod tray;

use config::{AppConfig, SharedConfig};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

pub fn run() {
    let config = AppConfig::load();
    let shared_config: SharedConfig = Arc::new(Mutex::new(config));

    let mut builder = tauri::Builder::default();

    // Plugin: Single instance
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));

    // Plugin: Opener & Dialog & Updater
    builder = builder.plugin(tauri_plugin_opener::init());
    builder = builder.plugin(tauri_plugin_dialog::init());
    builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    // Centralized window close handling
    let shared_config_close = shared_config.clone();
    builder = builder.on_window_event(move |window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            match window.label() {
                "main" => {
                    let cfg = shared_config_close.lock().unwrap();
                    if cfg.window.close_to_tray {
                        api.prevent_close();
                        let w = window.clone();
                        let _ = window.hide();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(25));
                            let _ = w.hide();
                        });
                    }
                }
                "settings" => {
                    api.prevent_close();
                    let w = window.clone();
                    let _ = window.hide();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(25));
                        let _ = w.hide();
                    });
                    if let Some(main_win) = window.app_handle().get_webview_window("main") {
                        let _ = main_win.show();
                        let _ = main_win.unminimize();
                        let _ = main_win.set_focus();
                    }
                }
                "about" => {
                    api.prevent_close();
                    let w = window.clone();
                    let _ = window.hide();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(25));
                        let _ = w.hide();
                    });
                    if let Some(main_win) = window.app_handle().get_webview_window("main") {
                        let _ = main_win.show();
                        let _ = main_win.unminimize();
                        let _ = main_win.set_focus();
                    }
                }
                _ => {}
            }
        }
    });

    let cfg_clone_setup = shared_config.clone();

    builder
        .manage(shared_config.clone())
        .setup(move |app| {
            let (injection, user_agent, should_be_visible, width, height, show_tray, is_dnd, check_updates_on_start) = {
                let cfg = cfg_clone_setup.lock().unwrap();
                let injection = scripts::build_injection_bundle(&cfg);
                let ua = cfg.user_agent.clone().unwrap_or_else(|| DEFAULT_USER_AGENT.to_string());
                let is_minimized_arg = std::env::args().any(|a| a == "--minimized" || a == "-m");
                let should_be_visible = !cfg.window.start_minimized && !is_minimized_arg;
                (
                    injection,
                    ua,
                    should_be_visible,
                    cfg.window.width,
                    cfg.window.height,
                    cfg.tray.show_tray,
                    cfg.notifications.dnd,
                    cfg.check_updates_on_start,
                )
            };

            // 1. Build Main WhatsApp Window (primary startup window)
            let main_window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://web.whatsapp.com".parse().unwrap()),
            )
            .title("WhatsPulse")
            .inner_size(width, height)
            .min_inner_size(600.0, 500.0)
            .user_agent(&user_agent)
            .initialization_script(&injection)
            .visible(should_be_visible)
            .build()?;

            // 2. Build Settings Window (hidden until opened)
            let settings_window = WebviewWindowBuilder::new(
                app,
                "settings",
                WebviewUrl::App("index.html".into()),
            )
            .title("WhatsPulse Settings")
            .inner_size(760.0, 600.0)
            .min_inner_size(620.0, 480.0)
            .visible(false)
            .build()?;

            // 3. Build About Window (dedicated standalone window)
            let about_window = WebviewWindowBuilder::new(
                app,
                "about",
                WebviewUrl::App("about.html".into()),
            )
            .title("About WhatsPulse")
            .inner_size(520.0, 460.0)
            .min_inner_size(480.0, 420.0)
            .resizable(false)
            .visible(false)
            .center()
            .build()?;

            // 4. Setup System Tray
            if show_tray {
                tray::create_tray(app.handle(), is_dnd)?;
            }

            // 5. Ensure correct startup focus: WhatsApp Web must be front and center
            let _ = settings_window.hide();
            let _ = about_window.hide();
            if should_be_visible {
                let _ = main_window.show();
                let _ = main_window.unminimize();
                let _ = main_window.set_focus();
            }

            // 6. Optional background check for updates on startup
            if check_updates_on_start {
                let app_handle_updater = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    tauri::async_runtime::block_on(async move {
                        use tauri_plugin_updater::UpdaterExt;
                        if let Ok(updater) = app_handle_updater.updater() {
                            if let Ok(Some(update)) = updater.check().await {
                                println!("[WhatsPulse Updater] New update available: {}", update.version);
                                let _ = app_handle_updater.emit("update-available", serde_json::json!({
                                    "version": update.version,
                                    "body": update.body
                                }));
                            }
                        }
                    });
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::client_log,
            commands::script_failed,
            commands::connection_changed,
            commands::open_settings,
            commands::close_settings,
            commands::retry_page,
            commands::update_unread_count,
            commands::show_notification,
            commands::test_notification,
            commands::open_about,
            commands::close_about,
            commands::check_for_updates,
            commands::get_settings,
            commands::save_settings,
            commands::direct_chat,
            commands::open_direct_chat,
            commands::trigger_panic_mode,
            commands::get_autostart_status,
            commands::set_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("error while running WhatsPulse application");
}
