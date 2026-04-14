"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  History,
  Code2,
  LifeBuoy,
  Mail,
  UserCircle2,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/history", label: "Riwayat", Icon: History },
  { href: "/rest-api", label: "REST API", Icon: Code2 },
  { href: "/support", label: "Support", Icon: LifeBuoy },
  { href: "/profile", label: "Profil", Icon: UserCircle2 },
  { href: "/contact-us", label: "Contact Us", Icon: Mail },
];

export default function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 border-r-2 border-nb-black bg-white"
        style={{ minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="p-5 border-b-2 border-nb-black bg-nb-yellow">
          <Link href="/">
            <h1 className="font-heading text-lg text-nb-black">
              bikinqrisdinamis
            </h1>
          </Link>
          <p className="font-mono text-xs text-nb-gray font-bold mt-0.5">
            QRIS Dinamis Platform
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <item.Icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t-2 border-nb-black">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 border-2 border-nb-black overflow-hidden flex items-center justify-center bg-nb-yellow">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={`Foto profil ${user.name || user.email || "User"}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading font-black text-sm">
                  {getInitials(user.name || user.email || "U")}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-bold text-nb-black truncate">
                {user.name || "User"}
              </p>
              <p className="font-mono text-xs text-nb-gray truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full btn-nb btn-nb-danger text-xs py-2 flex items-center justify-center gap-2"
            id="sign-out-btn"
          >
            <LogOut size={14} strokeWidth={2} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-2 border-nb-black bg-white flex">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 p-3 font-mono text-xs font-bold transition-colors ${isActive
                ? "bg-nb-yellow text-nb-black"
                : "text-nb-gray hover:bg-nb-yellow/30"
                }`}
            >
              <item.Icon size={20} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex-1 flex flex-col items-center gap-0.5 p-3 font-mono text-xs font-bold text-nb-red hover:bg-nb-red/10 transition-colors"
        >
          <LogOut size={20} strokeWidth={2} />
          Keluar
        </button>
      </nav>
    </>
  );
}
