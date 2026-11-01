# 星圖 Atlas

把硬碟變成可漫遊的資料宇宙。

**星雲圖** · **樹圖** · **等高線（flomo 式熱力 + 地形密度）**  
技術棧：Vue 3 + Tauri 2 + Rust · 本地優先 · 不上傳

| | |
|---|---|
| 官網 | https://ya-mic.github.io/ymz-atlas/ |
| 倉庫 | https://github.com/Ya-MiC/ymz-atlas |
| 價格 | **$0.99 USD 買斷**（官方 Windows 安裝包 + 1.x 免費更新） |
| 收款 | PayPal → `cao417090217@gmail.com` |
| 授權 | 源碼 MIT；付費購買的是官方構建與更新通道 |

## 給使用者

1. 打開 [Releases](https://github.com/Ya-MiC/ymz-atlas/releases) 下載 Windows 安裝包；或先用 PayPal 購買官方版：
   - [PayPal 支付 $0.99](https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=cao417090217%40gmail.com&item_name=Atlas%20Official%20Build%20v0.1&amount=0.99&currency_code=USD)
2. 安裝後打開「星圖 Atlas」
3. 分頁切換：**星雲圖** / **樹圖** / **等高線**；需要改掃描根目錄時進 **管理員**
4. 資料只留在本機（`%APPDATA%\ymz-atlas\`）

### 買斷說明

- **$0.99 一次買斷**，無訂閱
- **1.x 版本持續免費更新**（修 bug、相容性、小功能）
- 源碼可自行編譯（MIT）；付費支持官方安裝包與維護
- 付款後若需協助：郵件 `cao417090217@gmail.com`（請附 PayPal 交易號）

## 三種圖

| 圖 | 用途 |
|---|---|
| ✦ 星雲圖 | 力導向關係圖，類 Obsidian Graph |
| ▦ 樹圖 | Squarified treemap，看容量結構 |
| 〰 等高線 | 日曆熱力（何時在改）+ 地形等高線（資料堆在哪） |

## 開發者

需要：Node 18+、pnpm、Rust stable；Windows 另需 [VS C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2。

```bash
git clone https://github.com/Ya-MiC/ymz-atlas.git
cd ymz-atlas
pnpm install --config.dangerouslyAllowAllBuilds=true
pnpm tauri dev
```

僅前端（瀏覽器 demo）：

```bash
pnpm exec vite
```

打包：

```bash
pnpm tauri build
```

> 注意：請在 **NTFS** 磁碟開發（exFAT 會導致 pnpm symlink 失敗）。

### 目錄

```
src/                 Vue 用戶端 + 管理員
src-tauri/           Tauri 殼 + Rust 掃描引擎
public/              星雲 / 樹圖 / 等高線引擎
formats/SCHEMA.md    .atlasvault / .atlasnap / .atlasmemo
website/             官網（GitHub Pages）
```

## 品牌

晏銘湛箴 · 色票家族 A / B × 淺 / 深（原色不得改）見 `src/styles/tokens.css`。

## License

MIT © 晏銘湛箴 / Ya-MiC
