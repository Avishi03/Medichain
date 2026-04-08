"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import SupplyChainTimeline from "@/components/SupplyChainTimeline";
import { verifyBatch, getRecallReason } from "@/lib/contract";
import { formatDate, isExpired } from "@/lib/web3";
import { BatchStatus, STATUS_LABELS } from "@/lib/types";
import type { MedicineBatch, TransferRecord } from "@/lib/types";

// Lazy-load scanner (uses browser APIs, can't SSR)
const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

// ─── Demo data for when contract is not deployed ───────────────

const DEMO_BATCHES: Record<
  string,
  { batch: MedicineBatch; history: TransferRecord[]; recallReason?: string }
> = {
  "DEMO-BATCH-001": {
    batch: {
      batchId:         "DEMO-BATCH-001",
      medicineName:    "Paracetamol 500mg",
      manufacturer:    "Sun Pharma",
      manufacturerAddr: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123",
      manufactureDate: BigInt(Math.floor(Date.now() / 1000) - 30 * 86400),
      expiryDate:      BigInt(Math.floor(Date.now() / 1000) + 2 * 365 * 86400),
      quantity:        BigInt(1000),
      dispensedCount:  BigInt(0),
      ipfsHash:        "",
      status:          BatchStatus.AtPharmacy,
      exists:          true,
    },
    history: [
      { from: "0x0000000000000000000000000000000000000000", to: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123", role: "MANUFACTURER", timestamp: BigInt(Math.floor(Date.now() / 1000) - 30 * 86400), location: "Manufacturing Facility", notes: "Batch registered by Sun Pharma" },
      { from: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123", to: "0x8B4de5f9c2B7a6E3d1F0c9A8b5D2e7C4f1A3e8B2", role: "MANUFACTURER", timestamp: BigInt(Math.floor(Date.now() / 1000) - 20 * 86400), location: "Mumbai Warehouse", notes: "Initial dispatch to MedDistrib Pvt Ltd" },
      { from: "0x8B4de5f9c2B7a6E3d1F0c9A8b5D2e7C4f1A3e8B2", to: "0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b", role: "DISTRIBUTOR", timestamp: BigInt(Math.floor(Date.now() / 1000) - 10 * 86400), location: "Apollo Pharmacy, Chennai", notes: "Delivered to pharmacy" },
    ],
  },
  "DEMO-BATCH-RECALLED": {
    batch: {
      batchId:         "DEMO-BATCH-RECALLED",
      medicineName:    "Metformin 500mg",
      manufacturer:    "Dr Reddy's",
      manufacturerAddr: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123",
      manufactureDate: BigInt(Math.floor(Date.now() / 1000) - 60 * 86400),
      expiryDate:      BigInt(Math.floor(Date.now() / 1000) + 365 * 86400),
      quantity:        BigInt(200),
      dispensedCount:  BigInt(0),
      ipfsHash:        "",
      status:          BatchStatus.Recalled,
      exists:          true,
    },
    history: [
      { from: "0x0000000000000000000000000000000000000000", to: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123", role: "MANUFACTURER", timestamp: BigInt(Math.floor(Date.now() / 1000) - 60 * 86400), location: "Manufacturing Facility", notes: "Batch registered by Dr Reddy's" },
      { from: "0x742d35Cc6634C0532925a3b8D4C9f5B0a5e4B123", to: "0x0000000000000000000000000000000000000000", role: "MANUFACTURER", timestamp: BigInt(Math.floor(Date.now() / 1000) - 5 * 86400), location: "N/A", notes: "RECALLED: Contamination detected during quality control inspection" },
    ],
    recallReason: "Contamination detected during quality control inspection",
  },
};

// ─── Verify result UI ─────────────────────────────────────────────

type VerifyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "genuine";   batch: MedicineBatch; history: TransferRecord[] }
  | { kind: "recalled";  batch: MedicineBatch; history: TransferRecord[]; reason: string }
  | { kind: "expired";   batch: MedicineBatch; history: TransferRecord[] }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("batch") ?? "";

  const [batchInput, setBatchInput]   = useState(prefill);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [result, setResult]           = useState<VerifyState>({ kind: "idle" });

  const doVerify = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;

    setBatchInput(trimmed);
    setResult({ kind: "loading" });

    try {
      // Try live contract first
      const { batch, history } = await verifyBatch(trimmed);
      const expired = isExpired(batch.expiryDate);

      if (batch.status === BatchStatus.Recalled) {
        let reason = "No reason provided.";
        try { reason = await getRecallReason(trimmed); } catch {}
        setResult({ kind: "recalled", batch, history, reason });
      } else if (expired) {
        setResult({ kind: "expired", batch, history });
      } else {
        setResult({ kind: "genuine", batch, history });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      // Batch not found on-chain
      if (msg.includes("not found") || msg.includes("does not exist")) {
        // Fall back to demo data
        const demo = DEMO_BATCHES[trimmed];
        if (demo) {
          if (demo.batch.status === BatchStatus.Recalled) {
            setResult({ kind: "recalled", batch: demo.batch, history: demo.history, reason: demo.recallReason ?? "" });
          } else {
            setResult({ kind: "genuine", batch: demo.batch, history: demo.history });
          }
        } else {
          setResult({ kind: "not_found" });
        }
      } else if (msg.includes("could not detect") || msg.includes("network") || msg.includes("NETWORK")) {
        // Contract not deployed — try demo data
        const demo = DEMO_BATCHES[trimmed];
        if (demo) {
          if (demo.batch.status === BatchStatus.Recalled) {
            setResult({ kind: "recalled", batch: demo.batch, history: demo.history, reason: demo.recallReason ?? "" });
          } else {
            setResult({ kind: "genuine", batch: demo.batch, history: demo.history });
          }
        } else {
          setResult({ kind: "not_found" });
        }
      } else {
        setResult({ kind: "error", message: msg.slice(0, 200) });
      }
    }
  }, []);

  // Auto-verify if batch ID in URL
  useEffect(() => {
    if (prefill) doVerify(prefill);
  }, [prefill, doVerify]);

  const handleScanResult = (scannedId: string) => {
    setScannerOpen(false);
    doVerify(scannedId);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Verify Medicine
        </h1>
        <p className="text-text-secondary text-sm">
          No wallet needed — scan the QR code or enter the batch ID manually.
        </p>
      </div>

      {/* Input section */}
      <div className="card mb-6">
        <div className="flex gap-3 mb-4">
          {/* QR Scan button */}
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary
                       font-semibold px-4 py-3 rounded-lg hover:bg-primary/20 transition-colors
                       whitespace-nowrap text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan QR
          </button>

          {/* Manual input */}
          <input
            type="text"
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doVerify(batchInput)}
            placeholder="Enter Batch ID (e.g. BATCH-2025-001)"
            className="input-field flex-1"
          />
        </div>

        <button
          onClick={() => doVerify(batchInput)}
          disabled={result.kind === "loading" || !batchInput.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {result.kind === "loading" ? (
            <>
              <span className="spinner" />
              Verifying on Blockchain...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Verify Now
            </>
          )}
        </button>

        {/* Demo hint */}
        <p className="text-xs text-muted text-center mt-3">
          Try demo IDs:{" "}
          {["DEMO-BATCH-001", "DEMO-BATCH-RECALLED"].map((id) => (
            <button
              key={id}
              onClick={() => doVerify(id)}
              className="text-primary hover:underline mx-1 font-mono"
            >
              {id}
            </button>
          ))}
        </p>
      </div>

      {/* Result */}
      {result.kind === "genuine" && (
        <GenuineResult batch={result.batch} history={result.history} />
      )}
      {result.kind === "recalled" && (
        <RecalledResult batch={result.batch} history={result.history} reason={result.reason} />
      )}
      {result.kind === "expired" && (
        <ExpiredResult batch={result.batch} history={result.history} />
      )}
      {result.kind === "not_found" && <NotFoundResult batchId={batchInput} />}
      {result.kind === "error" && (
        <div className="card border-danger/30">
          <p className="text-danger font-semibold mb-1">Verification Error</p>
          <p className="text-sm text-text-secondary">{result.message}</p>
        </div>
      )}

      {/* QR Scanner modal */}
      {scannerOpen && (
        <QRScanner onResult={handleScanResult} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}

// ─── Result sub-components ────────────────────────────────────────

function GenuineResult({ batch, history }: { batch: MedicineBatch; history: TransferRecord[] }) {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <div className="animate-slide-up genuine-card bg-surface rounded-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-2xl">
          ✅
        </div>
        <div>
          <h2 className="text-xl font-bold text-success">GENUINE MEDICINE</h2>
          <p className="text-xs text-text-secondary">Verified on Ethereum blockchain</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Medicine",       value: batch.medicineName },
          { label: "Batch ID",       value: batch.batchId },
          { label: "Manufacturer",   value: batch.manufacturer },
          { label: "Status",         value: STATUS_LABELS[batch.status] + " ✓" },
          { label: "Manufactured",   value: formatDate(batch.manufactureDate) },
          { label: "Expires",        value: formatDate(batch.expiryDate) },
          { label: "Quantity",       value: `${Number(batch.quantity).toLocaleString()} units` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted mb-0.5">{label}</p>
            <p className="text-sm font-medium text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Timeline toggle */}
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        className="w-full flex items-center justify-between p-3 bg-background rounded-lg text-sm
                   text-text-secondary hover:text-text-primary transition-colors mb-2"
      >
        <span className="font-medium">Supply Chain Timeline ({history.length} steps)</span>
        <svg
          className={`w-4 h-4 transition-transform ${showTimeline ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showTimeline && (
        <div className="pt-2">
          <SupplyChainTimeline history={history} currentStatus={batch.status} />
        </div>
      )}
    </div>
  );
}

function RecalledResult({
  batch, history, reason,
}: { batch: MedicineBatch; history: TransferRecord[]; reason: string }) {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <div className="animate-slide-up recalled-card bg-surface rounded-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-2xl animate-pulse-slow">
          ⚠️
        </div>
        <div>
          <h2 className="text-xl font-bold text-danger">WARNING — DO NOT CONSUME</h2>
          <p className="text-xs text-text-secondary">This batch has been officially recalled</p>
        </div>
      </div>

      <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold text-danger mb-1">Recall Reason:</p>
        <p className="text-sm text-text-primary">{reason || "No reason specified."}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted mb-0.5">Medicine</p>
          <p className="text-sm text-text-primary font-medium">{batch.medicineName}</p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Batch ID</p>
          <p className="text-sm text-text-primary font-mono">{batch.batchId}</p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Manufacturer</p>
          <p className="text-sm text-text-primary">{batch.manufacturer}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-3 text-xs text-text-secondary mb-4">
        <strong className="text-text-primary">Action Required:</strong> Stop using this medicine
        immediately. Return to the pharmacy or contact the manufacturer.
      </div>

      <button onClick={() => setShowTimeline(!showTimeline)}
        className="w-full flex items-center justify-between p-3 bg-background rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
        <span className="font-medium">Full History ({history.length} records)</span>
        <svg className={`w-4 h-4 transition-transform ${showTimeline ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showTimeline && (
        <div className="pt-4">
          <SupplyChainTimeline history={history} currentStatus={batch.status} />
        </div>
      )}
    </div>
  );
}

function ExpiredResult({ batch, history }: { batch: MedicineBatch; history: TransferRecord[] }) {
  return (
    <div className="animate-slide-up not-found-card bg-surface rounded-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">⏰</div>
        <div>
          <h2 className="text-xl font-bold text-warning">EXPIRED MEDICINE</h2>
          <p className="text-xs text-text-secondary">This batch is registered but past expiry</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        Medicine: <strong className="text-text-primary">{batch.medicineName}</strong><br />
        Expired: <strong className="text-warning">{formatDate(batch.expiryDate)}</strong><br />
        Do not consume expired medication.
      </p>
    </div>
  );
}

function NotFoundResult({ batchId }: { batchId: string }) {
  return (
    <div className="animate-slide-up not-found-card bg-surface rounded-card p-6 text-center">
      <div className="text-4xl mb-4">❌</div>
      <h2 className="text-xl font-bold text-warning mb-2">NOT REGISTERED</h2>
      <p className="text-text-secondary text-sm mb-4">
        Batch ID <code className="text-primary bg-background px-1.5 py-0.5 rounded text-xs">{batchId}</code>{" "}
        is <strong className="text-text-primary">not in the MediChain system.</strong>
      </p>
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-left">
        <p className="text-sm font-semibold text-warning mb-2">⚠ This medicine may be COUNTERFEIT</p>
        <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
          <li>Do not consume this medicine</li>
          <li>Return it to the pharmacy immediately</li>
          <li>Report to your local drug regulatory authority</li>
          <li>Contact the manufacturer if possible</li>
        </ul>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}>
      <VerifyPageInner />
    </Suspense>
  );
}
