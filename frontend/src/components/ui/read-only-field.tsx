import { cn } from "@/lib/utils";

export function ReadOnlyField({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium leading-none">{label}</p>
      <div className="flex min-h-10 items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
        {value || '-'}
      </div>
    </div>
  );
}
