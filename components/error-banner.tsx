import Link from "next/link";
import { errorMessageFromCode } from "@/lib/errors";

export function ErrorBanner({
  code,
  message,
  retryHref,
}: {
  code?: string | null;
  message?: string | null;
  retryHref?: string;
}) {
  if (!code && !message) return null;
  const text = message || (code ? errorMessageFromCode(code) : "");
  if (!text) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{text}</p>
      {retryHref ? (
        <Link href={retryHref} className="mt-2 inline-block font-medium underline">
          Retry
        </Link>
      ) : null}
    </div>
  );
}
