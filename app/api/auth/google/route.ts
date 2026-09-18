import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  createPkcePair,
  getGoogleCredentials,
  googleAuthorizationUrl,
  googleCallbackUri,
  publicOrigin,
  safeNextPath,
} from "@/lib/auth/google";
import {
  OAUTH_COOKIE,
  createOAuthStateToken,
  isGoogleAuthEnabled,
  oauthCookieOptions,
} from "@/lib/auth/session";

export function GET(request: NextRequest) {
  if (!isGoogleAuthEnabled()) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const { clientId } = getGoogleCredentials();
  const origin = publicOrigin(request);
  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const authorizeUrl = googleAuthorizationUrl({
    clientId,
    redirectUri: googleCallbackUri(origin),
    state,
    challenge,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_COOKIE,
    createOAuthStateToken({ state, verifier, next }),
    oauthCookieOptions(),
  );
  return response;
}
