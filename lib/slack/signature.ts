import { createHmac, timingSafeEqual } from "node:crypto";

const FIVE_MINUTES = 60 * 5;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isSlackConfigured() {
  return Boolean(process.env.SLACK_SIGNING_SECRET?.trim());
}

export function verifySlackSignature(request: Request, rawBody: string) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret) return false;

  const timestamp = request.headers.get("x-slack-request-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-slack-signature")?.trim() ?? "";
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || !signature || !Number.isFinite(age) || age > FIVE_MINUTES) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  return safeEqual(`v0=${digest}`, signature);
}

export function verifyMcpAuthorization(request: Request, rawBody: string) {
  const shared = process.env.MCP_SHARED_SECRET?.trim();
  const bearer = request.headers.get("authorization")?.trim() ?? "";
  if (shared && safeEqual(`Bearer ${shared}`, bearer)) return true;
  if (verifySlackSignature(request, rawBody)) return true;
  return false;
}

export function slackTeamAllowed(teamId?: string | null) {
  const allowed = process.env.SLACK_TEAM_ID?.trim();
  if (!allowed || !teamId) return true;
  return teamId === allowed;
}
