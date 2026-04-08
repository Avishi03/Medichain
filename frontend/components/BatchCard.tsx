"use client";

import {
  MedicineBatch,
  BatchStatus,
  STATUS_LABELS,
  STATUS_ICONS,
} from "@/lib/types";
import {
  formatDate,
  shortenAddress,
  etherscanLink,
  isExpired,
} from "@/lib/web3";

interface BatchCardProps {
  batch:       MedicineBatch;
  showActions?: boolean;
  onTransfer?: () => void;
  onSell?:     () => void;
  onRecall?:   () => void;
  txHash?:     string;
}

const STATUS_STYLES: Record<BatchStatus, string> = {
  [BatchStatus.Manufactured]: "badge-info",
  [BatchStatus.InTransit]:    "badge-warning",
  [BatchStatus.AtPharmacy]:   "badge-success",
  [BatchStatus.Sold]:         "badge-info",
  [BatchStatus.Recalled]:     "badge-danger",
};

export default function BatchCard({
  batch,
  showActions,
  onTransfer,
  onSell,
  onRecall,
  txHash,
}: BatchCardProps) {
  const expired = isExpired(batch.expiryDate);
  const recalled = batch.status === BatchStatus.Recalled;

  const cardBorder = recalled
    ? "border-danger/30"
    : expired
    ? "border-warning/30"
    : "border-border";

  return (
    <div className={`card ${cardBorder} animate-slide-up`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-text-primary truncate">
            {batch.medicineName}
          </h3>
          <p className="text-xs text-muted font-mono mt-0.5">{batch.batchId}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <span className={STATUS_STYLES[batch.status]}>
            {STATUS_ICONS[batch.status]} {STATUS_LABELS[batch.status]}
          </span>
          {expired && !recalled && (
            <span className="badge-danger text-xs">EXPIRED</span>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-muted mb-0.5">Manufacturer</p>
          <p className="text-text-primary font-medium truncate">{batch.manufacturer}</p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Quantity</p>
          <p className="text-text-primary font-medium">
            {Number(batch.quantity).toLocaleString()} units
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Manufactured</p>
          <p className="text-text-primary">{formatDate(batch.manufactureDate)}</p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Expires</p>
          <p className={expired ? "text-warning font-medium" : "text-text-primary"}>
            {formatDate(batch.expiryDate)}
            {expired && " ⚠"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted mb-0.5">Manufacturer Wallet</p>
          <a
            href={etherscanLink(batch.manufacturerAddr, "address")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs font-mono hover:underline"
          >
            {shortenAddress(batch.manufacturerAddr, 6)}
          </a>
        </div>
        {batch.ipfsHash && (
          <div className="col-span-2">
            <p className="text-xs text-muted mb-0.5">IPFS Docs</p>
            <a
              href={`https://ipfs.io/ipfs/${batch.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs font-mono hover:underline"
            >
              {batch.ipfsHash.slice(0, 20)}…
            </a>
          </div>
        )}
      </div>

      {/* Tx hash */}
      {txHash && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted mb-0.5">Last Transaction</p>
          <a
            href={etherscanLink(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs font-mono hover:underline break-all"
          >
            {txHash}
          </a>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-4 pt-3 border-t border-border flex gap-2 flex-wrap">
          {onTransfer && batch.status === BatchStatus.Manufactured && (
            <button onClick={onTransfer} className="btn-primary text-sm py-2 flex-1">
              Transfer to Distributor
            </button>
          )}
          {onTransfer && batch.status === BatchStatus.InTransit && (
            <button onClick={onTransfer} className="btn-primary text-sm py-2 flex-1">
              Transfer to Pharmacy
            </button>
          )}
          {onSell && batch.status === BatchStatus.AtPharmacy && (
            <button onClick={onSell} className="btn-primary text-sm py-2 flex-1">
              Mark as Sold
            </button>
          )}
          {onRecall && !recalled && batch.status !== BatchStatus.Sold && (
            <button onClick={onRecall} className="btn-danger text-sm py-2 flex-1">
              Recall Batch
            </button>
          )}
        </div>
      )}
    </div>
  );
}
