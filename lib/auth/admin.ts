import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/roles";

export { getAdminEmails, isAdminEmail, isAdminSession } from "@/lib/auth/roles";

export async function isCurrentUserAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return isAdminSession(token);
}

export async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }
}
