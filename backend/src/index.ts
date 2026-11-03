/**
 * 星圖 Atlas - 支付寶 AI 付後端（Cloudflare Workers）
 *
 * 三個端點：
 *   POST /orders          - 建立訂單（金額由伺服端固定 ¥0.01）
 *   POST /notify          - 接收支付寶非同步通知並驗簽
 *   GET  /orders/:id      - 查詢訂單狀態並簽發授權憑證
 *
 * 鐵律：
 *   - 私鑰、AppID、支付寶公鑰僅存在 Workers Secret，不進前端、不進桌面程式、不進倉庫
 *   - 金額由伺服端決定，不接受客戶端傳入金額
 *   - 授權憑證用 Ed25519 簽章，桌面端僅內嵌公鑰離線驗證
 */

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem.replace(/-----BEGIN.*-----/, "").replace(/-----END.*-----/, "").replace(/\s/g, "");
  const raw = base64UrlDecode(b64);
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const b64 = pem.replace(/-----BEGIN.*-----/, "").replace(/-----END.*-----/, "").replace(/\s/g, "");
  const raw = base64UrlDecode(b64);
  return crypto.subtle.importKey(
    "spki",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function importEd25519PrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem.replace(/-----BEGIN.*-----/, "").replace(/-----END.*-----/, "").replace(/\s/g, "");
  const raw = base64UrlDecode(b64);
  return crypto.subtle.importKey("pkcs8", raw, { name: "Ed25519" }, false, ["sign"]);
}

/** 支付寶參數簽名（RSASSA-PKCS1-v1_5 + SHA-256，標準開放平台簽名方式） */
async function alipaySign(
  params: Record<string, string>,
  privateKeyPem: string
): Promise<string> {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && k !== "sign")
    .sort();
  const plain = sorted.map((k) => `${k}=${params[k]}`).join("&");
  const encoder = new TextEncoder();
  const key = await importRsaPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, encoder.encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** 驗證支付寶通知簽名（RSASSA-PKCS1-v1_5 + SHA-256） */
async function verifyAlipaySign(
  params: Record<string, string>,
  alipayPublicKeyPem: string
): Promise<boolean> {
  const sign = params["sign"];
  const signType = params["sign_type"] || "RSA2";
  if (!sign) return false;

  const sorted = Object.keys(params)
    .filter((k) => params[k] !== "" && k !== "sign" && k !== "sign_type")
    .sort();
  const plain = sorted.map((k) => `${k}=${params[k]}`).join("&");
  const encoder = new TextEncoder();
  const key = await importRsaPublicKey(alipayPublicKeyPem);
  const sig = base64UrlDecode(sign);
  return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sig, encoder.encode(plain));
}

/** Ed25519 簽發授權憑證（伺服端私鑰簽名，桌面端公鑰離線驗證） */
async function signAuthCode(
  ed25519PrivateKeyPem: string,
  payload: { outTradeNo: string; code: string; activatedAt: number }
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await importEd25519PrivateKey(ed25519PrivateKeyPem);
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key, encoder.encode(JSON.stringify(payload)));
  return base64UrlEncode(sig);
}
// ===== 環境變數（透過 wrangler secret / .env 注入，不進倉庫）=====
interface Env {
  ALIPAY_APP_ID: string;
  ALIPAY_PRIVATE_KEY: string;      // RSA PKCS#8 私鑰 PEM（簽名用）
  ALIPAY_ALIPAY_PUBLIC_KEY: string;// 支付寶公鑰 PEM（驗簽用）
  ALIPAY_GATEWAY: string;          // 沙箱或正式網關
  AUTH_ED25519_PRIVATE_KEY: string;// Ed25519 私鑰（簽發授權憑證）
  AUTH_ED25519_PUBLIC_KEY: string; // Ed25519 公鑰（桌面端離線驗證，可進前端）
  ATLAS_PRICE_CNY: string;         // 伺服端固定金額，例如 "0.01"
}

// ===== 工具函式 =====

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function err(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

/** 產生唯一商戶訂單號 */
function makeOutTradeNo(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `ATLAS_${ts}_${rand}`;
}

/** 簡單記憶體儲存（生產環境請換成 Cloudflare D1 / KV） */
const orders = new Map<string, {
  outTradeNo: string;
  amount: string;
  currency: string;
  status: "WAIT_BUYER_PAY" | "TRADE_SUCCESS" | "TRADE_CLOSED";
  tradeNo?: string;
  authCode?: string;
  authSignature?: string;
  createdAt: number;
  paidAt?: number;
}>();

// ===== 路由 =====

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 健康檢查
    if (path === "/health" && method === "GET") {
      return json({ ok: true, service: "ymz-atlas-pay", priceCny: env.ATLAS_PRICE_CNY });
    }

    // 1. 建立訂單（金額由伺服端固定，不接受客戶端傳入）
    if (path === "/orders" && method === "POST") {
      const outTradeNo = makeOutTradeNo();
      const order = {
        outTradeNo,
        amount: env.ATLAS_PRICE_CNY, // 伺服端固定 ¥0.01
        currency: "CNY",
        status: "WAIT_BUYER_PAY" as const,
        createdAt: Date.now(),
      };
      orders.set(outTradeNo, order);
      return json({
        ok: true,
        outTradeNo,
        amount: order.amount,
        currency: order.currency,
        // TODO(verify): 正式接入時，此處應回傳支付寶下單所需的 orderStr 或 二維碼內容
        payUrl: `${env.ALIPAY_GATEWAY}?app_id=${env.ALIPAY_APP_ID}&out_trade_no=${outTradeNo}&amount=${order.amount}`,
      });
    }

    // 2. 支付寶非同步通知（伺服端驗簽後標記訂單成功，簽發授權）
    if (path === "/notify" && method === "POST") {
      const form = await request.formData();
      const params: Record<string, string> = {};
      for (const [k, v] of form.entries()) {
        params[k] = String(v);
      }

      // 驗簽
      if (!verifyAlipaySign(params, env.ALIPAY_ALIPAY_PUBLIC_KEY)) {
        return err("簽名驗證失敗", 401);
      }

      const outTradeNo = params["out_trade_no"];
      const tradeStatus = params["trade_status"];
      const tradeNo = params["trade_no"];
      const totalAmount = params["total_amount"];

      // 金額由伺服端決定，拒絕客戶端篡改金額
      const order = orders.get(outTradeNo);
      if (!order) {
        return err("訂單不存在", 404);
      }
      if (totalAmount && totalAmount !== order.amount) {
        // TODO(verify)：正式環境應拒絕並記錄風險
        return err("金額與伺服端訂單不符", 400);
      }

      if (tradeStatus === "TRADE_SUCCESS") {
        order.status = "TRADE_SUCCESS";
        order.tradeNo = tradeNo;
        order.paidAt = Date.now();

        // 產生授權碼並用 Ed25519 簽章
        const authCode = `ATLAS-${outTradeNo.slice(-8)}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        const signature = await signAuthCode(env.AUTH_ED25519_PRIVATE_KEY, {
          outTradeNo,
          code: authCode,
          activatedAt: Date.now(),
        });
        order.authCode = authCode;
        order.authSignature = signature;

        // TODO(verify)：正式接入時，回傳 "success" 告知支付寶不要重複通知
        return new Response("success", { status: 200 });
      }

      return new Response("success", { status: 200 });
    }

    // 3. 查詢訂單狀態（前端或桌面應用輪詢用）
    if (path.startsWith("/orders/") && method === "GET") {
      const outTradeNo = path.split("/").pop();
      if (!outTradeNo) return err("缺少訂單號", 400);

      const order = orders.get(outTradeNo);
      if (!order) return err("訂單不存在", 404);

      return json({
        ok: true,
        outTradeNo: order.outTradeNo,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        tradeNo: order.tradeNo,
        authCode: order.status === "TRADE_SUCCESS" ? order.authCode : undefined,
        authSignature: order.status === "TRADE_SUCCESS" ? order.authSignature : undefined,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      });
    }

    return err("找不到端點", 404);
  },
};
