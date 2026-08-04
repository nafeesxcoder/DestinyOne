import { createHash, createHmac, randomUUID } from "node:crypto";
import { Router } from "express";
import { previewPlans } from "../data/mockData.js";
import { databaseMode, pool, query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const sha256 = value => createHash("sha256").update(String(value)).digest("hex");
const validKey = value => /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/.test(String(value || ""));
const validStatuses = new Set(["active","grace_period","billing_retry","expired","refunded","chargeback","revoked"]);

router.get("/plans", (_request, response) => response.json(previewPlans));

router.get("/status", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ planId: "essential", status: "preview", renewsAt: null, purchaseProvider: "not_connected" });
    const rows = await query("SELECT plan_id AS planId,status,renews_at AS renewsAt,purchase_provider AS purchaseProvider FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1", [request.user.id]);
    return response.json(rows[0] || { planId: "free", status: "inactive", renewsAt: null, purchaseProvider: null });
  } catch (error) { return next(error); }
});

router.post("/checkout", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") {
      const plan = previewPlans.find(item => item.id === request.body?.planId);
      if (!plan) return response.status(404).json({ message: "Plan not found." });
      return response.json({ status: "preview", message: `${plan.name} selected. Payment provider will be connected before launch.` });
    }
    const { productKey, platform, idempotencyKey } = request.body || {};
    if (!validKey(productKey) || !["apple_iap","google_play"].includes(platform) || !validKey(idempotencyKey)) return response.status(400).json({ message: "Signed iOS/Android checkout details are required. No charge was created." });
    const products = await query("SELECT product_key AS productKey,external_product_id AS externalProductId FROM billing_products WHERE product_key=? AND platform=? AND active=TRUE LIMIT 1", [productKey,platform]);
    if (!products[0]) return response.status(409).json({ message: "This store product is not active." });
    const existing = await query("SELECT id,expires_at AS expiresAt FROM billing_purchase_sessions WHERE user_id=? AND idempotency_key=? LIMIT 1", [request.user.id,idempotencyKey]);
    if (existing[0]) return response.json({ purchaseSessionId: existing[0].id, externalProductId: products[0].externalProductId, platform, expiresAt: existing[0].expiresAt });
    const id = randomUUID();
    await query("INSERT INTO billing_purchase_sessions (id,user_id,product_key,platform,idempotency_key,expires_at) VALUES (?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))", [id,request.user.id,productKey,platform,idempotencyKey]);
    return response.status(201).json({ purchaseSessionId: id, externalProductId: products[0].externalProductId, platform, expiresAt: new Date(Date.now()+1800000).toISOString() });
  } catch (error) { return next(error); }
});

router.post("/verify", requireAuth, async (request, response, next) => {
  const verifierUrl = process.env.STORE_PURCHASE_VERIFIER_URL;
  const verifierSecret = process.env.STORE_PURCHASE_VERIFIER_SECRET;
  const { purchaseSessionId, platform, productId, purchaseToken, transactionId = null } = request.body || {};
  if (databaseMode === "preview") return response.status(503).json({ message: "Receipt verification is disabled in preview. No entitlement was changed." });
  if (!/^[0-9a-f-]{36}$/i.test(String(purchaseSessionId || "")) || !["apple_iap","google_play"].includes(platform) || !String(productId || "").match(/^.{3,190}$/) || !String(purchaseToken || "").match(/^.{8,12000}$/)) return response.status(400).json({ message: "Invalid verification request." });
  try {
    const sessions = await query(`SELECT s.id,s.product_key AS productKey,s.platform,p.external_product_id AS externalProductId,p.plan_id AS planId,p.product_type AS productType,p.entitlement_key AS entitlementKey,p.units
      FROM billing_purchase_sessions s JOIN billing_products p ON p.product_key=s.product_key
      WHERE s.id=? AND s.user_id=? AND s.status='prepared' AND s.expires_at>NOW() LIMIT 1`, [purchaseSessionId,request.user.id]);
    const session = sessions[0];
    if (!session || session.platform !== platform || session.externalProductId !== productId) return response.status(409).json({ message: "Purchase session is unavailable." });
    const tokenHash = sha256(purchaseToken); const transactionHash = transactionId ? sha256(transactionId) : null;
    const owned = await query("SELECT user_id AS userId FROM billing_verification_attempts WHERE purchase_token_hash=? LIMIT 1", [tokenHash]);
    if (owned[0] && Number(owned[0].userId) !== Number(request.user.id)) return response.status(409).json({ message: "This receipt belongs to another account." });
    const attemptId = randomUUID();
    await query(`INSERT INTO billing_verification_attempts (id,user_id,purchase_session_id,purchase_token_hash,transaction_hash,status)
      VALUES (?,?,?,?,?,'pending') ON DUPLICATE KEY UPDATE updated_at=NOW()`, [attemptId,request.user.id,purchaseSessionId,tokenHash,transactionHash]);
    if (!verifierUrl || !verifierSecret || !verifierUrl.startsWith("https://")) {
      await query("UPDATE billing_verification_attempts SET status='provider_unavailable',error_code='verifier_not_configured' WHERE purchase_token_hash=?", [tokenHash]);
      return response.status(503).json({ message: "Store verifier is not configured. No entitlement was changed." });
    }
    const providerBody = JSON.stringify({ platform,productId,purchaseToken,transactionId,packageName:"com.destinyone.app",purchaseSessionId,accountId:String(request.user.id) });
    const signature = createHmac("sha256", verifierSecret).update(providerBody).digest("hex");
    const providerResponse = await fetch(verifierUrl, { method:"POST",headers:{"Content-Type":"application/json","x-destinyone-signature":signature},body:providerBody,signal:AbortSignal.timeout(15000) });
    const verified = await providerResponse.json().catch(() => null);
    const valid = providerResponse.ok && verified?.verified === true && verified.platform === platform && verified.productId === productId &&
      typeof verified.eventId === "string" && typeof verified.transactionId === "string" && validStatuses.has(verified.status) &&
      Number.isInteger(verified.amountCents) && verified.amountCents >= 0 && /^[A-Za-z]{3}$/.test(verified.currency || "") &&
      ["sandbox","production"].includes(verified.environment) && typeof verified.providerSignedAt === "string" &&
      verified.verificationSource === (platform === "apple_iap" ? "apple_server_api" : "google_play_api");
    if (!valid) {
      await query("UPDATE billing_verification_attempts SET status='rejected',error_code='receipt_rejected' WHERE purchase_token_hash=?", [tokenHash]);
      return response.status(422).json({ message: "The app store could not verify this purchase. No entitlement was changed." });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const verifiedTransactionHash = sha256(verified.transactionId);
      const [existingReceipts] = await connection.execute("SELECT user_id AS userId FROM billing_purchase_receipts WHERE transaction_hash=? LIMIT 1 FOR UPDATE", [verifiedTransactionHash]);
      if (existingReceipts[0] && Number(existingReceipts[0].userId) !== Number(request.user.id)) throw new Error("receipt_owner_mismatch");
      await connection.execute(`INSERT INTO billing_purchase_receipts (id,user_id,purchase_session_id,provider_event_hash,transaction_hash,status,amount_cents,currency,expires_at)
        VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),expires_at=VALUES(expires_at)`, [randomUUID(),request.user.id,purchaseSessionId,sha256(verified.eventId),verifiedTransactionHash,verified.status,verified.amountCents,String(verified.currency).toLowerCase(),verified.expiresAt ? new Date(verified.expiresAt) : null]);
      const activeStatus = verified.status;
      if (session.productType === "consumable") {
        const credit = ["active","grace_period","billing_retry"].includes(verified.status) && !existingReceipts[0] ? Number(session.units) : 0;
        await connection.execute(`INSERT INTO billing_entitlements (user_id,entitlement_key,status,units,expires_at) VALUES (?,?,?,?,?)
          ON DUPLICATE KEY UPDATE status=VALUES(status),units=units+?,expires_at=VALUES(expires_at)`, [request.user.id,session.entitlementKey,activeStatus,credit,verified.expiresAt ? new Date(verified.expiresAt) : null,credit]);
      } else {
        const subscriptionStatus = ["active","grace_period"].includes(verified.status) ? "active" : verified.status === "billing_retry" ? "past_due" : "cancelled";
        if (existingReceipts[0]) await connection.execute("UPDATE subscriptions SET status=?,renews_at=? WHERE user_id=? AND provider_purchase_id=?", [subscriptionStatus,verified.expiresAt ? new Date(verified.expiresAt) : null,request.user.id,verifiedTransactionHash]);
        else await connection.execute("INSERT INTO subscriptions (user_id,plan_id,status,renews_at,purchase_provider,provider_purchase_id) VALUES (?,?,?,?,?,?)", [request.user.id,session.planId,subscriptionStatus,verified.expiresAt ? new Date(verified.expiresAt) : null,platform === "apple_iap" ? "apple" : "google",verifiedTransactionHash]);
      }
      await connection.execute("UPDATE billing_purchase_sessions SET status='verified' WHERE id=? AND user_id=?", [purchaseSessionId,request.user.id]);
      await connection.execute("UPDATE billing_verification_attempts SET status='verified',error_code=NULL WHERE purchase_token_hash=?", [tokenHash]);
      await connection.commit();
      return response.json({ verified:true,finishedTransactionAllowed:true,entitlement:{ key:session.entitlementKey,status:activeStatus,units:Number(session.units),expiresAt:verified.expiresAt || null } });
    } catch (error) {
      await connection.rollback();
      await query("UPDATE billing_verification_attempts SET status='ledger_failed',error_code='ledger_rejected' WHERE purchase_token_hash=?", [tokenHash]);
      if (error instanceof Error && error.message === "receipt_owner_mismatch") return response.status(409).json({ message: "This receipt belongs to another account." });
      throw error;
    } finally { connection.release(); }
  } catch (error) { return next(error); }
});

router.post("/restore", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ status: "preview", restored: false, message: "No App Store or Google Play receipt is connected in preview." });
    const rows = await query("SELECT plan_id AS planId,status,renews_at AS renewsAt,purchase_provider AS purchaseProvider FROM subscriptions WHERE user_id=? AND purchase_provider IN ('apple','google') AND status IN ('active','past_due') ORDER BY created_at DESC LIMIT 1", [request.user.id]);
    return response.json({ status: rows[0] ? "restored" : "not_found", restored: Boolean(rows[0]), subscription: rows[0] || null, providerSyncRequired: true });
  } catch (error) { return next(error); }
});

export default router;
