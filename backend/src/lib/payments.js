import crypto from "crypto";
import { prisma } from "./prisma.js";

// Mock payment adapter. Swap to Razorpay in production:
//   - createOrder → razorpay.orders.create(...)
//   - verifyPayment → validates razorpay_signature HMAC SHA256
//   - refund → razorpay.payments.refund(...)
//   - webhookVerify → HMAC verification against RAZORPAY_WEBHOOK_SECRET

export async function createOrder({ amount, currency = "INR", receipt }) {
  const orderId = "mock_order_" + crypto.randomBytes(8).toString("hex");
  return { orderId, amount, currency, receipt };
}

export async function verifyPayment({ orderId, paymentId, signature }) {
  if (process.env.RAZORPAY_KEY_SECRET) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }
  return signature === "MOCK_OK";
}

export async function refund({ paymentId, amount }) {
  return { refundId: "mock_rfnd_" + crypto.randomBytes(6).toString("hex"), paymentId, amount };
}

export async function webhookVerify({ body, signature }) {
  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    return expected === signature;
  }
  return signature === "MOCK_OK";
}

export async function commissionPercentFor(type) {
  const key = type === "mentor" ? "mentor_commission_percent" : "assignment_commission_percent";
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  try { return row ? JSON.parse(row.value).value : (type === "mentor" ? 15 : 25); } catch { return 25; }
}

export async function getSetting(key, fallback) {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value).value; } catch { return fallback; }
}
