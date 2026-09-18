import { NextRequest, NextResponse } from "next/server";
import {
  assertGoogleUserAllowed,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleCallbackUri,
  originRedirect,
  resolveAppOrigin,
} from "@/lib/auth/google";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  createUserSessionToken,
  readOAuthStateToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { logError } from "@/lib/logger";

function fail(request: NextRequest, code: string, origin?: string) {
  const target = originRedirect(resolveAppOrigin(request, origin), `/login?error=${code}`);
  const response = NextResponse.redirect(target);
  response.cookies.delete(OAUTH_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return fail(request, oauthError === "access_denied" ? "denied" : "oauth");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauth = readOAuthStateToken(request.cookies.get(OAUTH_COOKIE)?.value);

  if (!code || !state || !oauth || oauth.state !== state) {
    return fail(request, "state", oauth?.origin);
  }

  const origin = resolveAppOrigin(request, oauth.origin);

  try {
    const accessToken = await exchangeGoogleCode({
      code,
      redirectUri: googleCallbackUri(origin),
      verifier: oauth.verifier,
    });
    const profile = await fetchGoogleProfile(accessToken);
    assertGoogleUserAllowed(profile.email);

    const response = NextResponse.redirect(originRedirect(origin, oauth.next || "/"));
    response.cookies.delete(OAUTH_COOKIE);
    response.cookies.set(
      SESSION_COOKIE,
      createUserSessionToken({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        sub: profile.sub,
      }),
      sessionCookieOptions(),
    );
    return response;
  } catch (error) {
    logError("Google sign-in failed", {
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not allowed")) return fail(request, "forbidden", origin);
    if (message.includes("not verified") || message.includes("missing")) return fail(request, "unverified", origin);
    return fail(request, "oauth", origin);
  }
}
