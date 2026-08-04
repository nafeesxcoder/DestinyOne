import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { positiveId } from "../utils/validation.js";
import { pushProviderReadiness, registerPushDevice, revokePushDevice } from "../services/pushNotifications.js";

const router = Router();
const previewNotifications = [
  { id: 1, type: "match", title: "New thoughtful introduction", body: "A verified profile aligns with your relationship intent.", read: false, createdAt: new Date().toISOString() },
  { id: 2, type: "date", title: "Date plan updated", body: "Your public-place plan is ready to review.", read: false, createdAt: new Date().toISOString() },
];
router.use(requireAuth);

router.get("/push-readiness", (_request, response) => response.json(pushProviderReadiness()));

router.post("/devices", async (request, response) => {
  try {
    const device = await registerPushDevice(request.user.id, request.body || {});
    return response.status(201).json(device);
  } catch (error) {
    return response.status(400).json({ message: error instanceof Error ? error.message : "Push device could not be registered." });
  }
});

router.delete("/devices/:tokenHash", async (request, response, next) => {
  try {
    await revokePushDevice(request.user.id, String(request.params.tokenHash || ""));
    return response.status(204).end();
  } catch (error) { return next(error); }
});

router.get("/", async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json(previewNotifications);
    const rows = await query(
      `SELECT id,type,title,body,metadata_json AS metadata,read_at IS NOT NULL AS \`read\`,created_at AS createdAt
       FROM member_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`,
      [request.user.id],
    );
    return response.json(rows);
  } catch (error) { return next(error); }
});

router.patch("/:notificationId/read", async (request, response, next) => {
  try {
    const notificationId = positiveId(request.params.notificationId);
    if (!notificationId) return response.status(400).json({ message: "Invalid notification." });
    if (databaseMode === "preview") {
      const item = previewNotifications.find((notification) => notification.id === notificationId);
      if (item) item.read = true;
    } else await query("UPDATE member_notifications SET read_at=NOW() WHERE id=? AND user_id=?", [notificationId, request.user.id]);
    return response.json({ id: notificationId, read: true });
  } catch (error) { return next(error); }
});

router.post("/read-all", async (request, response, next) => {
  try {
    if (databaseMode === "preview") previewNotifications.forEach((item) => { item.read = true; });
    else await query("UPDATE member_notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL", [request.user.id]);
    return response.json({ status: "read" });
  } catch (error) { return next(error); }
});

export default router;
