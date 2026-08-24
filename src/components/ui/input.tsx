import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[12px] bg-surface-2 px-3.5 text-sm text-fg placeholder:text-subtle shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] outline-none transition-[box-shadow,background-color] duration-150 focus:shadow-[0_0_0_2px_var(--color-accent)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-48 w-full resize-y rounded-[16px] bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg placeholder:text-subtle shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}
