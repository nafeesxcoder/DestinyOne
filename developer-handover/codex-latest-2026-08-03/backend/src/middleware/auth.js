import jwt from "jsonwebtoken";
import { databaseMode } from "../config/db.js";

const secret = process.env.JWT_SECRET || "destinyone-local-preview-secret-change-before-production";

export function signSession(user) {
  return jwt.sign({ sub: String(user.id), email: user.email, role: user.role || "member" }, secret, { expiresIn: "7d", issuer: "destinyone" });
}

export function verifySessionToken(token) {
  const payload = jwt.verify(token, secret, { issuer: "destinyone" });
  return { id: Number(payload.sub), email: payload.email, role: ["member", "moderator", "admin"].includes(payload.role) ? payload.role : "member" };
}

export function setSessionCookie(response, token) {
  response.cookie("destinyone_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", maxAge: 604800000, path: "/" });
}

export function requireAuth(request, response, next) {
  if (databaseMode === "preview") {
    const previewRole = ["member", "moderator", "admin"].includes(request.headers["x-preview-role"]) ? request.headers["x-preview-role"] : "member";
    request.user = { id: 1, email: "preview@destinyone.app", role: previewRole };
    return next();
  }
  const header = request.headers.authorization;
  const token = request.cookies?.destinyone_session || (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return response.status(401).json({ message: "Please sign in to continue." });
  try {
    request.user = verifySessionToken(token);
    return next();
  } catch {
    return response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) return response.status(403).json({ message: "You do not have permission to access this workspace." });
    return next();
  };
}
