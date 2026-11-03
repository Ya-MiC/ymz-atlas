# 星圖 Atlas

本機資料宇宙：**星雲圖 · 樹圖 · 等高線**  
Vue 3 + Tauri 2 + Rust · **免費下載** · 晏銘湛箴

| | |
|---|---|
| 官網（含下載引導） | https://ya-mic.github.io/ymz-atlas/ |
| 下載 exe / msi | https://github.com/Ya-MiC/ymz-atlas/releases/latest |
| 源碼 | https://github.com/Ya-MiC/ymz-atlas |

## 使用者：下載 → 安裝 → 即用

1. **下載** [Windows 安裝包（.exe / .msi）](https://github.com/Ya-MiC/ymz-atlas/releases/latest)  
2. 安裝後打開「星圖 Atlas」，所有功能預設全開，無需註冊、無需付款、無需啟用碼  
3. 在「管理員」分頁設定掃描根目錄，即可使用星雲圖、樹圖、等高線、像素MV、筆記

1.x **免費更新**。源碼 MIT；本機優先，您的 Markdown 與素材永遠不上傳。

## 隱私與資料邊界

- 軟體僅在本機掃描您指定的資料夾，不上傳任何使用者資料  
- 僅「登入、下單、確認付款、領授權」時會連網（若未來啟用付費服務）  
- 卸載乾淨，您的資料不動

## 開發者

```bash
git clone https://github.com/Ya-MiC/ymz-atlas.git
cd ymz-atlas
pnpm install --config.dangerouslyAllowAllBuilds=true
pnpm tauri dev          # 需要 VS C++ Build Tools + WebView2
pnpm tauri build        # 產出 exe/msi
```

請在 **NTFS** 磁碟開發（exFAT 會讓 pnpm 失敗）。

## License

MIT © 晏銘湛箴 / Ya-MiC
