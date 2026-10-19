import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-fg text-bg-elev border-fg hover:bg-[#333] shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  secondary: "bg-surface text-fg border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-fg-dim border-transparent hover:bg-surface-2 hover:text-fg",
  danger: "bg-transparent text-viz-red-deep border-viz-red/35 hover:bg-viz-red/5",
  success: "bg-transparent text-viz-green-deep border-viz-green/35 hover:bg-viz-green/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean;
  /**
   * Tooltip explaining why the button is disabled. Disabled buttons ignore the pointer,
   * so the tooltip lives on a wrapper span.
   */
  disabledReason?: string;
}

export function Button({
  variant = "secondary", size = "md", icon, block, disabledReason, className, children, type = "button", ...rest
}: ButtonProps) {
  const button = (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25",
        "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
  if (!rest.disabled || !disabledReason) return button;
  return (
    <span title={disabledReason} className={cn("cursor-not-allowed", block ? "flex w-full [&>button]:flex-1" : "inline-flex")}>
      {button}
    </span>
  );
}
