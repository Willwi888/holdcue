import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 transition-[scale,background-color,color,opacity,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_0_0_1px_rgb(232_90_18_/_0.4)]",
        secondary:
          "bg-surface-2/80 text-fg hover:bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.1)]",
        ghost: "bg-transparent text-fg hover:bg-surface-2/70",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.14)] hover:bg-surface-2/70",
        ink: "bg-fg text-bg hover:bg-fg/90",
        paper: "bg-surface-2 text-fg hover:bg-surface shadow-[0_0_0_1px_rgb(255_255_255_/_0.1)]",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[8px]",
        md: "h-11 px-4 text-sm rounded-[12px]",
        lg: "h-12 px-5 text-base rounded-[14px]",
        xl: "h-14 px-6 text-base rounded-[16px]",
        icon: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
