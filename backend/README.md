# 星圖 Atlas - 支付寶 AI 付後端（Cloudflare Workers）

## 三個端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `POST /orders` | 建立訂單 | 金額由伺服端固定 ¥0.01，不接受客戶端傳入 |
| `POST /notify` | 支付寶非同步通知 | 驗簽後標記訂單成功，簽發 Ed25519 授權憑證 |
| `GET /orders/:id` | 查詢訂單 | 回傳狀態與授權碼（已付款時） |

## 部署

```bash
cd backend
pnpm install
# 設定 Secrets（不進倉庫）
wrangler secret put ALIPAY_APP_ID
wrangler secret put ALIPAY_PRIVATE_KEY
wrangler secret put ALIPAY_ALIPAY_PUBLIC_KEY
wrangler secret put ALIPAY_GATEWAY
wrangler secret put AUTH_ED25519_PRIVATE_KEY
wrangler deploy
```

## 鐵律

- 私鑰、AppID、支付寶公鑰僅存在 Workers Secret，不進前端、不進桌面程式、不進倉庫
- 金額由伺服端決定（`ATLAS_PRICE_CNY`），客戶端不可篡改
- 授權憑證用 Ed25519 簽章，桌面端僅內嵌公鑰離線驗證
