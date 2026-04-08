"use client";

import { useState } from "react";
import RoleBanner from "@/components/RoleBanner";
import TxButton from "@/components/TxButton";
import QRScanner from "@/components/QRScanner";
import { transferToPharmacy } from "@/lib/contract";
import { decodeContractError } from "@/lib/web3";
import type { TxStatus } from "@/lib/types";

// A dummy address book for better UX (can be fetched from an API/Contract in production)
const KNOWN_PHARMACIES = [
  { name: "Apollo Pharmacy, Delhi", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" }, // Test account #3
  { name: "MedPlus, Mumbai", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },       // Test account #4
  { name: "Local Pharmacy, Chennai", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" } // Test account #5
];

interface TransferForm {
  batchId:  string;
  pharmacy: string;
  location: string;
  notes:    string;
}

const EMPTY_FORM: TransferForm = {
  batchId:  "",
  pharmacy: "",
  location: "",
  notes:    "",
};

function DistributorContent() {
  const [form, setForm]         = useState<TransferForm>(EMPTY_FORM);
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle", hash: null, error: null });
  const [showScanner, setShowScanner] = useState(false);

  const handleTransfer = async () => {
    setTxStatus({ state: "pending", hash: null, error: null });
    try {
      const tx = await transferToPharmacy({
        batchId:  form.batchId.trim(),
        pharmacy: form.pharmacy.trim(),
        location: form.location.trim(),
        notes:    form.notes.trim(),
      });
      await tx.wait();
      setTxStatus({ state: "success", hash: tx.hash, error: null });
    } catch (err) {
      setTxStatus({ state: "error", hash: null, error: decodeContractError(err) });
    }
  };

  const isValid = form.batchId.trim() && form.pharmacy.trim() && form.location.trim();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {showScanner && (
        <QRScanner
          onResult={(id) => {
            setForm((f) => ({ ...f, batchId: id }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🚚 Distributor Portal</h1>
        <p className="text-text-secondary text-sm">
          Transfer medicine batches from your custody to registered pharmacies.
          The transfer is recorded permanently on Ethereum.
        </p>
      </div>

      <RoleBanner requiredRole="DISTRIBUTOR" />

      {/* Info card */}
      <div className="card mb-6 bg-secondary/5 border-secondary/20">
        <div className="flex gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="font-semibold text-text-primary text-sm mb-1">How Transfers Work</h3>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>You must own the batch (it must be in <strong className="text-text-primary">InTransit</strong> status assigned to you)</li>
              <li>The pharmacy address must be registered with <strong className="text-text-primary">PHARMACY_ROLE</strong></li>
              <li>Transfer is irreversible once confirmed on-chain</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transfer form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary mb-5">
          Transfer Batch to Pharmacy
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Batch ID *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.batchId}
                onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
                placeholder="e.g. BATCH-2025-001"
                className="input-field flex-1"
              />
              <button 
                onClick={() => setShowScanner(true)}
                className="btn-outline px-4 text-sm whitespace-nowrap"
              >
                📷 Scan
              </button>
            </div>
          </div>

          <div>
            <label className="label">Pharmacy Address Book *</label>
            <select
              value={form.pharmacy}
              onChange={(e) => setForm((f) => ({ ...f, pharmacy: e.target.value }))}
              className="input-field font-mono text-sm"
            >
              <option value="">-- Select a Pharmacy --</option>
              {KNOWN_PHARMACIES.map((p) => (
                <option key={p.address} value={p.address}>
                  {p.name} ({p.address.substring(0,6)}...{p.address.substring(38)})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">Or paste a manual address below if not listed.</p>
            <input
              type="text"
              value={form.pharmacy}
              onChange={(e) => setForm((f) => ({ ...f, pharmacy: e.target.value }))}
              placeholder="0x..."
              className="input-field font-mono mt-2"
            />
          </div>

          <div>
            <label className="label">Delivery Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Apollo Pharmacy, Chennai"
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Notes <span className="text-muted">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Cold chain maintained, special handling notes, etc."
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="mt-6">
          <TxButton
            txStatus={txStatus}
            onClick={handleTransfer}
            label="Transfer to Pharmacy"
            disabled={!isValid}
          />
        </div>

        {txStatus.state === "success" && (
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setTxStatus({ state: "idle", hash: null, error: null });
            }}
            className="mt-3 w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            + Transfer Another Batch
          </button>
        )}
      </div>

      {/* Quick verify link */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted">
          Need to check a batch status?{" "}
          <a href="/verify" className="text-primary hover:underline">
            Verify a Batch →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function DistributorPage() {
  return <DistributorContent />;
}
