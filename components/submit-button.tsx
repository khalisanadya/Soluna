"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  pendingText = "Memproses…",
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "dark" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)} {...rest}>
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}
