# 星圖 Atlas

**晏銘湛箴** 的本機資料宇宙視覺化工具。

- ✦ **星雲圖**（力導向，類 Obsidian Graph）
- ▦ **樹圖**（Squarified Treemap）
- 〰 **等高線**（flomo 式日曆熱力 + 地形密度）

技術棧：**Vue 3 + Tauri 2 + Rust** · 本地優先 · MIT

- 倉庫：https://github.com/Ya-MiC/ymz-atlas
- 官網：https://ya-mic.github.io/ymz-atlas/
- 贊助（PayPal）：`cao417090217@gmail.com`

## 快速開始（開發）

需要：Node 18+、pnpm、Rust stable、Windows 上需 [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2。

```bash
pnpm install
pnpm tauri dev
```

僅前端預覽（瀏覽器 demo 資料）：

```bash
pnpm dev
```

打包：

```bash
pnpm tauri build
```

CI 會在 GitHub Actions 產出 Windows 安裝包（見 Releases）。

## 結構

```
src/                 Vue 前端（用戶端 + 管理員）
src-tauri/           Tauri 殼 + Rust 掃描引擎
formats/SCHEMA.md    .atlasvault / .atlasnap / .atlasmemo 規範
website/             官網落地頁（GitHub Pages）
```

## 設計

色票來自晏銘湛箴品牌（家族 A / B × 淺 / 深），原色不得更動。見 `src/styles/tokens.css`。

## 授權

MIT © 晏銘湛箴 / Ya-MiC
