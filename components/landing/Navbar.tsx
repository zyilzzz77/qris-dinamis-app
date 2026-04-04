"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b-2 border-nb-black bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-xl font-black text-nb-black hover:text-nb-blue transition-colors no-underline"
        >
          bikinqrisdinamis<span className="text-nb-blue">.</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#features"
            className="font-mono text-sm font-bold text-nb-black hover:text-nb-blue transition-colors"
          >
            Fitur
          </Link>
          <Link
            href="#how-it-works"
            className="font-mono text-sm font-bold text-nb-black hover:text-nb-blue transition-colors"
          >
            Cara Kerja
          </Link>
          <Link
            href="/help-faq"
            className="font-mono text-sm font-bold text-nb-black hover:text-nb-blue transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/blog-updates"
            className="font-mono text-sm font-bold text-nb-black hover:text-nb-blue transition-colors"
          >
            Update
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="white" size="sm">
              Masuk
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="black" size="sm">
              Daftar Gratis
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-nb-black transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
          />
          <span
            className={`block w-6 h-0.5 bg-nb-black transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""
              }`}
          />
          <span
            className={`block w-6 h-0.5 bg-nb-black transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t-2 border-nb-black bg-white"
        >
          <nav className="flex flex-col p-4 gap-3">
            <Link
              href="#features"
              className="font-mono text-sm font-bold text-nb-black"
              onClick={() => setMenuOpen(false)}
            >
              Fitur
            </Link>
            <Link
              href="#how-it-works"
              className="font-mono text-sm font-bold text-nb-black"
              onClick={() => setMenuOpen(false)}
            >
              Cara Kerja
            </Link>
            <Link
              href="/help-faq"
              className="font-mono text-sm font-bold text-nb-black"
              onClick={() => setMenuOpen(false)}
            >
              FAQ
            </Link>
            <Link
              href="/blog-updates"
              className="font-mono text-sm font-bold text-nb-black"
              onClick={() => setMenuOpen(false)}
            >
              Update
            </Link>
            <div className="flex gap-2 pt-2 border-t border-nb-black">
              <Link href="/sign-in" className="flex-1">
                <Button variant="white" className="w-full" size="sm">
                  Masuk
                </Button>
              </Link>
              <Link href="/sign-up" className="flex-1">
                <Button variant="black" className="w-full" size="sm">
                  Daftar
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
