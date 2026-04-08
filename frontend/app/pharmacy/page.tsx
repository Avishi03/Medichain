"use client";

import { useState } from "react";
import RoleBanner from "@/components/RoleBanner";
import TxButton from "@/components/TxButton";
import QRScanner from "@/components/QRScanner";
import { dispenseUnits, verifyBatch } from "@/lib/contract";
import { decodeContractError, formatDate } from "@/lib/web3";
import { BatchStatus, STATUS_LABELS, STATUS_ICONS } from "@/lib/types";
import type { TxStatus, MedicineBatch } from "@/lib/types";

interface LookupState {
  kind: "idle" | "loading" | "found" | "not_found" | "error";
  batch?: MedicineBatch;
  error?: string;
}

function PharmacyContent() {
  const [batchId, setBatchId]     = useState("");
  const [units, setUnits]         = useState<number>(1);
  const [lookup, setLookup]       = useState<LookupState>({ kind: "idle" });
  const [txStatus, setTxStatus]   = useState<TxStatus>({ state: "idle", hash: null, error: null });
  const [showScanner, setShowScanner] = useState(false);

  const handleLookup = async (overrideId?: string) => {
    const id = (overrideId ?? batchId).trim();
    if (!id) return;
    setLookup({ kind: "loading" });
    try {
      const { batch } = await verifyBatch(id);
      setLookup({ kind: "found", batch });
      setUnits(1);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("not found")) {
        setLookup({ kind: "not_found" });
      } else {
        setLookup({ kind: "error", error: decodeContractError(err) });
      }
    }
  };

  const handleDispense = async () => {
    const id = batchId.trim();
    if (!id || units < 1) return;
    setTxStatus({ state: "pending", hash: null, error: null });
    try {
      const tx = await dispenseUnits(id, units);
      await tx.wait();
      setTxStatus({ state: "success", hash: tx.hash, error: null });
      // Update lookup state
      if (lookup.batch) {
        const remaining = Number(lookup.batch.quantity) - Number(lookup.batch.dispensedCount);
        const newDispensed = Number(lookup.batch.dispensedCount) + units;
        const newStatus = (newDispensed === Number(lookup.batch.quantity)) ? BatchStatus.Sold : lookup.batch.status;
        setLookup({ 
          kind: "found", 
          batch: { ...lookup.batch, status: newStatus, dispensedCount: BigInt(newDispensed) } 
        });
      }
    } catch (err) {
      setTxStatus({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const batch = lookup.batch;
  const canSell = batch?.status === BatchStatus.AtPharmacy || (batch?.status as any) === "PARTIALLY_DISPENSED";
  const remainingStock = batch ? (Number(batch.quantity) - Number(batch.dispensedCount)) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {showScanner && (
        <QRScanner
          onResult={(id) => {
            setBatchId(id);
            setShowScanner(false);
            handleLookup(id);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">💊 Pharmacy Portal</h1>
        <p className="text-text-secondary text-sm">
          Look up batches in your inventory and dispense units to patients.
        </p>
      </div>

      <RoleBanner requiredRole="PHARMACY" />

      {/* Lookup */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Look Up Batch</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowScanner(true)}
            className="btn-outline px-4 flex items-center justify-center shrink-0"
            title="Scan QR"
          >
            📷
          </button>
          <input
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Enter Batch ID manually"
            className="input-field flex-1"
          />
          <button
            onClick={() => handleLookup()}
            disabled={lookup.kind === "loading" || !batchId.trim()}
            className="btn-primary whitespace-nowrap px-5"
          >
            {lookup.kind === "loading" ? (
              <span className="spinner" />
            ) : (
              "Look Up"
            )}
          </button>
        </div>
      </div>

      {/* Batch details */}
      {lookup.kind === "found" && batch && (
        <div className="card mb-6 animate-slide-up">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold text-text-primary">{batch.medicineName}</h3>
              <p className="text-xs text-muted font-mono mt-0.5">{batch.batchId}</p>
            </div>
            <span className={`badge flex-shrink-0
              ${batch.status === BatchStatus.Sold ? "bg-primary/10 text-primary border border-primary/20" : 
                canSell ? "badge-success" : "badge-info"}`
            }>
              {STATUS_ICONS[batch.status]} {
                 batch.status === BatchStatus.AtPharmacy && remainingStock < Number(batch.quantity) 
                 ? "Partially Dispensed" 
                 : STATUS_LABELS[batch.status]
              }
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div>
              <p className="text-xs text-muted mb-0.5">Manufacturer</p>
              <p className="text-text-primary font-medium">{batch.manufacturer}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Stock Remaining</p>
              <p className="text-text-primary font-bold">{remainingStock.toLocaleString()} <span className="font-normal text-muted text-xs">/ {Number(batch.quantity).toLocaleString()}</span></p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Manufactured</p>
              <p className="text-text-primary">{formatDate(batch.manufactureDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Expires</p>
              <p className="text-text-primary">{formatDate(batch.expiryDate)}</p>
            </div>
          </div>

          {/* Status messages */}
          {batch.status === BatchStatus.Recalled && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-danger">⚠ This batch has been RECALLED</p>
              <p className="text-xs text-text-secondary mt-1">Do not dispense. Contact manufacturer.</p>
            </div>
          )}
          {batch.status === BatchStatus.Sold && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-primary">✓ All units sold out</p>
            </div>
          )}
          {batch.status === BatchStatus.InTransit && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-secondary">📦 Batch is still in transit — not yet assigned to your pharmacy</p>
            </div>
          )}
          {batch.status === BatchStatus.Manufactured && (
            <div className="bg-muted/10 border border-border rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-text-secondary">🏭 Batch not yet dispatched from manufacturer</p>
            </div>
          )}

          {/* Mark as sold / Dispense */}
          {canSell && remainingStock > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
              <div className="flex-1 max-w-[150px]">
                <label className="text-xs text-muted mb-1 block">Units to Dispense</label>
                <input 
                   type="number" 
                   min="1" 
                   max={remainingStock} 
                   value={units} 
                   onChange={(e) => setUnits(Number(e.target.value))} 
                   className="input-field py-1.5"
                />
              </div>
              <div className="flex-1">
                 <TxButton
                   txStatus={txStatus}
                   onClick={handleDispense}
                   label={`✓ Dispense ${units} Unit(s)`}
                   loadingLabel="Dispensing..."
                   disabled={units > remainingStock || units < 1}
                 />
              </div>
            </div>
          )}
        </div>
      )}

      {lookup.kind === "not_found" && (
        <div className="card border-warning/30 text-center py-8">
          <div className="text-3xl mb-2">❌</div>
          <p className="text-warning font-semibold">Batch Not Found</p>
          <p className="text-sm text-text-secondary mt-1">
            This batch ID is not registered in MediChain.
          </p>
        </div>
      )}

      {lookup.kind === "error" && (
        <div className="card border-danger/30">
          <p className="text-danger font-semibold text-sm mb-1">Error</p>
          <p className="text-xs text-text-secondary">{lookup.error}</p>
        </div>
      )}
    </div>
  );
}

export default function PharmacyPage() {
  return <PharmacyContent />;
}
