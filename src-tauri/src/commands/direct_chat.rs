use tauri::{AppHandle, Manager};

pub fn clean_phone_number(input: &str) -> String {
    let mut digits: String = input.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.starts_with('0') {
        digits = format!("62{}", &digits[1..]);
    }
    digits
}

pub fn urlencode_str(input: &str) -> String {
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
