export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateCredentials({ email, password, firstName, requireName = false }) {
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) errors.push("Enter a valid email address.");
  if (String(password || "").length < 8) errors.push("Password must be at least 8 characters.");
  if (requireName && String(firstName || "").trim().length < 2) errors.push("First name is required.");
  return errors;
}

export function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
