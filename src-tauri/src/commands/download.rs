use crate::config::SharedConfig;
use base64::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResponse {
    pub success: bool,
    pub file_path: Option<String>,
    pub filename: String,
    pub size_bytes: usize,
    pub error: Option<String>,
}

fn sanitize_filename(filename: &str, mime_type: Option<&str>) -> String {
    // 1. Remove dangerous or illegal characters
    let mut cleaned: String = filename
        .chars()
        .filter(|c| !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0'..='\x1f'))
        .collect();

    // 2. Trim whitespace and leading/trailing dots
    cleaned = cleaned.trim().trim_matches('.').to_string();

    if cleaned.is_empty() {
        cleaned = "whatsapp_download".to_string();
    }

    // 3. Ensure appropriate extension if missing
    if !cleaned.contains('.') {
        if let Some(mime) = mime_type {
            let ext = match mime.to_lowercase().as_str() {
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/webp" => "webp",
                "image/gif" => "gif",
                "video/mp4" => "mp4",
                "video/webm" => "webm",
                "video/quicktime" => "mov",
                "audio/ogg" | "audio/ogg; codecs=opus" => "ogg",
                "audio/mpeg" | "audio/mp3" => "mp3",
                "audio/mp4" | "audio/m4a" => "m4a",
                "audio/wav" => "wav",
                "application/pdf" => "pdf",
                "application/zip" => "zip",
                "text/plain" => "txt",
                _ => "",
            };
            if !ext.is_empty() {
                cleaned.push('.');
                cleaned.push_str(ext);
            }
        }
    }

    cleaned
}

fn resolve_unique_path(dir: &Path, filename: &str) -> PathBuf {
    let mut target = dir.join(filename);
    if !target.exists() {
        return target;
    }

    let path = Path::new(filename);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();

    let mut counter = 1;
    loop {
        let candidate_name = format!("{} ({}){}", stem, counter, ext);
        target = dir.join(&candidate_name);
        if !target.exists() {
            return target;
        }
        counter += 1;
    }
}

#[tauri::command]
pub async fn save_download_file(
    app: AppHandle,
    config: State<'_, SharedConfig>,
    filename: String,
    mime_type: Option<String>,
    data_base64: String,
) -> Result<DownloadResponse, String> {
    // 1. Resolve target download directory
    let download_dir = {
        let cfg = config.lock().unwrap();
        if let Some(ref custom_dir) = cfg.downloads.directory {
            let p = PathBuf::from(custom_dir);
            if p.is_dir() {
                p
            } else {
                dirs::download_dir()
                    .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
            }
        } else {
            dirs::download_dir()
                .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        }
    };

    if let Err(e) = fs::create_dir_all(&download_dir) {
        return Ok(DownloadResponse {
            success: false,
            file_path: None,
            filename,
            size_bytes: 0,
            error: Some(format!("Failed to create download directory: {}", e)),
        });
    }

    // 2. Sanitize filename and resolve collision
    let clean_name = sanitize_filename(&filename, mime_type.as_deref());
    let target_path = resolve_unique_path(&download_dir, &clean_name);

    // 3. Clean and decode Base64 data
    let base64_payload = if let Some(idx) = data_base64.find(";base64,") {
        &data_base64[idx + 8..]
    } else if let Some(idx) = data_base64.find(',') {
        &data_base64[idx + 1..]
    } else {
        &data_base64
    };

    let raw_clean: String = base64_payload
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect();
    let bytes = match BASE64_STANDARD.decode(&raw_clean) {
        Ok(b) => b,
        Err(e) => {
            return Ok(DownloadResponse {
                success: false,
                file_path: None,
                filename: clean_name,
                size_bytes: 0,
                error: Some(format!("Failed to decode file data: {}", e)),
            });
        }
    };

    let size_bytes = bytes.len();

    // 4. Write bytes to file
    if let Err(e) = fs::write(&target_path, &bytes) {
        return Ok(DownloadResponse {
            success: false,
            file_path: None,
            filename: clean_name,
            size_bytes: 0,
            error: Some(format!("Failed to write file to disk: {}", e)),
        });
    }

    let saved_path_str = target_path.to_string_lossy().to_string();
    let display_filename = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&clean_name)
        .to_string();

    println!(
        "[WhatsPulse Download] Saved {} bytes to {}",
        size_bytes, saved_path_str
    );

    // 5. Native Desktop Notification (notify-rust)
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

    if notif_enabled {
        let app_handle = app.clone();
        let path_for_action = saved_path_str.clone();
        let fname_for_notif = display_filename.clone();

        std::thread::spawn(move || {
            let mut notif = notify_rust::Notification::new();
            notif.appname("WhatsPulse");
            notif.summary("Download Complete");
            notif.body(&format!("{} saved to Downloads", fname_for_notif));
            if let Some(ref icon_path) = custom_icon {
                notif.icon(icon_path);
            }
            notif.action("open", "Open File");
            notif.action("folder", "Show in Folder");
            notif.action("default", "Open File");

            if let Ok(handle) = notif.show() {
                handle.wait_for_action(move |action| match action {
                    "open" | "default" => {
                        let _ = app_handle.opener().open_path(&path_for_action, None::<&str>);
                    }
                    "folder" => {
                        let _ = app_handle.opener().reveal_item_in_dir(&path_for_action);
                    }
                    _ => {}
                });
            }
        });
    }

    Ok(DownloadResponse {
        success: true,
        file_path: Some(saved_path_str),
        filename: display_filename,
        size_bytes,
        error: None,
    })
}

#[tauri::command]
pub fn open_download_file(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_in_folder(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    #[test]
    fn test_sanitize_filename_strips_illegal_chars() {
        let dirty = "foo/bar\\baz:qux*item?name\"pipe|less<greater>null\0.pdf";
        let clean = sanitize_filename(dirty, None);
        assert!(!clean.contains('/'));
        assert!(!clean.contains('\\'));
        assert!(!clean.contains(':'));
        assert!(!clean.contains('*'));
        assert!(!clean.contains('?'));
        assert!(!clean.contains('"'));
        assert!(!clean.contains('|'));
        assert!(!clean.contains('<'));
        assert!(!clean.contains('>'));
        assert!(clean.ends_with(".pdf"));
    }

    #[test]
    fn test_sanitize_filename_infers_extension() {
        let no_ext = "invoice_september";
        let clean_pdf = sanitize_filename(no_ext, Some("application/pdf"));
        assert_eq!(clean_pdf, "invoice_september.pdf");

        let clean_jpg = sanitize_filename(no_ext, Some("image/jpeg"));
        assert_eq!(clean_jpg, "invoice_september.jpg");
    }

    #[test]
    fn test_resolve_unique_path_deduplication() {
        let temp_dir = std::env::temp_dir().join(format!("wp_test_dl_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let filename = "sample.png";
        let target1 = resolve_unique_path(&temp_dir, filename);
        assert_eq!(target1, temp_dir.join("sample.png"));

        // Create the file so it exists
        File::create(&target1).unwrap();

        let target2 = resolve_unique_path(&temp_dir, filename);
        assert_eq!(target2, temp_dir.join("sample (1).png"));

        // Create the second file
        File::create(&target2).unwrap();

        let target3 = resolve_unique_path(&temp_dir, filename);
        assert_eq!(target3, temp_dir.join("sample (2).png"));

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
