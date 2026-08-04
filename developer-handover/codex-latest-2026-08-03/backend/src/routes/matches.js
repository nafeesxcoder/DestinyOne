import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { previewProfiles } from "../data/mockData.js";
import { requireAuth } from "../middleware/auth.js";
import { positiveId } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json(previewProfiles.map((profile, index) => ({ ...profile, matchReason: index === 0 ? "Shared family goals and marriage timeline" : "Aligned values and intent", status: "suggested" })));
    const rows = await query(
      `SELECT p.user_id AS id, u.first_name AS firstName, p.age, p.profession, p.city, p.intent,
       p.verified, p.image_url AS image, m.status FROM matches m
       JOIN profiles p ON p.user_id = m.matched_user_id JOIN users u ON u.id = p.user_id
       WHERE m.user_id = ? AND p.is_visible = 1 AND m.status != 'blocked' ORDER BY m.created_at DESC`, [request.user.id],
    );
    return response.json(rows);
  } catch (error) { return next(error); }
});

router.post("/:profileId/decision", async (request, response, next) => {
  try {
    const profileId = positiveId(request.params.profileId);
    const kind = String(request.body?.kind || "");
    if (!profileId || !["interested", "passed", "spark"].includes(kind)) return response.status(400).json({ message: "Invalid match decision." });
    const status = kind === "passed" ? "passed" : "interested";
    if (databaseMode === "mysql") await query("INSERT INTO matches (user_id, matched_user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)", [request.user.id, profileId, status]);
    return response.json({ profileId, status: kind === "spark" ? "spark_sent" : status });
  } catch (error) { return next(error); }
});

router.delete("/:profileId", async (request, response, next) => {
  try {
    const profileId = positiveId(request.params.profileId);
    if (!profileId) return response.status(400).json({ message: "Invalid member." });
    if (databaseMode === "mysql") await query("UPDATE matches SET status='passed' WHERE user_id=? AND matched_user_id=?", [request.user.id, profileId]);
    return response.json({ profileId, status: "unmatched" });
  } catch (error) { return next(error); }
});

export default router;
