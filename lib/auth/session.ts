import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "rjl_session";

export function isAuthEnabled() {
  return Boolean(process.env.AUTH_PASSWORD);
}

export function createSessionToken() {
  const password = process.env.AUTH_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET || password || "dev-insecure-secret";
  return createHmac("sha256", secret).update(`rjl-knowledge:${password}`).digest("hex");
}

export function isValidSessionToken(token: string | undefined | null) {
  if (!isAuthEnabled()) return true;
  if (!token) return false;

  const expected = createSessionToken();
  const actual = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

export function verifyPassword(password: string) {
  const expected = process.env.AUTH_PASSWORD ?? "";
  if (!expected) return true;
  const actualBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
