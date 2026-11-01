# 晏銘湛箴 · 星圖 Atlas — 檔案格式規範

版本：`1.0.0`  
授權：MIT（格式規格本身可自由實作）  
原則：本地優先、人類可讀、版本化、可驗證

---

## 1. 產品身分

| 欄位 | 值 |
|---|---|
| 產品名（中） | 星圖 |
| 產品名（英） | Atlas |
| 品牌 | 晏銘湛箴 / Ya-MiC |
| npm / repo 建議 | `ymz-atlas` |
| 本地埠（開發） | `127.0.0.1:7788` |

---

## 2. 檔案類型一覽

| 副檔名 | MIME | 用途 | 誰寫 / 誰讀 |
|---|---|---|---|
| `.atlasvault` | `application/vnd.ymz.atlasvault+json` | 保險庫描述（根目錄、排除規則、主題） | 管理員寫；用戶讀 |
| `.atlasnap` | `application/vnd.ymz.atlasnap+json` | 掃描快照（樹 + 統計） | 掃描引擎寫；雙端讀 |
| `.atlasmemo` | `application/vnd.ymz.atlasmemo+json` | 單則筆記（相容 flomo 心智） | 用戶寫；等高線/時間軸讀 |
| `.atlasmemos` | `application/vnd.ymz.atlasmemos+json` | 筆記匯出包（多則） | 匯入/匯出 |
| `.md` + frontmatter | `text/markdown` | 可選的人類可讀筆記 | 雙向 |

所有 JSON 必須：
- UTF-8（無 BOM）
- 頂層含 `"schema": "ymz.atlas.<kind>/1"`
- 含 `"generatedAt"`（ISO-8601 或 epoch ms，文件內統一用 epoch ms）

---

## 3. `.atlasvault` — 保險庫

```json
{
  "schema": "ymz.atlas.vault/1",
  "id": "vault_local_001",
  "name": "本機星圖",
  "brand": "晏銘湛箴",
  "generatedAt": 1730000000000,
  "palette": "A",
  "mode": "dark",
  "roots": ["C:\\Users\\cao41\\Documents", "G:\\数据采集"],
  "excludeNames": ["node_modules", ".git", "Windows"],
  "excludePathPatterns": ["\\\\AppData\\\\Local\\\\Temp\\\\"],
  "maxDepth": 6,
  "maxDirs": 40000,
  "scanIntervalMinutes": 30,
  "features": {
    "nebula": true,
    "treemap": true,
    "contour": true,
    "memos": true
  }
}
```

驗證規則：
- `roots` 至少 1 個、皆為絕對路徑
- `palette` ∈ {`A`,`B`}；`mode` ∈ {`light`,`dark`}
- 不得包含雲端憑證、API key、帳密

---

## 4. `.atlasnap` — 掃描快照

```json
{
  "schema": "ymz.atlas.snap/1",
  "generatedAt": 1730000000000,
  "durationMs": 86000,
  "trigger": "startup|interval|manual",
  "vaultId": "vault_local_001",
  "totals": { "dirs": 0, "files": 0, "bytes": 0 },
  "roots": [{ "drive": "C:", "path": "C:\\", "dirCount": 0, "fileCount": 0, "totalBytes": 0 }],
  "extStats": [{ "ext": "md", "count": 0, "bytes": 0 }],
  "categories": { "code": "#61dafb", "folder": "#8b9dc3" },
  "trees": [
    {
      "drive": "C:",
      "path": "C:\\",
      "dirCount": 0,
      "fileCount": 0,
      "totalBytes": 0,
      "root": {
        "id": "C:\\",
        "name": "C:",
        "isDir": true,
        "size": 0,
        "files": 0,
        "dirs": 0,
        "mtime": 0,
        "cat": "folder",
        "children": []
      }
    }
  ],
  "activity": {
    "byDay": { "2026-11-01": { "files": 12, "bytes": 4096, "memos": 3 } }
  }
}
```

節點欄位（樹內每個 node）：
`id, name, isDir, size, files, dirs, mtime, cat, children?, truncated?, truncatedCount?`

---

## 5. `.atlasmemo` — 單則筆記（flomo 相容心智）

```json
{
  "schema": "ymz.atlas.memo/1",
  "id": "memo_20261101_001",
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000,
  "content": "今天把星圖等高線想清楚了。",
  "tags": ["#產品", "#審美"],
  "source": "manual|flomo|obsidian|import",
  "links": ["G:\\数据采集\\某檔.md"],
  "location": { "lat": null, "lng": null }
}
```

### flomo 匯入對應

| flomo 欄位 | Atlas 欄位 |
|---|---|
| 正文 | `content` |
| 標籤 `#tag` | `tags[]` |
| 建立時間 | `createdAt` |
| 來源標記 | `source: "flomo"` |

支援匯入：
1. flomo App 匯出的 JSON / HTML（解析後轉 `.atlasmemos`）
2. 純 Markdown：每則以 `---` 分隔，或一行一個 `#tag`

---

## 6. `.atlasmemos` — 筆記包

```json
{
  "schema": "ymz.atlas.memos/1",
  "generatedAt": 1730000000000,
  "count": 2,
  "memos": [ { "...": "atlasmemo" }, { "...": "atlasmemo" } ]
}
```

---

## 7. 等高線資料（衍生，不另存檔也可）

從 `trees[*].root` 的 `mtime` + `memos[*].createdAt` 衍生：

```json
{
  "schema": "ymz.atlas.contour/1",
  "generatedAt": 1730000000000,
  "grid": { "cols": 64, "rows": 48 },
  "values": [[0.0, 0.1], [0.2, 0.9]],
  "levels": [0.1, 0.25, 0.4, 0.55, 0.7, 0.85],
  "heatmapDays": ["2026-10-01", "2026-11-01"],
  "heatmap": [0, 1, 3, 0]
}
```

- **地形等高線**：把目錄投影到 2D（深度×容量對數），密度場做 marching-squares
- **日曆熱力**（flomo 風格）：依日彙總檔案變更與筆記數

---

## 8. 角色與權限（本地）

| 角色 | 可做 | 不可做 |
|---|---|---|
| 用戶 (user) | 看星雲/樹圖/等高線、讀筆記、匯入自己的 memo、切主題 | 改 roots、排除規則、強制全盤掃描參數 |
| 管理員 (admin) | 全部用戶能力 + 編輯 vault、觸發重掃、匯出 snap、校驗格式 | 上傳雲端、收集遙測（產品禁止） |

本機無帳號系統：以 URL 路徑區分 `/` 用戶、`/admin` 管理員。  
日後 Tauri 封裝時，管理員入口可改為本機 token 或系統生物辨識（待決策）。

---

## 9. 目錄慣例（保險庫實例）

```
MyVault/
  vault.atlasvault
  snapshots/
    2026-11-01T10-00-00.atlasnap
    latest.atlasnap          # 可選 symlink / 複本
  memos/
    2026/
      11/
        memo_....atlasmemo
  exports/
    memos-2026-11.atlasmemos
```

---

## 10. 相容與版本

- 主版本號變更 = 破壞性（舊客戶端必須拒絕或遷移）
- 讀檔時若 `schema` 主版本 > 自身支援 → 顯示「需要升級」而非靜默損壞
- 遷移腳本放 `formats/migrate/`（未來）
