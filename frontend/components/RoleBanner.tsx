"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { isContractDeployed } from "@/lib/contract";
import { APP_CHAIN_ID, APP_NETWORK_LABEL } from "@/lib/types";

interface RoleBannerProps {
  requiredRole: string; // e.g. "MANUFACTURER"
}

/**
 * Non-blocking role notice.
 * Shows a banner if the user isn't connected or doesn't have the role.
 * Does NOT prevent rendering the page — the contract enforces access on submit.
 */
export default function RoleBanner({ requiredRole }: RoleBannerProps) {
  const wallet   = useWallet();
  const deployed = isContractDeployed();
  const [grantState, setGrantState] = useState<"idle" | "pending" | "error">("idle");
  const [grantError, setGrantError] = useState<string | null>(null);

  const canSelfGrant =
    APP_CHAIN_ID === 31337 &&
    wallet.connected &&
    !!wallet.address &&
    !wallet.roles.includes(requiredRole);

  const handleSelfGrant = async () => {
    if (!wallet.address) return;
    setGrantState("pending");
    setGrantError(null);

    try {
      const response = await fetch("/api/dev/grant-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          role: requiredRole,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to grant demo role.");
      }

      await wallet.connect();
      setGrantState("idle");
    } catch (error) {
      setGrantState("error");
      setGrantError(error instanceof Error ? error.message : "Unable to grant demo role.");
    }
  };

  // Nothing to say when the user has the role
  if (wallet.connected && wallet.roles.includes(requiredRole)) return null;

  // Contracts not configured — setup hint
  if (!deployed) {
    return (
      <div className="mb-6 flex gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-warning">Contracts not configured</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Deploy contracts and set{" "}
            <code className="bg-background px-1 rounded text-primary">NEXT_PUBLIC_CONTRACT_ADDRESS</code>
            {" "}+{" "}
            <code className="bg-background px-1 rounded text-primary">NEXT_PUBLIC_ROLE_MANAGER_ADDRESS</code>
            {" "}in <code className="bg-background px-1 rounded text-primary">frontend/.env.local</code>.
            Transactions will fail until then.
          </p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!wallet.connected) {
    return (
      <div className="mb-6 flex gap-3 p-4 bg-secondary/10 border border-secondary/20 rounded-lg items-center">
        <span className="text-xl flex-shrink-0">🔗</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">Wallet required</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Connect MetaMask to submit transactions. You can still browse the UI.
          </p>
        </div>
        <button onClick={wallet.connect} className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
          Connect
        </button>
      </div>
    );
  }

  // Wrong network
  if (!wallet.isCorrectNetwork) {
    return (
      <div className="mb-6 flex gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg items-center">
        <span className="text-xl flex-shrink-0">🌐</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning">Wrong network</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Switch to <strong className="text-text-primary">{APP_NETWORK_LABEL}</strong> to use MediChain.
          </p>
        </div>
        <button onClick={wallet.switchNetwork} className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
          Switch
        </button>
      </div>
    );
  }

  // Connected but missing role
  return (
    <div className="mb-6 flex gap-3 p-4 bg-danger/10 border border-danger/20 rounded-lg items-start">
      <span className="text-xl flex-shrink-0">🔒</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger">
          {requiredRole}_ROLE required
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          Address{" "}
          <code className="text-primary bg-background px-1 py-0.5 rounded font-mono text-xs">
            {wallet.shortAddress}
          </code>{" "}
          has not been granted this role. Ask the MediChain admin to assign it via the{" "}
          <a href="/dashboard" className="text-primary hover:underline">
            Dashboard
          </a>
          . Any transaction you submit without the role will be rejected by the contract.
        </p>
        {grantError && (
          <p className="text-xs text-danger mt-2">{grantError}</p>
        )}
        {canSelfGrant && (
          <p className="text-[11px] text-muted mt-2">
            Localhost helper for demo wallets only.
          </p>
        )}
      </div>
      {canSelfGrant && (
        <button
          onClick={handleSelfGrant}
          disabled={grantState === "pending"}
          className="btn-primary text-sm py-2 px-4 whitespace-nowrap self-start"
        >
          {grantState === "pending" ? "Granting..." : "Grant Demo Access"}
        </button>
      )}
    </div>
  );
}
