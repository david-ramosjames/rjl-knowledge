import { createHash, randomBytes } from "crypto";
import { AppError, ErrorCodes } from "@/lib/errors";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new AppError(ErrorCodes.VALIDATION, "Google sign-in is not configured.");
  }
  return { clientId, clientSecret };
}

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(16).toString("hex");
}

export function googleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  code: string;
  redirectUri: string;
  verifier: string;
}) {
  const { clientId, clientSecret } = getGoogleCredentials();
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new AppError(ErrorCodes.VALIDATION, "Google did not accept the sign-in code.");
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new AppError(ErrorCodes.VALIDATION, "Google did not return an access token.");
  }
  return data.access_token;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AppError(ErrorCodes.VALIDATION, "Could not read the Google account profile.");
  }

  const profile = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  if (!profile.email || profile.email_verified === false || !profile.sub) {
    throw new AppError(ErrorCodes.VALIDATION, "Google email is missing or not verified.");
  }

  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture,
  };
}

export function assertGoogleUserAllowed(email: string) {
  const allowedEmails = (process.env.GOOGLE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN?.trim().toLowerCase();

  const normalized = email.trim().toLowerCase();
  if (allowedEmails.length > 0 && allowedEmails.includes(normalized)) return;
  if (allowedDomain && normalized.endsWith(`@${allowedDomain}`)) return;
  if (allowedEmails.length === 0 && !allowedDomain) return;

  throw new AppError(
    ErrorCodes.VALIDATION,
    "This Google account is not allowed to access the Knowledge Hub.",
  );
}

function isLoopbackHost(host: string) {
  const hostname = host.replace(/^\[|\]$/g, "").replace(/:\d+$/, "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function stripOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function hostFromOrigin(value: string) {
  return value.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
}

function isRailwayRuntime() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RAILWAY_STATIC_URL,
  );
}

export function publicOrigin(request: Request) {
  const railwayStatic = process.env.RAILWAY_STATIC_URL?.trim();
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const configured = process.env.AUTH_URL?.trim();

  if (configured) {
    const origin = stripOrigin(configured);
    if (!(isRailwayRuntime() && isLoopbackHost(hostFromOrigin(origin)))) {
      return isLoopbackHost(hostFromOrigin(origin))
        ? origin
        : origin.replace(/^http:\/\//i, "https://");
    }
  }

  if (railwayStatic) {
    return stripOrigin(railwayStatic).replace(/^http:\/\//i, "https://");
  }
  if (railwayDomain) {
    return `https://${railwayDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const url = new URL(request.url);
  const candidates = [
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
    request.headers.get("host")?.split(",")[0]?.trim(),
    url.host,
  ].filter((value): value is string => Boolean(value));

  const host =
    candidates.find((candidate) => !isLoopbackHost(candidate)) ||
    (!isRailwayRuntime() ? candidates[0] : undefined);

  if (!host) {
    throw new Error(
      "Could not determine the public app URL. Set AUTH_URL=https://rjl-knowledge-production.up.railway.app on the Railway app service.",
    );
  }

  const isLocal = isLoopbackHost(host);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = isLocal ? forwardedProto || url.protocol.replace(":", "") || "http" : "https";
  return `${proto}://${host}`;
}

export function originRedirect(origin: string, path: string) {
  return new URL(path, `${origin}/`);
}

export function resolveAppOrigin(request: Request, stored?: string) {
  if (stored) {
    const origin = stripOrigin(stored);
    if (!(isRailwayRuntime() && isLoopbackHost(hostFromOrigin(origin)))) {
      return origin;
    }
  }
  return publicOrigin(request);
}

export function googleCallbackUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
