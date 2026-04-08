"use client";

import { useState } from "react";
import RoleBanner from "@/components/RoleBanner";
import QRGenerator from "@/components/QRGenerator";
import TxButton from "@/components/TxButton";
import { registerBatch, batchExists, transferToDistributor } from "@/lib/contract";
import { decodeContractError } from "@/lib/web3";
import { useWallet } from "@/hooks/useWallet";
import type { TxStatus } from "@/lib/types";

interface RegisterForm {
  batchId:      string;
  medicineName: string;
  manufacturer: string;
  expiryDate:   string;
  quantity:     string;
  ipfsHash:     string;
}

interface TransferForm {
  distributor: string;
  location:    string;
  notes:       string;
}

const EMPTY_FORM: RegisterForm = {
  batchId:      "",
  medicineName: "",
  manufacturer: "",
  expiryDate:   "",
  quantity:     "",
  ipfsHash:     "",
};

function ManufacturerContent() {
  const wallet = useWallet();
  const [form, setForm]               = useState<RegisterForm>(EMPTY_FORM);
  const [txStatus, setTxStatus]       = useState<TxStatus>({ state: "idle", hash: null, error: null });
  const [registeredBatchId, setRegisteredBatchId] = useState<string | null>(null);

  // Transfer state
  const [activeBatchForTransfer, setActiveBatchForTransfer] = useState<string | null>(null);
  const [transferForm, setTransferForm]   = useState<TransferForm>({ distributor: "", location: "", notes: "" });
  const [transferTx, setTransferTx]       = useState<TxStatus>({ state: "idle", hash: null, error: null });

  // Batch ID uniqueness check
  const [batchIdStatus, setBatchIdStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");

  const checkBatchId = async (id: string) => {
    if (!id.trim()) { setBatchIdStatus("idle"); return; }
    setBatchIdStatus("checking");
    try {
      const exists = await batchExists(id.trim());
      setBatchIdStatus(exists ? "taken" : "available");
    } catch {
      setBatchIdStatus("idle");
    }
  };

  const handleRegister = async () => {
    setTxStatus({ state: "pending", hash: null, error: null });
    try {
      const expiryTs = Math.floor(new Date(form.expiryDate).getTime() / 1000);
      const tx = await registerBatch({
        batchId:      form.batchId.trim(),
        medicineName: form.medicineName.trim(),
        manufacturer: form.manufacturer.trim(),
        expiryDate:   expiryTs,
        quantity:     parseInt(form.quantity),
        ipfsHash:     form.ipfsHash.trim(),
      });
      await tx.wait();
      setTxStatus({ state: "success", hash: tx.hash, error: null });
      setRegisteredBatchId(form.batchId.trim());
    } catch (err) {
      setTxStatus({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const handleTransfer = async () => {
    if (!activeBatchForTransfer) return;
    setTransferTx({ state: "pending", hash: null, error: null });
    try {
      const tx = await transferToDistributor({
        batchId:     activeBatchForTransfer,
        distributor: transferForm.distributor.trim(),
        location:    transferForm.location.trim(),
        notes:       transferForm.notes.trim(),
      });
      await tx.wait();
      setTransferTx({ state: "success", hash: tx.hash, error: null });
    } catch (err) {
      setTransferTx({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const isFormValid =
    form.batchId && form.medicineName && form.manufacturer &&
    form.expiryDate && form.quantity && batchIdStatus !== "taken";

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🏭 Manufacturer Portal</h1>
        <p className="text-text-secondary text-sm">
          Register new medicine batches on Ethereum. Each registration is permanent and tamper-proof.
        </p>
      </div>

      <RoleBanner requiredRole="MANUFACTURER" />

      {/* Register form */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-5">Register New Batch</h2>

        <div className="space-y-4">
          {/* Batch ID */}
          <div>
            <label className="label">Batch ID *</label>
            <div className="relative">
              <input
                type="text"
                value={form.batchId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, batchId: e.target.value }));
                  checkBatchId(e.target.value);
                }}
                placeholder="e.g. BATCH-2025-001"
                className={`input-field pr-24 ${
                  batchIdStatus === "taken"
                    ? "border-danger"
                    : batchIdStatus === "available"
                    ? "border-success"
                    : ""
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                {batchIdStatus === "checking" && <span className="text-muted">Checking…</span>}
                {batchIdStatus === "taken"    && <span className="text-danger">✗ Taken</span>}
                {batchIdStatus === "available" && <span className="text-success">✓ Available</span>}
              </span>
            </div>
          </div>

          {/* Medicine Name */}
          <div>
            <label className="label">Medicine Name *</label>
            <input
              type="text"
              value={form.medicineName}
              onChange={(e) => setForm((f) => ({ ...f, medicineName: e.target.value }))}
              placeholder="e.g. Paracetamol 500mg"
              className="input-field"
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="label">Manufacturer Company *</label>
            <input
              type="text"
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              placeholder="e.g. Sun Pharma Ltd"
              className="input-field"
            />
          </div>

          {/* Expiry + Quantity row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Expiry Date *</label>
              <input
                type="date"
                value={form.expiryDate}
                min={today}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Quantity (units) *</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g. 1000"
                className="input-field"
              />
            </div>
          </div>

          {/* IPFS Hash (optional) */}
          <div>
            <label className="label">IPFS Document Hash <span className="text-muted">(optional)</span></label>
            <input
              type="text"
              value={form.ipfsHash}
              onChange={(e) => setForm((f) => ({ ...f, ipfsHash: e.target.value }))}
              placeholder="Qm... (upload docs to IPFS first)"
              className="input-field"
            />
          </div>
        </div>

        <div className="mt-6">
          <TxButton
            txStatus={txStatus}
            onClick={handleRegister}
            label="Register Batch on Blockchain"
            loadingLabel="Confirming in MetaMask..."
            disabled={!isFormValid}
          />
        </div>

        {txStatus.state === "success" && (
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setTxStatus({ state: "idle", hash: null, error: null });
              setRegisteredBatchId(null);
              setBatchIdStatus("idle");
            }}
            className="mt-3 w-full text-sm text-text-secondary hover:text-text-primary
                       transition-colors text-center"
          >
            + Register Another Batch
          </button>
        )}
      </div>

      {/* QR Code after successful registration */}
      {registeredBatchId && txStatus.state === "success" && (
        <QRGenerator
          batchId={registeredBatchId}
          medicineName={form.medicineName || registeredBatchId}
          contractAddress={process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ""}
        />
      )}

      {/* Transfer section */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-5">
          Transfer Batch to Distributor
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Batch ID</label>
            <input
              type="text"
              value={activeBatchForTransfer ?? ""}
              onChange={(e) => setActiveBatchForTransfer(e.target.value)}
              placeholder="Enter the batch ID you want to transfer"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Distributor Wallet Address</label>
            <input
              type="text"
              value={transferForm.distributor}
              onChange={(e) => setTransferForm((f) => ({ ...f, distributor: e.target.value }))}
              placeholder="0x..."
              className="input-field font-mono"
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              type="text"
              value={transferForm.location}
              onChange={(e) => setTransferForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Mumbai Warehouse"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Notes <span className="text-muted">(optional)</span></label>
            <input
              type="text"
              value={transferForm.notes}
              onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional information"
              className="input-field"
            />
          </div>
        </div>

        <div className="mt-5">
          <TxButton
            txStatus={transferTx}
            onClick={handleTransfer}
            label="Transfer to Distributor"
            disabled={!activeBatchForTransfer || !transferForm.distributor}
          />
        </div>
      </div>
    </div>
  );
}

export default function ManufacturerPage() {
  return <ManufacturerContent />;
}
