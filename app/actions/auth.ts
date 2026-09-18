"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSessionToken, isAuthEnabled, verifyPassword } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!isAuthEnabled()) {
    redirect("/");
  }
  if (!verifyPassword(password)) {
    redirect("/login?error=invalid");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const next = String(formData.get("next") ?? "/") || "/";
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
