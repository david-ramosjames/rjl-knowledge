import { getAdminEmails } from "@/lib/auth/roles";

export function outdatedReportHref(title: string, path: string) {
  const to = getAdminEmails()[0] ?? "";
  const subject = `Outdated information: ${title}`;
  const body = `This Knowledge Hub page may be outdated:\n${path}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
