"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "black"
  | "white"
  | "danger"
  | "green"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: "btn-nb btn-nb-primary",
  black: "btn-nb btn-nb-black",
  white: "btn-nb btn-nb-white",
  danger: "btn-nb btn-nb-danger",
  green: "btn-nb btn-nb-green",
  ghost:
    "inline-flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold text-nb-black border-2 border-transparent hover:border-nb-black hover:bg-nb-yellow transition-all duration-100 cursor-pointer",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          variantMap[variant],
          sizeMap[size],
          isDisabled && "opacity-60 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="spinner" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
