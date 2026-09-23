import {
  isAuthEnabled,
  isValidPasswordSession,
  readUserSession,
} from "@/lib/auth/session";

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  const allowed = getAdminEmails();
  if (allowed.length === 0) return true;
  return Boolean(email && allowed.includes(email.trim().toLowerCase()));
}

export function isAdminSession(token?: string | null) {
  if (!isAuthEnabled()) return true;

  const user = readUserSession(token);
  if (user) return isAdminEmail(user.email);

  const allowed = getAdminEmails();
  if (allowed.length === 0 && isValidPasswordSession(token)) return true;
  return false;
}
