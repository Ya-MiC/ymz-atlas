#!/usr/bin/env node
/**
 * 用法: node scripts/gen-license.mjs <PayPal交易號>
 * 給你自己核對訂單後，把輸出的 ATLAS- 碼寄給用戶（也可讓用戶用官網兌換頁自助生成）。
 */
import { createHash } from "node:crypto";

const SECRET = "ymz.atlas.paypal.v1.yanmingzhanzhen.0.99";
const txn = (process.argv[2] || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
if (txn.length < 15 || txn.length > 22) {
  console.error("用法: node scripts/gen-license.mjs <PayPal Transaction ID>");
  process.exit(1);
}
const hex = createHash("sha256").update(`${SECRET}|${txn}`).digest("hex").toUpperCase().slice(0, 20);
const code = `ATLAS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}`;
console.log(code);
