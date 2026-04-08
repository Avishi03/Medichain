"use client";

import { useWallet } from "@/hooks/useWallet";
import { isContractDeployed } from "@/lib/contract";
import { APP_NETWORK_LABEL, APP_NETWORK_NAME } from "@/lib/types";
import Link from "next/link";

interface RoleGuardProps {
  requiredRole: string;
  children: React.ReactNode;
}

export default function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  const wallet = useWallet();
  const deployed = isContractDeployed();

  // Not connected at all
  if (!wallet.connected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Wallet Required
          </h2>
          <p className="text-text-secondary mb-6 text-sm">
            Connect your MetaMask wallet to access this page.
          </p>
          <button
            onClick={wallet.connect}
            className="btn-primary w-full"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Wrong network
  if (!wallet.isCorrectNetwork) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center border-warning/30">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Wrong Network
          </h2>
          <p className="text-text-secondary mb-6 text-sm">
            Please switch to <strong className="text-warning">{APP_NETWORK_LABEL}</strong> to use MediChain.
          </p>
          <button
            onClick={wallet.switchNetwork}
            className="btn-primary w-full"
          >
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  // Contracts not deployed — give setup instructions instead of "Access Restricted"
  if (!deployed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center border-warning/30">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Contracts Not Deployed
          </h2>
          <p className="text-text-secondary mb-4 text-sm">
            This page requires <strong className="text-text-primary">{requiredRole}_ROLE</strong> on a deployed MediChain contract.
          </p>
          <div className="bg-background rounded-lg p-3 text-left text-xs font-mono text-text-secondary space-y-1 mb-5">
            <p className="text-primary">{`npx hardhat run scripts/deploy.js --network ${APP_NETWORK_NAME}`}</p>
            <p className="text-muted"># Then set env vars in frontend/.env.local</p>
          </div>
          <Link href="/" className="btn-secondary w-full block text-center">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Doesn't have the required role
  if (!wallet.roles.includes(requiredRole)) {
    const roleLabels: Record<string, { icon: string; desc: string }> = {
      MANUFACTURER: { icon: "🏭", desc: "registered manufacturer" },
      DISTRIBUTOR:  { icon: "🚚", desc: "registered distributor" },
      PHARMACY:     { icon: "💊", desc: "registered pharmacy" },
      ADMIN:        { icon: "⚙️", desc: "system administrator" },
    };
    const info = roleLabels[requiredRole] || { icon: "🔒", desc: requiredRole };

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center border-danger/30">
          <div className="text-4xl mb-4">{info.icon}</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Access Restricted
          </h2>
          <p className="text-text-secondary mb-2 text-sm">
            This page requires{" "}
            <strong className="text-text-primary">{requiredRole}_ROLE</strong>.
          </p>
          <p className="text-text-secondary mb-6 text-sm">
            Your address{" "}
            <code className="text-primary text-xs bg-surface px-1.5 py-0.5 rounded">
              {wallet.shortAddress}
            </code>{" "}
            is not a {info.desc}.
          </p>
          <p className="text-xs text-muted mb-6">
            Contact the MediChain admin to request role assignment at the Dashboard.
          </p>
          <div className="flex gap-3">
            <Link href="/" className="btn-secondary flex-1">
              Go Home
            </Link>
            <Link href="/dashboard" className="btn-primary flex-1">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
