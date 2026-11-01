use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub files: u64,
    pub dirs: u64,
    pub mtime: u64,
    pub cat: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<Node>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RootStat {
    pub drive: String,
    pub path: String,
    pub dir_count: u64,
    pub file_count: u64,
    pub total_bytes: u64,
    pub root: Node,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtStat {
    pub ext: String,
    pub count: u64,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayAct {
    pub files: u64,
    pub bytes: u64,
    pub memos: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub schema: String,
    pub generated_at: u64,
    pub duration_ms: u64,
    pub trigger: String,
    pub vault_id: String,
    pub roots: Vec<RootStat>,
    pub totals: Totals,
    pub ext_stats: Vec<ExtStat>,
    pub categories: HashMap<String, String>,
    pub activity: Activity,
    pub palette: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Totals {
    pub dirs: u64,
    pub files: u64,
    pub bytes: u64,
    pub memos: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub by_day: HashMap<String, DayAct>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    pub schema: String,
    pub id: String,
    pub name: String,
    pub brand: String,
    pub generated_at: u64,
    pub palette: String,
    pub mode: String,
    pub roots: Vec<String>,
    pub exclude_names: Vec<String>,
    pub max_depth: usize,
    pub max_dirs: u64,
    pub scan_interval_minutes: u64,
}

impl Default for Vault {
    fn default() -> Self {
        Self {
            schema: "ymz.atlas.vault/1".into(),
            id: "vault_local_001".into(),
            name: "本機星圖".into(),
            brand: "晏銘湛箴".into(),
            generated_at: now_ms(),
            palette: "A".into(),
            mode: "dark".into(),
            roots: default_roots(),
            exclude_names: default_excludes(),
            max_depth: 6,
            max_dirs: 40000,
            scan_interval_minutes: 30,
        }
    }
}

fn default_roots() -> Vec<String> {
    let mut roots = Vec::new();
    for letter in b'C'..=b'G' {
        let p = format!("{}:\\", letter as char);
        if Path::new(&p).exists() {
            roots.push(p);
        }
    }
    if roots.is_empty() {
        if let Ok(home) = std::env::var("USERPROFILE") {
            roots.push(home);
        }
    }
    roots
}

fn default_excludes() -> Vec<String> {
    [
        "$Recycle.Bin",
        "System Volume Information",
        "Windows",
        "WindowsApps",
        "Program Files",
        "Program Files (x86)",
        "ProgramData",
        "node_modules",
        ".pnpm-store",
        ".git",
        "AppData",
        "Temp",
        "tmp",
        ".cache",
        ".venv",
        "venv",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn category_of(name: &str, is_dir: bool) -> String {
    if is_dir {
        return "folder".into();
    }
    let ext = Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "md" | "markdown" => "markdown",
        "txt" | "log" | "rtf" => "text",
        "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "csv" => "office",
        "pdf" => "document",
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "svg" | "ico" => "image",
        "mp4" | "mkv" | "avi" | "mov" | "webm" | "wmv" => "video",
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => "audio",
        "js" | "mjs" | "ts" | "tsx" | "jsx" | "py" | "rs" | "go" | "java" | "c" | "cpp" | "h"
        | "cs" | "php" | "html" | "css" | "scss" | "vue" | "sh" | "ps1" => "code",
        "json" | "yaml" | "yml" | "toml" | "xml" | "sql" | "db" => "data",
        "zip" | "rar" | "7z" | "tar" | "gz" | "iso" => "archive",
        "exe" | "msi" | "dll" => "executable",
        _ => "other",
    }
    .into()
}

fn categories_map() -> HashMap<String, String> {
    [
        ("code", "#61dafb"),
        ("markdown", "#7c9cff"),
        ("document", "#f4a261"),
        ("office", "#e9c46a"),
        ("image", "#e76f51"),
        ("video", "#c1666b"),
        ("audio", "#9a8ac2"),
        ("data", "#2a9d8f"),
        ("text", "#8d99ae"),
        ("archive", "#b08968"),
        ("executable", "#adb5bd"),
        ("other", "#6c757d"),
        ("folder", "#8b9dc3"),
    ]
    .into_iter()
    .map(|(k, v)| (k.into(), v.into()))
    .collect()
}

struct Budget {
    dirs: u64,
    max_dirs: u64,
}

fn scan_path(
    path: &Path,
    depth: usize,
    max_depth: usize,
    exclude: &HashSet<String>,
    budget: &mut Budget,
) -> Option<Node> {
    if budget.dirs >= budget.max_dirs {
        return None;
    }
    let meta = fs::metadata(path).ok()?;
    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    if meta.is_file() {
        let size = meta.len();
        return Some(Node {
            id: path.to_string_lossy().to_string(),
            name: name.clone(),
            is_dir: false,
            size,
            files: 1,
            dirs: 0,
            mtime,
            cat: category_of(&name, false),
            children: None,
            truncated: None,
            truncated_count: None,
        });
    }

    if !meta.is_dir() {
        return None;
    }
    budget.dirs += 1;

    let mut children = Vec::new();
    let mut files = 0u64;
    let mut dirs = 0u64;
    let mut size = 0u64;
    let mut latest = mtime;

    if depth < max_depth {
        if let Ok(rd) = fs::read_dir(path) {
            let mut entries: Vec<_> = rd.filter_map(|e| e.ok()).collect();
            entries.sort_by_key(|e| e.file_name());
            for entry in entries {
                let name = entry.file_name().to_string_lossy().to_string();
                if exclude.contains(&name.to_ascii_lowercase()) {
                    continue;
                }
                if let Some(child) =
                    scan_path(&entry.path(), depth + 1, max_depth, exclude, budget)
                {
                    files += child.files;
                    dirs += child.dirs + if child.is_dir { 1 } else { 0 };
                    size += child.size;
                    if child.mtime > latest {
                        latest = child.mtime;
                    }
                    children.push(child);
                }
            }
        }
    }

    // keep largest children to bound payload
    let max_children = 60usize;
    let truncated_count = if children.len() > max_children {
        children.sort_by(|a, b| b.size.cmp(&a.size));
        let n = children.len() - max_children;
        children.truncate(max_children);
        Some(n)
    } else {
        None
    };

    Some(Node {
        id: path.to_string_lossy().to_string(),
        name,
        is_dir: true,
        size,
        files,
        dirs,
        mtime: latest,
        cat: "folder".into(),
        children: Some(children),
        truncated: truncated_count.map(|_| true),
        truncated_count,
    })
}

fn day_key(ms: u64) -> String {
    let secs = (ms / 1000) as i64;
    let dt = chrono::DateTime::from_timestamp(secs, 0)
        .unwrap_or_else(|| chrono::DateTime::from_timestamp(0, 0).unwrap());
    dt.format("%Y-%m-%d").to_string()
}

fn collect_activity(node: &Node, map: &mut HashMap<String, DayAct>) {
    if !node.is_dir && node.mtime > 0 {
        let k = day_key(node.mtime);
        let e = map.entry(k).or_insert(DayAct {
            files: 0,
            bytes: 0,
            memos: 0,
        });
        e.files += 1;
        e.bytes += node.size;
    }
    if let Some(children) = &node.children {
        for c in children {
            collect_activity(c, map);
        }
    }
}

fn collect_ext(node: &Node, map: &mut HashMap<String, ExtStat>) {
    if !node.is_dir {
        let ext = Path::new(&node.name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("(none)")
            .to_ascii_lowercase();
        let e = map.entry(ext.clone()).or_insert(ExtStat {
            ext,
            count: 0,
            bytes: 0,
        });
        e.count += 1;
        e.bytes += node.size;
    }
    if let Some(children) = &node.children {
        for c in children {
            collect_ext(c, map);
        }
    }
}

pub fn run_scan(vault: &Vault, trigger: &str) -> Snapshot {
    let t0 = now_ms();
    let exclude: HashSet<String> = vault
        .exclude_names
        .iter()
        .map(|s| s.to_ascii_lowercase())
        .collect();
    let mut budget = Budget {
        dirs: 0,
        max_dirs: vault.max_dirs,
    };
    let mut roots = Vec::new();

    for root in &vault.roots {
        let path = PathBuf::from(root);
        if !path.exists() {
            continue;
        }
        if let Some(node) = scan_path(&path, 0, vault.max_depth, &exclude, &mut budget) {
            let drive = path
                .components()
                .next()
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .unwrap_or_else(|| root.clone());
            roots.push(RootStat {
                drive,
                path: root.clone(),
                dir_count: node.dirs,
                file_count: node.files,
                total_bytes: node.size,
                root: node,
            });
        }
    }

    let mut by_day = HashMap::new();
    let mut ext_map = HashMap::new();
    for r in &roots {
        collect_activity(&r.root, &mut by_day);
        collect_ext(&r.root, &mut ext_map);
    }
    let mut ext_stats: Vec<_> = ext_map.into_values().collect();
    ext_stats.sort_by(|a, b| b.count.cmp(&a.count));
    ext_stats.truncate(60);

    let totals = Totals {
        dirs: roots.iter().map(|r| r.dir_count).sum(),
        files: roots.iter().map(|r| r.file_count).sum(),
        bytes: roots.iter().map(|r| r.total_bytes).sum(),
        memos: 0,
    };

    Snapshot {
        schema: "ymz.atlas.snap/1".into(),
        generated_at: now_ms(),
        duration_ms: now_ms().saturating_sub(t0),
        trigger: trigger.into(),
        vault_id: vault.id.clone(),
        roots,
        totals,
        ext_stats,
        categories: categories_map(),
        activity: Activity { by_day },
        palette: vault.palette.clone(),
        mode: vault.mode.clone(),
    }
}

pub fn vault_path() -> PathBuf {
    let base = dirs_data();
    base.join("vault.atlasvault")
}

pub fn snap_path() -> PathBuf {
    dirs_data().join("latest.atlasnap")
}

fn dirs_data() -> PathBuf {
    let mut p = if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata)
    } else {
        PathBuf::from(".")
    };
    p.push("ymz-atlas");
    let _ = fs::create_dir_all(&p);
    p
}

pub fn load_vault() -> Vault {
    let path = vault_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(v) = serde_json::from_str::<Vault>(&raw) {
            return v;
        }
    }
    let v = Vault::default();
    let _ = save_vault(&v);
    v
}

pub fn save_vault(v: &Vault) -> Result<(), String> {
    let path = vault_path();
    let raw = serde_json::to_string_pretty(v).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

pub fn save_snapshot(snap: &Snapshot) -> Result<(), String> {
    let path = snap_path();
    let raw = serde_json::to_string(snap).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

pub fn load_snapshot() -> Option<Snapshot> {
    let path = snap_path();
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}
