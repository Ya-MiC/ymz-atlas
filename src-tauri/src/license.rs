use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

/// 臨時版本：僅驗證授權碼格式。
/// 待支付寶 AI 付架構確認後，替換為伺服器 Ed25519 簽章驗證（私鑰僅存在伺服端環境變數，不進此檔）。
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseRecord {
    pub activated_at: u64,
    pub source: String,
    pub code_hint: String,
    pub code: String,
}

fn data_dir() -> PathBuf {
    let mut p = if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata)
    } else {
        PathBuf::from(".")
    };
    p.push("ymz-atlas");
    let _ = fs::create_dir_all(&p);
    p
}

fn license_path() -> PathBuf {
    data_dir().join("license.json")
}

pub fn normalize_code(input: &str) -> String {
    input
        .trim()
        .to_ascii_uppercase()
        .chars()
        .filter(|c| *c == '-' || c.is_ascii_alphanumeric())
        .collect()
}

pub fn looks_like_auth_code(code: &str) -> bool {
    let c = normalize_code(code);
    c.starts_with("ATLAS-") && c.len() >= 20 && c.chars().all(|c| c == '-' || c.is_ascii_alphanumeric())
}

/// 已廢棄：授權碼由支付寶 AI 付伺服器簽發，本地不再根據訂單號產生。
pub fn code_from_txn(_txn_raw: &str) -> Result<String, String> {
    Err("code_from_txn 已廢棄：授權碼由支付寶 AI 付伺服器簽發。".into())
}

/// 啟用：僅驗證授權碼格式，儲存到本機（臨時版本，待簽章驗證）。
pub fn activate(code_raw: &str) -> Result<LicenseRecord, String> {
    let code = normalize_code(code_raw);
    if code.is_empty() {
        return Err("請輸入授權碼".into());
    }
    if !looks_like_auth_code(&code) {
        return Err("授權碼格式不對（例如 ATLAS-XXXX-…）".into());
    }
    let hint = format!(
        "{}…{}",
        &code[..6.min(code.len())],
        &code[code.len().saturating_sub(6)..]
    );
    let rec = LicenseRecord {
        activated_at: crate::scanner::now_ms(),
        source: "alipay-vibe-pay".into(),
        code_hint: hint,
        code,
    };
    save_license(&rec)?;
    Ok(rec)
}

pub fn save_license(rec: &LicenseRecord) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(rec).map_err(|e| e.to_string())?;
    fs::write(license_path(), raw).map_err(|e| e.to_string())
}

pub fn load_license() -> Option<LicenseRecord> {
    let raw = fs::read_to_string(license_path()).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn is_licensed() -> bool {
    load_license().is_some()
}
