use crate::config::SharedConfig;
use tauri::State;

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
