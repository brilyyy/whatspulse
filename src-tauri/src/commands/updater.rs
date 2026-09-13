use serde::{Deserialize, Serialize};
use tauri::AppHandle;

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
