"use client";

import { MODE_LIST, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

export function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ModeId | null;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Type de soumission"
      className="grid gap-3 sm:grid-cols-3"
    >
      {MODE_LIST.map((mode) => {
        const selected = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={cn(
              "group focus-visible:ring-ring/50 flex h-full flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-foreground/70 bg-muted/60"
                : "hover:border-foreground/30 hover:bg-muted/30",
            )}
          >
            <span className="text-sm leading-snug font-medium">{mode.label}</span>
            <span className="text-muted-foreground text-xs leading-relaxed">
              {mode.tagline}
            </span>
          </button>
        );
      })}
    </div>
  );
}
