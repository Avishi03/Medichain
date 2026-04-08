"use client";

import { useState, useEffect } from "react";
import TxButton from "@/components/TxButton";
import { getStats, grantRole, revokeRole, isContractDeployed } from "@/lib/contract";
import { getRoleManagerReadOnly } from "@/lib/contract";
import { decodeContractError, etherscanLink } from "@/lib/web3";
import { useWallet } from "@/hooks/useWallet";
import { APP_BLOCK_EXPLORER_URL, APP_CHAIN_ID, APP_NETWORK_LABEL, APP_NETWORK_NAME, type TxStatus } from "@/lib/types";

const ROLE_OPTIONS = [
  { label: "Manufacturer",  value: "MANUFACTURER_ROLE" },
  { label: "Distributor",   value: "DISTRIBUTOR_ROLE" },
  { label: "Pharmacy",      value: "PHARMACY_ROLE" },
];

interface Stats {
  totalBatches:   bigint;
  totalTransfers: bigint;
  totalRecalls:   bigint;
}

export default function DashboardPage() {
  const wallet = useWallet();

  const [stats, setStats]           = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const deployed = isContractDeployed();
  const isAdmin  = wallet.roles.includes("ADMIN");

  // Role management
  const [roleAddress, setRoleAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("MANUFACTURER_ROLE");
  const [grantTx, setGrantTx]   = useState<TxStatus>({ state: "idle", hash: null, error: null });
  const [revokeTx, setRevokeTx] = useState<TxStatus>({ state: "idle", hash: null, error: null });
  const [roleBytes, setRoleBytes] = useState<Record<string, string>>({});

  useEffect(() => {
    getStats()
      .then((s) => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    if (!deployed) return;
    const rm = getRoleManagerReadOnly();
    Promise.all([
      rm.MANUFACTURER_ROLE() as Promise<string>,
      rm.DISTRIBUTOR_ROLE()  as Promise<string>,
      rm.PHARMACY_ROLE()     as Promise<string>,
    ])
      .then(([mfr, dist, pharm]) => {
        setRoleBytes({
          MANUFACTURER_ROLE: mfr,
          DISTRIBUTOR_ROLE:  dist,
          PHARMACY_ROLE:     pharm,
        });
      })
      .catch(() => {});
  }, [deployed]);

  const handleGrant = async () => {
    const bytes = roleBytes[selectedRole];
    if (!bytes) return;
    setGrantTx({ state: "pending", hash: null, error: null });
    try {
      const tx = await grantRole(bytes, roleAddress.trim());
      await tx.wait();
      setGrantTx({ state: "success", hash: tx.hash, error: null });
    } catch (err) {
      setGrantTx({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const handleRevoke = async () => {
    const bytes = roleBytes[selectedRole];
    if (!bytes) return;
    setRevokeTx({ state: "pending", hash: null, error: null });
    try {
      const tx = await revokeRole(bytes, roleAddress.trim());
      await tx.wait();
      setRevokeTx({ state: "success", hash: tx.hash, error: null });
    } catch (err) {
      setRevokeTx({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const isAddressValid = roleAddress.trim().startsWith("0x") && roleAddress.trim().length === 42;
  const contractAddr   = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
  const contractUrl = contractAddr ? etherscanLink(contractAddr, "address") : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">⚙️ Dashboard</h1>
        <p className="text-text-secondary text-sm">
          MediChain system overview.
          {isAdmin && (
            <span className="ml-2 badge-success">Admin Access</span>
          )}
          {wallet.connected && !isAdmin && (
            <span className="ml-2 badge-info">Connected — read-only view</span>
          )}
        </p>
      </div>

      {/* Not connected banner */}
      {!wallet.connected && (
        <div className="card border-secondary/20 bg-secondary/5 mb-6 flex items-center gap-4">
          <span className="text-2xl">🔗</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Connect your wallet</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Connect MetaMask to see your role and access admin features.
            </p>
          </div>
          <button onClick={wallet.connect} className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
            Connect
          </button>
        </div>
      )}

      {/* Contracts not configured banner */}
      {!deployed && (
        <div className="card border-warning/30 bg-warning/5 mb-6">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-warning mb-1">Contracts Not Configured</p>
              <p className="text-xs text-text-secondary mb-3">
                Set <code className="bg-background px-1 rounded text-primary">NEXT_PUBLIC_CONTRACT_ADDRESS</code> and{" "}
                <code className="bg-background px-1 rounded text-primary">NEXT_PUBLIC_ROLE_MANAGER_ADDRESS</code> in your{" "}
                <code className="bg-background px-1 rounded text-primary">frontend/.env.local</code> after deploying.
              </p>
              <div className="bg-background rounded-lg p-3 text-xs font-mono text-text-secondary space-y-1">
                <div># Deploy contracts first:</div>
                <div className="text-primary">{`npx hardhat run scripts/deploy.js --network ${APP_NETWORK_NAME}`}</div>
                <div className="mt-2"># Then start frontend:</div>
                <div className="text-primary">cd frontend && npm run dev</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Batches",   value: statsLoading ? "—" : (stats?.totalBatches ?? BigInt(0)).toString(),   icon: "📦", color: "text-primary" },
          { label: "Total Transfers", value: statsLoading ? "—" : (stats?.totalTransfers ?? BigInt(0)).toString(), icon: "🔄", color: "text-secondary" },
          { label: "Total Recalls",   value: statsLoading ? "—" : (stats?.totalRecalls ?? BigInt(0)).toString(),   icon: "⚠️", color: "text-danger" },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <p className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Contract info */}
      <div className="card mb-8">
        <h2 className="text-base font-semibold text-text-primary mb-4">Contract Information</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted mb-1">MediChainCore Address</p>
            {contractAddr && contractAddr !== "0x0000000000000000000000000000000000000000" ? (
              contractUrl ? (
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-mono hover:underline break-all"
                >
                  {contractAddr} ↗
                </a>
              ) : (
                <span className="text-primary text-sm font-mono break-all">
                  {contractAddr}
                </span>
              )
            ) : (
              <span className="text-muted text-sm">Not deployed</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-info">{APP_NETWORK_LABEL}</span>
            <span className="badge-info">Chain ID: {APP_CHAIN_ID}</span>
            {!APP_BLOCK_EXPLORER_URL && <span className="badge-info">Local RPC</span>}
            {deployed && <span className="badge-success">Contracts Live</span>}
          </div>
        </div>
      </div>

      {/* Role Management — ADMIN only */}
      {wallet.connected && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-text-primary">Role Management</h2>
            {!isAdmin && (
              <span className="badge-warning text-xs">Admin Only</span>
            )}
          </div>

          {!isAdmin ? (
            <div className="py-6 text-center">
              <p className="text-text-secondary text-sm mb-1">
                Only the contract deployer (Admin) can grant and revoke roles.
              </p>
              <p className="text-muted text-xs">
                Your connected address{" "}
                <code className="text-primary bg-background px-1 py-0.5 rounded text-xs">
                  {wallet.shortAddress}
                </code>{" "}
                does not have <strong className="text-text-primary">DEFAULT_ADMIN_ROLE</strong>.
              </p>
              {!deployed && (
                <p className="text-xs text-warning mt-3">
                  Contracts are not configured — deploy first, then connect with the deployer wallet.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <p className="text-xs text-text-secondary">
                Grant or revoke roles for manufacturers, distributors, and pharmacies.
              </p>
              <div>
                <label className="label">Wallet Address</label>
                <input
                  type="text"
                  value={roleAddress}
                  onChange={(e) => setRoleAddress(e.target.value)}
                  placeholder="0x... (address to grant/revoke role)"
                  className={`input-field font-mono ${roleAddress && !isAddressValid ? "border-danger" : ""}`}
                />
                {roleAddress && !isAddressValid && (
                  <p className="text-xs text-danger mt-1">Invalid Ethereum address</p>
                )}
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input-field"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TxButton
                  txStatus={grantTx}
                  onClick={handleGrant}
                  label="Grant Role"
                  loadingLabel="Granting..."
                  className="btn-primary"
                  disabled={!isAddressValid}
                />
                <TxButton
                  txStatus={revokeTx}
                  onClick={handleRevoke}
                  label="Revoke Role"
                  loadingLabel="Revoking..."
                  className="btn-danger"
                  disabled={!isAddressValid}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="card">
        <h2 className="text-base font-semibold text-text-primary mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Verify Medicine", href: "/verify",       icon: "🔍" },
            { label: "Manufacturer",   href: "/manufacturer", icon: "🏭" },
            { label: "Distributor",    href: "/distributor",  icon: "🚚" },
            { label: "Pharmacy",       href: "/pharmacy",     icon: "💊" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="card p-3 text-center hover:border-primary/40 transition-colors"
            >
              <div className="text-2xl mb-1">{link.icon}</div>
              <p className="text-xs text-text-secondary">{link.label}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
