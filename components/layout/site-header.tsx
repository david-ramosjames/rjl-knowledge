import Link from "next/link";
import { cookies } from "next/headers";
import { logoutAction } from "@/app/actions/auth";
import {
  SESSION_COOKIE,
  isAuthEnabled,
  isValidSessionToken,
  readUserSession,
} from "@/lib/auth/session";
import { RjlLogo } from "@/components/brand/rjl-logo";
import { Button } from "@/components/ui/button";

export async function SiteHeader({ variant = "hub" }: { variant?: "hub" | "admin" }) {
  const authEnabled = isAuthEnabled();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const signedIn = !authEnabled || isValidSessionToken(token);
  const user = readUserSession(token);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Knowledge Hub home" className="flex items-center gap-3">
          <RjlLogo variant="mark" decorative />
          <span className="whitespace-nowrap font-serif text-xl tracking-tight text-primary sm:text-2xl">
            Knowledge Hub
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Home</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/search">Search</Link>
              </Button>
              <Button asChild variant={variant === "admin" ? "secondary" : "ghost"} size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/topics">Topics</Link>
              </Button>
              {authEnabled ? (
                <form action={logoutAction} className="flex items-center gap-2">
                  {user?.email ? (
                    <span className="hidden max-w-[12rem] truncate px-2 text-xs text-muted-foreground sm:inline">
                      {user.email}
                    </span>
                  ) : null}
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <span>Knowledge Hub · Ramos James Law</span>
        <span>Meetings are sources. Topics are the knowledge.</span>
      </div>
    </footer>
  );
}
