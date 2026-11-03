/** 與 Rust license.rs / website/redeem.html 同一算法 */
const SECRET = "ymz.atlas.paypal.v1.yanmingzhanzhen.0.99";

function normalizeTxn(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function looksLikePaypalTxn(txn: string): boolean {
  const t = normalizeTxn(txn);
  return t.length >= 15 && t.length <= 22 && /^[A-Z0-9]+$/.test(t);
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const dig = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function codeFromTxn(txnRaw: string): Promise<string> {
  const txn = normalizeTxn(txnRaw);
  if (!looksLikePaypalTxn(txn)) {
    throw new Error("PayPal 訂單號格式不對（Transaction ID，通常 15–22 位英數）");
  }
  const hex = await sha256Hex(`${SECRET}|${txn}`);
  const h = hex.slice(0, 20);
  return `ATLAS-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

const LS_KEY = "ymz-atlas-license";

export type LicenseRecord = {
  activatedAt: number;
  source: string;
  txnHint: string;
  code: string;
};

export function loadLocalLicense(): LicenseRecord | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function activateLocal(txnRaw: string, codeRaw?: string): Promise<LicenseRecord> {
  const expect = await codeFromTxn(txnRaw);
  if (codeRaw && codeRaw.trim()) {
    if (normalizeCode(codeRaw) !== expect) {
      throw new Error("兌換碼與訂單號不匹配");
    }
  }
  const txn = normalizeTxn(txnRaw);
  const rec: LicenseRecord = {
    activatedAt: Date.now(),
    source: "paypal-txn",
    txnHint: `${txn.slice(0, 4)}…${txn.slice(-4)}`,
    code: expect,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(rec));
  return rec;
}
