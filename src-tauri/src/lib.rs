mod scanner;

use scanner::{load_snapshot, load_vault, run_scan, save_snapshot, save_vault, Snapshot, Vault};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    pub vault: Mutex<Vault>,
    pub snapshot: Mutex<Option<Snapshot>>,
    pub scanning: Mutex<bool>,
}

#[tauri::command]
fn get_vault(state: State<'_, AppState>) -> Vault {
    state.vault.lock().unwrap().clone()
}

#[tauri::command]
fn save_vault_cmd(vault: Vault, state: State<'_, AppState>) -> Result<Vault, String> {
    let mut v = vault;
    v.schema = "ymz.atlas.vault/1".into();
    v.brand = "晏銘湛箴".into();
    v.generated_at = scanner::now_ms();
    if v.roots.is_empty() {
        return Err("roots 至少一個".into());
    }
    save_vault(&v)?;
    *state.vault.lock().unwrap() = v.clone();
    Ok(v)
}

#[tauri::command]
fn get_snapshot(state: State<'_, AppState>) -> Option<Snapshot> {
    state.snapshot.lock().unwrap().clone()
}

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> serde_json::Value {
    let scanning = *state.scanning.lock().unwrap();
    let snap = state.snapshot.lock().unwrap();
    let vault = state.vault.lock().unwrap();
    serde_json::json!({
        "scanning": scanning,
        "lastScanAt": snap.as_ref().map(|s| s.generated_at),
        "stats": snap.as_ref().map(|s| &s.totals),
        "palette": vault.palette,
        "mode": vault.mode,
        "vaultId": vault.id,
        "product": "星圖 Atlas",
        "brand": "晏銘湛箴",
    })
}

fn do_scan(state: &AppState, trigger: &str) -> Result<Snapshot, String> {
    {
        let mut scanning = state.scanning.lock().unwrap();
        if *scanning {
            return Err("掃描進行中".into());
        }
        *scanning = true;
    }
    let vault = state.vault.lock().unwrap().clone();
    let snap = run_scan(&vault, trigger);
    let _ = save_snapshot(&snap);
    *state.snapshot.lock().unwrap() = Some(snap.clone());
    *state.scanning.lock().unwrap() = false;
    Ok(snap)
}

#[tauri::command]
fn rescan(state: State<'_, AppState>) -> Result<Snapshot, String> {
    do_scan(&state, "manual")
}

fn startup_scan(app: AppHandle) {
    std::thread::spawn(move || {
        let state = app.state::<AppState>();
        let need = state.snapshot.lock().unwrap().is_none();
        if need {
            let _ = do_scan(&state, "startup");
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vault = load_vault();
    let snapshot = load_snapshot();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            vault: Mutex::new(vault),
            snapshot: Mutex::new(snapshot),
            scanning: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            get_vault,
            save_vault_cmd,
            get_snapshot,
            get_status,
            rescan
        ])
        .setup(|app| {
            startup_scan(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
