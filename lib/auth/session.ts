import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "rjl_session";
export const OAUTH_COOKIE = "rjl_oauth";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  email: string;
  name: string;
  picture?: string;
  sub: string;
  exp: number;
};

export function isGoogleAuthEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isPasswordAuthEnabled() {
  return Boolean(process.env.AUTH_PASSWORD);
}

export function isAuthEnabled() {
  return isGoogleAuthEnabled() || isPasswordAuthEnabled();
}

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AUTH_PASSWORD ||
    "dev-insecure-secret"
  );
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function encodePayload(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodePayload<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createUserSessionToken(user: Omit<SessionUser, "exp">) {
  return encodePayload({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  } satisfies SessionUser);
}

export function readUserSession(token: string | undefined | null): SessionUser | null {
  const user = decodePayload<SessionUser>(token);
  if (!user?.email || !user.exp) return null;
  if (user.exp < Math.floor(Date.now() / 1000)) return null;
  return user;
}

export function createOAuthStateToken(payload: { state: string; verifier: string; next: string }) {
  return encodePayload({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 10,
  });
}

export function readOAuthStateToken(token: string | undefined | null) {
  const payload = decodePayload<{ state: string; verifier: string; next: string; exp: number }>(token);
  if (!payload?.state || !payload.verifier || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export function createPasswordSessionToken() {
  const password = process.env.AUTH_PASSWORD ?? "";
  return createHmac("sha256", getAuthSecret()).update(`rjl-knowledge:${password}`).digest("hex");
}

export function isValidPasswordSession(token: string | undefined | null) {
  if (!isPasswordAuthEnabled() || !token) return false;
  const expected = createPasswordSessionToken();
  const actual = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

export function isValidSessionToken(token: string | undefined | null) {
  if (!isAuthEnabled()) return true;
  if (readUserSession(token)) return true;
  if (isPasswordAuthEnabled() && isValidPasswordSession(token)) return true;
  return false;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
}

export function verifyPassword(password: string) {
  const expected = process.env.AUTH_PASSWORD ?? "";
  if (!expected) return true;
  const actualBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
