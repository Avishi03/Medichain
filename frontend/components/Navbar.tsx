"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import WalletConnect from "./WalletConnect";

const NAV_LINKS = [
  { href: "/verify",       label: "Verify" },
  { href: "/manufacturer", label: "Manufacturer" },
  { href: "/distributor",  label: "Distributor" },
  { href: "/pharmacy",     label: "Pharmacy" },
  { href: "/dashboard",    label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-sm">
              ⛓️
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-primary">Medi</span>
              <span className="text-text-primary">Chain</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet + mobile toggle */}
          <div className="flex items-center gap-3">
            <WalletConnect />
            <button
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-2 pb-4 border-t border-border mt-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg mx-1 my-0.5 ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
