"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "default",
  size = "default",
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "accent" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
