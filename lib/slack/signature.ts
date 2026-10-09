import { createHmac, timingSafeEqual } from "node:crypto";
import { logError } from "@/lib/logger";

const FIVE_MINUTES = 60 * 5;

function envSecret(name: string) {
  return (process.env[name] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function headerValue(request: Request, name: string) {
  const wanted = name.toLowerCase();
  const direct = request.headers.get(name)?.trim();
  if (direct) return direct;
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === wanted && value.trim()) return value.trim();
  }
  return "";
}

function configuredSlackTeamId() {
  const allowed = envSecret("SLACK_TEAM_ID");
  if (!allowed) return null;
  if (!/^T[A-Z0-9]+$/i.test(allowed)) {
    logError("Ignoring SLACK_TEAM_ID; it must look like T0123456789", { valueLength: allowed.length });
    return null;
  }
  return allowed;
}

export function isSlackConfigured() {
  return Boolean(envSecret("SLACK_SIGNING_SECRET"));
}

export function verifySlackSignature(request: Request, rawBody: string) {
  const secret = envSecret("SLACK_SIGNING_SECRET");
  if (!secret) return false;

  const timestamp = headerValue(request, "x-slack-request-timestamp");
  const signature = headerValue(request, "x-slack-signature");
  const requestTimestampSec = Number(timestamp);
  if (!timestamp || !signature || !Number.isFinite(requestTimestampSec)) return false;

  const fiveMinutesAgoSec = Math.floor(Date.now() / 1000) - FIVE_MINUTES;
  if (requestTimestampSec < fiveMinutesAgoSec) return false;

  const digest = createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  const expected = `v0=${digest}`;
  if (expected.length === signature.length) return safeEqual(expected, signature);

  const hash = signature.includes("=") ? signature.slice(signature.indexOf("=") + 1) : signature;
  return hash.length === digest.length && safeEqual(digest, hash);
}

export function mcpAuthFailureReason(request: Request) {
  if (!envSecret("SLACK_SIGNING_SECRET")) return "missing_signing_secret";
  if (!headerValue(request, "x-slack-request-timestamp") || !headerValue(request, "x-slack-signature")) {
    return "missing_slack_signature_headers";
  }
  return "invalid_slack_signature";
}

export function verifyMcpAuthorization(request: Request, rawBody: string) {
  const shared = envSecret("MCP_SHARED_SECRET");
  const bearer = request.headers.get("authorization")?.trim() ?? "";
  if (shared && bearer && safeEqual(`Bearer ${shared}`, bearer)) return true;
  if (verifySlackSignature(request, rawBody)) return true;
  return false;
}

export function slackTeamAllowed(teamId?: string | null) {
  const allowed = configuredSlackTeamId();
  if (!allowed || !teamId) return true;
  return teamId === allowed;
}
