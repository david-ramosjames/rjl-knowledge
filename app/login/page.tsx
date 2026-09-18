import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { RjlLogo } from "@/components/brand/rjl-logo";
import { ErrorBanner } from "@/components/error-banner";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isAuthEnabled,
  isGoogleAuthEnabled,
  isPasswordAuthEnabled,
} from "@/lib/auth/session";

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "That password is incorrect.",
  denied: "Google sign-in was cancelled.",
  config: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  state: "That sign-in attempt expired. Try again.",
  oauth: "Google sign-in failed. Try again.",
  unverified: "That Google account does not have a verified email.",
  forbidden: "That Google account is not allowed to access RJL Knowledge.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/";
  const googleEnabled = isGoogleAuthEnabled();
  const passwordEnabled = isPasswordAuthEnabled();

  if (!isAuthEnabled()) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <RjlLogo />
        <h1 className="mt-6 font-serif text-4xl text-primary">RJL Knowledge</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No sign-in is configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to require Google login.
        </p>
        <Link href="/" className="mt-6 text-sm text-accent hover:underline">
          Continue to the hub
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <RjlLogo />
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-secondary">Internal</p>
      <h1 className="mt-3 font-serif text-4xl text-primary">RJL Knowledge</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Sign in with your Google account to open this private knowledge hub.
      </p>

      <div className="mt-8 space-y-4">
        {error ? <ErrorBanner message={LOGIN_ERRORS[error] || LOGIN_ERRORS.oauth} /> : null}

        {googleEnabled ? (
          <Button asChild size="lg" className="w-full">
            <a href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
              <GoogleMark />
              Continue with Google
            </a>
          </Button>
        ) : null}

        {passwordEnabled && !googleEnabled ? (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            <SubmitButton pendingLabel="Signing in…" size="lg" className="w-full">
              Sign in
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.18v2.96h5.3c-.23 1.5-1.78 4.4-5.3 4.4-3.19 0-5.8-2.64-5.8-5.9s2.61-5.9 5.8-5.9c1.82 0 3.04.77 3.74 1.44l2.55-2.46C16.54 3.8 14.5 2.9 12.17 2.9 6.99 2.9 2.83 7.05 2.83 12.2s4.16 9.3 9.34 9.3c5.39 0 8.95-3.79 8.95-9.13 0-.61-.07-1.07-.17-1.27Z"
      />
    </svg>
  );
}
