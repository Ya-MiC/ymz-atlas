/** 與 Rust license.rs 保持一致（臨時版本，待支付寶 AI 付架構確認後替換為伺服器簽章驗證） */

function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function looksLikeAuthCode(code: string): boolean {
  const c = normalizeCode(code);
  return c.startsWith("ATLAS-") && c.length >= 20 && /^ATLAS-[A-Z0-9-]+$/.test(c);
}

export function normalizeCodeExport(code: string): string {
  return normalizeCode(code);
}

const LS_KEY = "ymz-atlas-license";

export type LicenseRecord = {
  activatedAt: number;
  source: string;
  codeHint: string;
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

export async function activateLocal(_txnRaw?: string, codeRaw?: string): Promise<LicenseRecord> {
  if (!codeRaw || !codeRaw.trim()) {
    throw new Error("請輸入授權碼");
  }
  const code = normalizeCode(codeRaw);
  if (!looksLikeAuthCode(code)) {
    throw new Error("授權碼格式不對（例如 ATLAS-XXXX-…）");
  }
  const rec: LicenseRecord = {
    activatedAt: Date.now(),
    source: "alipay-vibe-pay",
    codeHint: `${code.slice(0, 6)}…${code.slice(-6)}`,
    code,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(rec));
  return rec;
}
