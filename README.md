# 星圖 Atlas

本機資料宇宙：**星雲圖 · 樹圖 · 等高線**  
Vue 3 + Tauri 2 + Rust · **¥0.01 買斷** · 支付寶 AI 付（一次買斷）

| | |
|---|---|
| 官網（含下載引導） | https://ya-mic.github.io/ymz-atlas/ |
| 授權頁 | https://ya-mic.github.io/ymz-atlas/authorize.html |
| 下載 exe / msi | https://github.com/Ya-MiC/ymz-atlas/releases/latest |
| 源碼 | https://github.com/Ya-MiC/ymz-atlas |

## 使用者：付款 → 授權 → 下載 → 啟用

1. **付款** [支付寶 AI 付 ¥0.01]()（支付寶掃碼，金額由伺服器固定為 ¥0.01，不接受客戶端篡改）  
2. 付款完成後取得 **授權碼**（伺服器簽發，離線驗證）  
3. 到 [Releases](https://github.com/Ya-MiC/ymz-atlas/releases/latest) 下載 **Windows 安裝包（.exe / .msi）** 並安裝  
4. 打開軟體，貼上**授權碼** → 離線驗證 → **啟用**

1.x **免費更新**。源碼 MIT；付費購買官方構建與授權金鑰。

支付寶收款說明：[`docs/ALIPAY.md`](docs/ALIPAY.md) （建立中，TODO(verify)：接入文檔參數待確認）

## 開發者

```bash
git clone https://github.com/Ya-MiC/ymz-atlas.git
cd ymz-atlas
pnpm install --config.dangerouslyAllowAllBuilds=true
pnpm tauri dev          # 需要 VS C++ Build Tools + WebView2
pnpm tauri build        # 產出 exe/msi
# TODO(verify): 支付寶 AI 付沙箱授權碼簽發腳本，待官方文檔確認後補上
```

請在 **NTFS** 磁碟開發（exFAT 會讓 pnpm 失敗）。

## License

MIT © 晏銘湛箴 / Ya-MiC
