use tauri::{AppHandle, Manager};

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
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.unminimize();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
pub fn open_about(app: AppHandle) {
    if let Some(about_win) = app.get_webview_window("about") {
        let _ = about_win.show();
        let _ = about_win.set_focus();
    }
}

#[tauri::command]
pub fn close_about(app: AppHandle) {
    if let Some(about_win) = app.get_webview_window("about") {
        let _ = about_win.hide();
    }
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.unminimize();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
pub fn trigger_panic_mode(app: AppHandle) -> Result<(), String> {
    // 1. Hide windows immediately
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
    if let Some(about_win) = app.get_webview_window("about") {
        let _ = about_win.hide();
    }

    Ok(())
}
