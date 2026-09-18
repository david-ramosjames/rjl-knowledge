import Image from "next/image";
import { cn } from "@/lib/utils";

export const RJL_LOGO_SRC = "/rjl-logo.webp";
export const RJL_LOGO_MARK_SRC = "/rjl-logo-mark.png";

export function RjlLogo({
  variant = "full",
  className,
  decorative = false,
}: {
  variant?: "full" | "mark";
  className?: string;
  decorative?: boolean;
}) {
  const mark = variant === "mark";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-primary",
        mark ? "size-12 rounded-md" : "h-28 w-44 rounded-2xl sm:h-32 sm:w-52",
        className,
      )}
    >
      <Image
        src={mark ? RJL_LOGO_MARK_SRC : RJL_LOGO_SRC}
        alt={decorative ? "" : "Ramos James Law"}
        fill
        sizes={mark ? "48px" : "208px"}
        className="object-contain p-[7%] mix-blend-screen"
        priority
      />
    </span>
  );
}
