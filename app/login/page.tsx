import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { ErrorBanner } from "@/components/error-banner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAuthEnabled } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/";

  if (!isAuthEnabled()) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-serif text-4xl">RJL Knowledge</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No password is configured. Set AUTH_PASSWORD to protect this internal app.
        </p>
        <Link href="/" className="mt-6 text-sm text-accent hover:underline">
          Continue to the hub
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Internal</p>
      <h1 className="mt-3 font-serif text-4xl">RJL Knowledge</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This is a private knowledge hub for Ramos James Law.
      </p>
      <form action={loginAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        {error ? <ErrorBanner message="That password is incorrect." /> : null}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoFocus />
        </div>
        <SubmitButton pendingLabel="Signing in…" size="lg" className="w-full">
          Sign in
        </SubmitButton>
      </form>
    </main>
  );
}
