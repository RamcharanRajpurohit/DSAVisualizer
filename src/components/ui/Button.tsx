import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#0b6fb8] to-[#6a2bd0] text-white border-transparent hover:brightness-115 shadow-[0_4px_18px_-6px_rgba(57,170,255,0.6)]",
  secondary: "bg-surface-2 text-fg border-line-strong hover:bg-surface-3 hover:border-white/25",
  ghost: "bg-transparent text-fg-dim border-transparent hover:bg-surface-2 hover:text-fg",
  danger: "bg-[#3a1515] text-[#ff8a8a] border-[#ff5c5c]/30 hover:bg-[#4a1b1b]",
  success: "bg-[#0f3a25] text-[#5cffa8] border-[#2ee68a]/30 hover:bg-[#124a2e]",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-viz-blue/60",
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
