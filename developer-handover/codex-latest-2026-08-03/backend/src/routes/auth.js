import bcrypt from "bcryptjs";
import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { previewUser } from "../data/mockData.js";
import { requireAuth, setSessionCookie, signSession } from "../middleware/auth.js";
import { normalizeEmail, validateCredentials } from "../utils/validation.js";

const router = Router();
const publicUser = (user) => ({ id: user.id, firstName: user.firstName, email: user.email, city: user.city || "", intent: user.intent || "", verified: Boolean(user.verified), role: user.role || "member" });

router.post("/register", async (request, response, next) => {
  try {
    const firstName = String(request.body?.firstName || "").trim();
    const email = normalizeEmail(request.body?.email);
    const password = String(request.body?.password || "");
    const errors = validateCredentials({ firstName, email, password, requireName: true });
    if (errors.length) return response.status(400).json({ message: errors[0], errors });
    if (databaseMode === "preview") {
      const user = { ...previewUser, firstName, email };
      setSessionCookie(response, signSession(user));
      return response.status(201).json({ user: publicUser(user), mode: "preview" });
    }
    const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) return response.status(409).json({ message: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query("INSERT INTO users (first_name, email, password_hash) VALUES (?, ?, ?)", [firstName, email, passwordHash]);
    await query("INSERT INTO profiles (user_id, city, intent) VALUES (?, '', '')", [result.insertId]);
    const user = { id: result.insertId, firstName, email };
    setSessionCookie(response, signSession(user));
    return response.status(201).json({ user: publicUser(user), mode: "mysql" });
  } catch (error) { return next(error); }
});

router.post("/login", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body?.email);
    const password = String(request.body?.password || "");
    const errors = validateCredentials({ email, password });
    if (errors.length) return response.status(400).json({ message: errors[0] });
    if (databaseMode === "preview") {
      const user = { ...previewUser, email };
      setSessionCookie(response, signSession(user));
      return response.json({ user: publicUser(user), mode: "preview" });
    }
    const rows = await query("SELECT id, first_name AS firstName, email, password_hash AS passwordHash, city, intent, verified, role FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return response.status(401).json({ message: "Email or password is incorrect." });
    setSessionCookie(response, signSession(user));
    return response.json({ user: publicUser(user), mode: "mysql" });
  } catch (error) { return next(error); }
});

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ user: publicUser(previewUser), mode: "preview" });
    const rows = await query("SELECT id, first_name AS firstName, email, city, intent, verified, role FROM users WHERE id = ? LIMIT 1", [request.user.id]);
    return response.json({ user: rows[0] ? publicUser(rows[0]) : null, mode: "mysql" });
  } catch (error) { return next(error); }
});

router.post("/logout", (_request, response) => {
  response.clearCookie("destinyone_session", { path: "/" });
  response.status(204).end();
});

export default router;
