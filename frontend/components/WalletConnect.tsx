"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { APP_NETWORK_LABEL } from "@/lib/types";

export default function WalletConnect() {
  const wallet = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!wallet.connected) {
    return (
      <button
        onClick={wallet.connect}
        className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary
                   text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/20
                   transition-all duration-200 active:scale-95"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 bg-surface border border-border text-sm
                   font-medium px-3 py-2 rounded-lg hover:border-primary/50
                   transition-all duration-200"
      >
        {/* Network indicator */}
        <span
          className={`w-2 h-2 rounded-full ${
            wallet.isCorrectNetwork ? "bg-success" : "bg-warning"
          }`}
        />
        <span className="text-text-primary">{wallet.shortAddress}</span>
        <svg
          className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-card
                        shadow-card z-50 animate-fade-in overflow-hidden">
          {/* Address */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted mb-1">Connected Address</p>
            <p className="text-sm text-text-primary font-mono break-all">
              {wallet.address}
            </p>
          </div>

          {/* Network */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted mb-0.5">Network</p>
              <p className={`text-sm font-medium ${wallet.isCorrectNetwork ? "text-success" : "text-warning"}`}>
                {wallet.isCorrectNetwork ? `${APP_NETWORK_LABEL} ✓` : `Chain ${wallet.chainId} ⚠`}
              </p>
            </div>
            {!wallet.isCorrectNetwork && (
              <button
                onClick={() => { wallet.switchNetwork(); setDropdownOpen(false); }}
                className="text-xs bg-warning/10 text-warning border border-warning/20
                           px-2.5 py-1.5 rounded-lg hover:bg-warning/20 transition-colors"
              >
                Switch
              </button>
            )}
          </div>

          {/* Roles */}
          {wallet.roles.length > 0 && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs text-muted mb-2">Your Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {wallet.roles.map((role) => (
                  <span key={role} className="badge-info text-xs">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disconnect */}
          <button
            onClick={() => { wallet.disconnect(); setDropdownOpen(false); }}
            className="w-full px-4 py-3 text-sm text-danger hover:bg-danger/5
                       transition-colors text-left flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
