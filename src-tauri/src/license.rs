use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

/// 與 website/redeem.html、scripts/gen-license.mjs 保持一致
pub const SECRET: &[u8] = b"ymz.atlas.paypal.v1.yanmingzhanzhen.0.99";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseRecord {
    pub activated_at: u64,
    pub source: String,
    pub txn_hint: String,
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

pub fn normalize_txn(input: &str) -> String {
    input
        .trim()
        .to_ascii_uppercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

pub fn looks_like_paypal_txn(txn: &str) -> bool {
    let n = txn.len();
    (15..=22).contains(&n) && txn.chars().all(|c| c.is_ascii_alphanumeric())
}

/// ATLAS-XXXX-XXXX-XXXX-XXXX-XXXX
pub fn code_from_txn(txn_raw: &str) -> Result<String, String> {
    let txn = normalize_txn(txn_raw);
    if !looks_like_paypal_txn(&txn) {
        return Err("PayPal 訂單號格式不對（收據裡的 Transaction ID，通常 15–22 位英數）".into());
    }
    let mut hasher = Sha256::new();
    hasher.update(SECRET);
    hasher.update(b"|");
    hasher.update(txn.as_bytes());
    let dig = hasher.finalize();
    let hex: String = dig.iter().take(10).map(|b| format!("{:02X}", b)).collect();
    Ok(format!(
        "ATLAS-{}-{}-{}-{}-{}",
        &hex[0..4],
        &hex[4..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20]
    ))
}

pub fn normalize_code(code: &str) -> String {
    code.trim()
        .to_ascii_uppercase()
        .chars()
        .filter(|c| *c == '-' || c.is_ascii_alphanumeric())
        .collect()
}

/// 啟用：必須有訂單號；兌換碼可選（有則交叉驗證）
pub fn activate(txn_raw: &str, code_raw: Option<&str>) -> Result<LicenseRecord, String> {
    let txn = normalize_txn(txn_raw);
    let expect = code_from_txn(&txn)?;
    if let Some(c) = code_raw {
        let c = c.trim();
        if !c.is_empty() {
            let got = normalize_code(c);
            if got != expect {
                return Err("兌換碼與訂單號不匹配，請到官網兌換頁用同一訂單號重新生成".into());
            }
        }
    }
    let hint = format!(
        "{}…{}",
        &txn[..4.min(txn.len())],
        &txn[txn.len().saturating_sub(4)..]
    );
    let rec = LicenseRecord {
        activated_at: crate::scanner::now_ms(),
        source: "paypal-txn".into(),
        txn_hint: hint,
        code: expect,
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
