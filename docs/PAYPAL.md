# PayPal 收款要什麼？

收款郵箱：**cao417090217@gmail.com**

## 最低限度（現在這套 Buy Now + 訂單號兌換）

1. **PayPal 帳戶**已註冊，且能登入  
2. 郵箱 `cao417090217@gmail.com` 在 PayPal 裡是**已確認**狀態  
3. 帳戶**允許收款**（個人帳戶通常即可收 $0.99；若被限制，升級 Business）  
4. 能收 **USD**（按鈕幣別是 USD）  
5. **不需要** API Client ID 也能用官網「$0.99 購買」按鈕  

買家付完會收到收據郵件，裡面有 **Transaction ID** → 就是兌換用的訂單號。

## 建議再做（更穩）

| 項目 | 為什麼 |
|---|---|
| 升級 PayPal Business | 商品連結、報表比較清楚 |
| 在 PayPal 打開「付款通知 / IPN」或 Webhooks | 以後可自動發兌換碼（要一台小伺服器） |
| 收款貨幣加 HKD/其它 | 方便不同地區買家 |

## 你不需要先準備的

- 公司註冊（個人也能先收）  
- 信用卡清算合約  
- 寫進軟體的 PayPal 密碼（**千萬別**把 PayPal 密碼放進 GitHub）

## 人工核單流程（推薦你現在用）

1. 買家付款 → 你在 PayPal 活動記錄看到款項  
2. 買家把 Transaction ID 貼進軟體或 [兌換頁](https://ya-mic.github.io/ymz-atlas/redeem.html)  
3. 有疑慮時：你本機跑 `node scripts/gen-license.mjs <訂單號>` 對一下碼是否一致  

## 自動發碼（以後）

要用 PayPal REST API 或 IPN，需要：

- Business 帳戶  
- Developer Dashboard 建立 App → Client ID / Secret（只放伺服器環境變數）  
- 一個 HTTPS webhook 端點  

那是下一階段，**現在不必**。
