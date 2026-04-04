"use client";

import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardHeader({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 border-b-2 border-nb-black bg-white">
      {/* Mobile logo */}
      <div className="lg:hidden">
        <h2 className="font-heading text-base text-nb-black">
          bikinqrisdinamis
        </h2>
      </div>

      {/* Desktop breadcrumb */}
      <div className="hidden lg:flex items-center gap-2 font-mono text-sm text-nb-gray font-bold">
        <span className="text-nb-black">Dashboard</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="font-mono text-xs font-bold text-nb-black">
            {user.name || "User"}
          </span>
          <span className="font-mono text-xs text-nb-gray">{user.email}</span>
        </div>
        <div
          className="w-9 h-9 flex items-center justify-center font-heading font-black text-sm border-2 border-nb-black"
          style={{ backgroundColor: "var(--color-nb-yellow)" }}
        >
          {getInitials(user.name || user.email || "U")}
        </div>
      </div>
    </header>
  );
}
