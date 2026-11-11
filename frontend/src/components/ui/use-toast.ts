// Adapter: API shadcn-style toast({ title, description, variant, duration, icon })
// dipetakan ke sonner. Semua pemanggil lama tetap jalan tanpa perubahan.
import type * as React from "react";
import { toast as sonnerToast } from "sonner";

type ShadcnToast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  icon?: React.ReactNode;
};

export function toast(opts: ShadcnToast | string) {
  const o = typeof opts === "string" ? { description: opts } : opts;
  const { title, description, variant = "default", duration, icon } = o;
  const fn = variant === "destructive" ? sonnerToast.error : sonnerToast.success;
  const label = [title, description].filter(Boolean).join(" — ");
  return fn(label, {
    duration: duration ?? (variant === "destructive" ? 6000 : 4000),
    icon,
  });
}

export function useToast() {
  return { toasts: [], toast, dismiss: () => {} };
}
