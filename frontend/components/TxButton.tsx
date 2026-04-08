"use client";

import { etherscanLink } from "@/lib/web3";
import type { TxStatus } from "@/lib/types";

interface TxButtonProps {
  txStatus:    TxStatus;
  onClick:     () => void;
  label:       string;
  loadingLabel?: string;
  className?:  string;
  disabled?:   boolean;
}

export default function TxButton({
  txStatus,
  onClick,
  label,
  loadingLabel = "Confirming in MetaMask...",
  className = "btn-primary w-full",
  disabled,
}: TxButtonProps) {
  const isPending = txStatus.state === "pending";
  const isSuccess = txStatus.state === "success";
  const isError   = txStatus.state === "error";

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={isPending || disabled}
        className={className}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner" />
            {loadingLabel}
          </span>
        ) : (
          label
        )}
      </button>

      {isSuccess && txStatus.hash && (
        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
          <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs text-success font-semibold">Transaction confirmed!</p>
            <a
              href={etherscanLink(txStatus.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-mono truncate block"
            >
              {txStatus.hash.slice(0, 20)}...{txStatus.hash.slice(-6)} ↗
            </a>
          </div>
        </div>
      )}

      {isError && txStatus.error && (
        <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
          <svg className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-danger">{txStatus.error}</p>
        </div>
      )}
    </div>
  );
}
