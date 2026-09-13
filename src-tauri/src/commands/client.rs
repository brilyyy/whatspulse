use tauri::{AppHandle, Manager};

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
pub fn retry_page(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.eval("window.location.reload();");
    }
}
