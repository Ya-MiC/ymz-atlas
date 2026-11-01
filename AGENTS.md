# AGENTS.md · 星圖 Atlas

品牌：晏銘湛箴（Ya-MiC）。本倉庫是「小工具 + 統一外殼」家族的一員。

## 不可妥協

1. 本地優先：不收集遙測、不上傳檔案內容。
2. 授權乾淨：MIT；依賴只收寬鬆授權。
3. 色票原色不得改（`src/styles/tokens.css`）。
4. 格式 schema 見 `formats/SCHEMA.md`，破壞性變更要升主版本。
5. 觸控熱區 ≥ 44px；尊重 `prefers-reduced-motion`。

## 技術真相源

- 前端：Vue 3 + Vite + TypeScript
- 殼：Tauri 2
- 掃描：`src-tauri/src/scanner.rs`
- 官網：`website/`

## 對代理的要求

- 用繁體中文回覆使用者。
- 不把 API key / 密碼寫進倉庫。
- 對外發布、改品牌承諾、改收款資訊前先問使用者。
