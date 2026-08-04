import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { canTransitionDatePlan, datePlanStatuses, normalizeDateFeedback } from "../services/dateLifecycle.js";
import { positiveId } from "../utils/validation.js";

const router = Router();
const previewPlans = new Map();
const previewFeedback = new Map();
router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json([...previewPlans.values()]);
    return response.json(await query(
      `SELECT DISTINCT dp.id, dp.conversation_id AS conversationId, dp.venue, dp.area,
       dp.scheduled_at AS scheduledAt, dp.status, dp.created_at AS createdAt
       FROM date_plans dp LEFT JOIN conversations c ON c.id=dp.conversation_id
       LEFT JOIN matches m ON m.id=c.match_id
       WHERE dp.created_by=? OR m.user_id=? OR m.matched_user_id=? ORDER BY dp.created_at DESC`,
      [request.user.id, request.user.id, request.user.id],
    ));
  } catch (error) { return next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const venue = String(request.body?.venue || "").trim().slice(0, 160);
    const area = String(request.body?.area || "").trim().slice(0, 120);
    const scheduledAt = request.body?.scheduledAt || null;
    const conversationId = positiveId(request.body?.conversationId);
    if (!venue || !area) return response.status(400).json({ message: "Date idea and area are required." });
    if (databaseMode === "preview") {
      const plan = { id: Date.now(), conversationId, venue, area, scheduledAt, status: "proposed", createdAt: new Date().toISOString() };
      previewPlans.set(plan.id, plan);
      return response.status(201).json(plan);
    }
    const result = await query("INSERT INTO date_plans (conversation_id, created_by, venue, area, scheduled_at) VALUES (?, ?, ?, ?, ?)", [conversationId, request.user.id, venue, area, scheduledAt]);
    return response.status(201).json({ id: result.insertId, conversationId, venue, area, scheduledAt, status: "proposed" });
  } catch (error) { return next(error); }
});

router.patch("/:datePlanId/status", async (request, response, next) => {
  try {
    const datePlanId = positiveId(request.params.datePlanId);
    const status = String(request.body?.status || "");
    if (!datePlanId || !datePlanStatuses.has(status)) return response.status(400).json({ message: "Invalid date plan status." });
    if (databaseMode === "preview") {
      const current = previewPlans.get(datePlanId) || { id: datePlanId, status: "proposed" };
      if (!canTransitionDatePlan(current.status, status)) return response.status(409).json({ message: `A ${current.status} plan cannot move to ${status}.` });
      const updated = { ...current, status, updatedAt: new Date().toISOString() };
      previewPlans.set(datePlanId, updated);
      return response.json(updated);
    }
    const rows = await query(
      `SELECT DISTINCT dp.id, dp.status FROM date_plans dp LEFT JOIN conversations c ON c.id=dp.conversation_id
       LEFT JOIN matches m ON m.id=c.match_id WHERE dp.id=? AND (dp.created_by=? OR m.user_id=? OR m.matched_user_id=?) LIMIT 1`,
      [datePlanId, request.user.id, request.user.id, request.user.id],
    );
    const current = rows[0];
    if (!current) return response.status(404).json({ message: "Date plan not found." });
    if (!canTransitionDatePlan(current.status, status)) return response.status(409).json({ message: `A ${current.status} plan cannot move to ${status}.` });
    await query("UPDATE date_plans SET status=? WHERE id=?", [status, datePlanId]);
    await query("INSERT INTO date_plan_events (date_plan_id, actor_id, from_status, to_status, reason) VALUES (?, ?, ?, ?, ?)", [datePlanId, request.user.id, current.status, status, String(request.body?.reason || "").trim().slice(0, 500)]);
    return response.json({ id: datePlanId, status, previousStatus: current.status });
  } catch (error) { return next(error); }
});

router.post("/:datePlanId/feedback", async (request, response, next) => {
  try {
    const datePlanId = positiveId(request.params.datePlanId);
    const feedback = normalizeDateFeedback(request.body);
    if (!datePlanId || !feedback) return response.status(400).json({ message: "Choose a valid private date outcome." });
    if (databaseMode === "preview") {
      const saved = { id: Date.now(), datePlanId, userId: request.user.id, ...feedback, updatedAt: new Date().toISOString() };
      previewFeedback.set(`${datePlanId}:${request.user.id}`, saved);
      return response.status(201).json(saved);
    }
    const plan = await query(
      `SELECT dp.id,dp.status FROM date_plans dp LEFT JOIN conversations c ON c.id=dp.conversation_id
       LEFT JOIN matches m ON m.id=c.match_id WHERE dp.id=? AND (dp.created_by=? OR m.user_id=? OR m.matched_user_id=?) LIMIT 1`,
      [datePlanId, request.user.id, request.user.id, request.user.id],
    );
    if (!plan[0]) return response.status(404).json({ message: "Date plan not found." });
    if (plan[0].status !== "completed") return response.status(409).json({ message: "Private feedback opens after a completed date." });
    await query(
      `INSERT INTO date_feedback (date_plan_id,user_id,outcome,felt_safe,use_for_matching,notes)
       VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE outcome=VALUES(outcome),felt_safe=VALUES(felt_safe),use_for_matching=VALUES(use_for_matching),notes=VALUES(notes),updated_at=NOW()`,
      [datePlanId, request.user.id, feedback.outcome, feedback.feltSafe, feedback.useForMatching, feedback.notes],
    );
    return response.status(201).json({ datePlanId, ...feedback });
  } catch (error) { return next(error); }
});

export default router;
