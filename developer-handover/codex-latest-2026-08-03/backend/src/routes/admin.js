import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { positiveId } from "../utils/validation.js";

const router = Router();
const previewCases = [
  { id: 1, reason: "Safety concern", details: "Preview moderation case", status: "reviewing", priority: "high", createdAt: new Date().toISOString() },
];
router.use(requireAuth, requireRole("moderator", "admin"));

router.get("/permissions", (request, response) => response.json({
  role: request.user.role,
  permissions: request.user.role === "admin"
    ? ["moderation:read", "moderation:write", "member:restrict", "appeal:resolve", "admin:manage"]
    : ["moderation:read", "moderation:write", "member:restrict", "appeal:resolve"],
}));

router.get("/moderation", async (_request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json(previewCases);
    return response.json(await query(
      `SELECT id,reporter_id AS reporterId,reported_user_id AS reportedUserId,reason,details,status,created_at AS createdAt
       FROM safety_reports WHERE status IN ('submitted','reviewing') ORDER BY created_at ASC LIMIT 200`,
    ));
  } catch (error) { return next(error); }
});

router.patch("/moderation/:caseId", async (request, response, next) => {
  try {
    const caseId = positiveId(request.params.caseId);
    const status = String(request.body?.status || "");
    if (!caseId || !["reviewing", "resolved", "dismissed"].includes(status)) return response.status(400).json({ message: "Invalid moderation decision." });
    if (databaseMode === "preview") {
      const item = previewCases.find((entry) => entry.id === caseId);
      if (item) item.status = status;
    } else {
      await query("UPDATE safety_reports SET status=? WHERE id=?", [status, caseId]);
      await query("INSERT INTO moderation_audit_log (case_id,actor_id,action,reason) VALUES (?,?,?,?)", [caseId, request.user.id, status, String(request.body?.reason || "").trim().slice(0, 500)]);
    }
    return response.json({ id: caseId, status });
  } catch (error) { return next(error); }
});

export default router;
