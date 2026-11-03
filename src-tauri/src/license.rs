use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ===== 環境變數（編譯時嵌入，僅放公開金鑰，私鑰絕不進此檔）=====
// TODO(verify)：正式上線前，將此處替換為支付寶 AI 付伺服器簽發用的 Ed25519 公開金鑰 Base64。
// 私鑰僅存在 Cloudflare Workers Secret，桌面端只內嵌公鑰做離線驗證。
const AUTH_ED25519_PUBLIC_KEY_B64: &str = ""; // 由用戶填入，見 .env.example

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

/// 啟用：驗證授權碼格式 + Ed25519 簽章（離線驗證，不連網）。
/// 當公鑰未設定時，僅做格式驗證（臨時開發模式）。
pub fn activate(code_raw: &str, signature_b64: Option<&str>) -> Result<LicenseRecord, String> {
    let code = normalize_code(code_raw);
    if code.is_empty() {
        return Err("請輸入授權碼".into());
    }
    if !looks_like_auth_code(&code) {
        return Err("授權碼格式不對（例如 ATLAS-XXXX-…）".into());
    }

    // Ed25519 離線驗證（若公鑰已設定）
    if let Some(sig_b64) = signature_b64 {
        if !AUTH_ED25519_PUBLIC_KEY_B64.is_empty() {
            verify_ed25519(code.as_bytes(), sig_b64, AUTH_ED25519_PUBLIC_KEY_B64)?;
        }
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

/// Ed25519 簽章驗證（Base64 編碼簽名）。
fn verify_ed25519(data: &[u8], sig_b64: &str, pub_b64: &str) -> Result<(), String> {
    let pub_bytes = base64_decode(pub_b64).map_err(|e| format!("公鑰解碼失敗：{e}"))?;
    let sig_bytes = base64_decode(sig_b64).map_err(|e| format!("簽名解碼失敗：{e}"))?;
    let verifying_key =
        VerifyingKey::from_bytes(&pub_bytes.try_into().map_err(|_| "公鑰長度不正確".to_string())?)
            .map_err(|e| format!("公鑰匯入失敗：{e}"))?;
    let signature = Signature::from_bytes(&sig_bytes.try_into().map_err(|_| "簽名長度不正確".to_string())?);
    verifying_key
        .verify(data, &signature)
        .map_err(|_| "授權碼簽章驗證失敗，可能為偽造碼".to_string())
}

/// 簡單 Base64 解碼（支援標準與 URL-safe）。
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    URL_SAFE_NO_PAD
        .decode(input)
        .map_err(|e| format!("Base64 解碼失敗：{e}"))
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
