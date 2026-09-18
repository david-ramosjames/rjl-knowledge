"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  createPasswordSessionToken,
  isAuthEnabled,
  isGoogleAuthEnabled,
  isPasswordAuthEnabled,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  if (isGoogleAuthEnabled()) {
    const next = String(formData.get("next") ?? "/") || "/";
    redirect(`/api/auth/google?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}`);
  }

  if (!isAuthEnabled()) redirect("/");
  if (!isPasswordAuthEnabled()) redirect("/login?error=config");

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    redirect("/login?error=invalid");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createPasswordSessionToken(), sessionCookieOptions());

  const next = String(formData.get("next") ?? "/") || "/";
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(OAUTH_COOKIE);
  redirect("/login");
}
