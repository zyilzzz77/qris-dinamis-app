"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-sm font-bold text-nb-black"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-nb-gray pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "input-nb",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-nb-red focus:shadow-[4px_4px_0px_#FF3B3B]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-nb-gray">{rightIcon}</div>
          )}
        </div>
        {error && (
          <p className="font-mono text-xs text-nb-red font-bold">
            ⚠ {error}
          </p>
        )}
        {hint && !error && (
          <p className="font-mono text-xs text-nb-gray">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
