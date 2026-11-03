# 星圖 Atlas

本機資料宇宙：**星雲圖 · 樹圖 · 等高線**  
Vue 3 + Tauri 2 + Rust · **$0.99 買斷** · PayPal：`cao417090217@gmail.com`

| | |
|---|---|
| 官網（含下載引導） | https://ya-mic.github.io/ymz-atlas/ |
| 兌換碼頁 | https://ya-mic.github.io/ymz-atlas/redeem.html |
| 下載 exe / msi | https://github.com/Ya-MiC/ymz-atlas/releases/latest |
| 源碼 | https://github.com/Ya-MiC/ymz-atlas |

## 使用者：付款 → 兌換 → 下載 → 啟用

1. **付款** [PayPal $0.99](https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=cao417090217%40gmail.com&item_name=Atlas%20Official%20Build%20v0.1&amount=0.99&currency_code=USD)  
2. 收據複製 **Transaction ID**（訂單號）  
3. 打開 [兌換頁](https://ya-mic.github.io/ymz-atlas/redeem.html) 生成 `ATLAS-…` 兌換碼（可保存）  
4. 到 [Releases](https://github.com/Ya-MiC/ymz-atlas/releases/latest) 下載 **Windows 安裝包（.exe / .msi）** 並安裝  
5. 打開軟體，貼上**訂單號** → 自動算出兌換碼 → **啟用**

1.x **免費更新**。源碼 MIT；付費購買官方構建與維護。

PayPal 收款準備說明：[`docs/PAYPAL.md`](docs/PAYPAL.md)

## 開發者

```bash
git clone https://github.com/Ya-MiC/ymz-atlas.git
cd ymz-atlas
pnpm install --config.dangerouslyAllowAllBuilds=true
pnpm tauri dev          # 需要 VS C++ Build Tools + WebView2
pnpm tauri build        # 產出 exe/msi
node scripts/gen-license.mjs <PayPal交易號>
```

請在 **NTFS** 磁碟開發（exFAT 會讓 pnpm 失敗）。

## License

MIT © 晏銘湛箴 / Ya-MiC
