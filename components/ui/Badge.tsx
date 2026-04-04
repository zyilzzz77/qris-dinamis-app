import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/types";
import { STATUS_CONFIG } from "@/types";

interface BadgeProps {
  status?: TransactionStatus;
  variant?: "yellow" | "red" | "green" | "orange" | "gray" | "blue";
  children?: React.ReactNode;
  className?: string;
}

const variantClassMap = {
  yellow: "badge-nb badge-nb-pending",
  red: "badge-nb badge-nb-failed",
  green: "badge-nb badge-nb-paid",
  orange: "badge-nb badge-nb-waiting",
  gray: "badge-nb badge-nb-expired",
  blue: "badge-nb bg-nb-blue text-white border-nb-black",
};

export default function Badge({
  status,
  variant,
  children,
  className,
}: BadgeProps) {
  if (status) {
    const config = STATUS_CONFIG[status];
    return (
      <span className={cn(config.className, className)}>
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        variant ? variantClassMap[variant] : "badge-nb badge-nb-pending",
        className
      )}
    >
      {children}
    </span>
  );
}
