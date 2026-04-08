"use client";

import { TransferRecord, BatchStatus } from "@/lib/types";
import { formatDateTime, shortenAddress, etherscanLink } from "@/lib/web3";

interface SupplyChainTimelineProps {
  history: TransferRecord[];
  currentStatus: BatchStatus;
}

const STEP_CONFIG = [
  {
    role:  "MANUFACTURER",
    icon:  "🏭",
    label: "Manufactured",
    color: "text-primary",
    bg:    "bg-primary/10 border-primary/30",
  },
  {
    role:  "MANUFACTURER", // transfer-out by manufacturer
    icon:  "🚚",
    label: "Dispatched to Distributor",
    color: "text-secondary",
    bg:    "bg-secondary/10 border-secondary/30",
  },
  {
    role:  "DISTRIBUTOR",
    icon:  "📦",
    label: "Received at Distributor",
    color: "text-secondary",
    bg:    "bg-secondary/10 border-secondary/30",
  },
  {
    role:  "PHARMACY",
    icon:  "💊",
    label: "Received at Pharmacy",
    color: "text-success",
    bg:    "bg-success/10 border-success/30",
  },
  {
    role:  "PHARMACY-SOLD",
    icon:  "🛒",
    label: "Sold to Patient",
    color: "text-primary",
    bg:    "bg-primary/10 border-primary/30",
  },
];

function getRoleIcon(role: string, notes: string): string {
  if (notes.toLowerCase().includes("dispensed") || notes.toLowerCase().includes("sold")) return "🛒";
  if (notes.toLowerCase().includes("recalled")) return "⚠️";
  if (role === "MANUFACTURER" && notes.toLowerCase().includes("registered")) return "🏭";
  if (role === "MANUFACTURER") return "🚚";
  if (role === "DISTRIBUTOR") return "📦";
  if (role === "PHARMACY") return "💊";
  return "📋";
}

function getRoleColor(role: string, notes: string): string {
  if (notes.toLowerCase().includes("recalled")) return "text-danger";
  if (notes.toLowerCase().includes("dispensed") || notes.toLowerCase().includes("sold")) return "text-primary";
  if (role === "MANUFACTURER") return "text-primary";
  if (role === "DISTRIBUTOR") return "text-secondary";
  if (role === "PHARMACY") return "text-success";
  return "text-text-secondary";
}

function getStepLabel(record: TransferRecord): string {
  const notes = record.notes.toLowerCase();
  if (notes.includes("recalled")) return "Recalled";
  if (notes.includes("dispensed") || notes.includes("sold")) return "Sold to Patient";
  if (notes.includes("registered")) return "Batch Manufactured";
  if (record.role === "MANUFACTURER") return "Dispatched to Distributor";
  if (record.role === "DISTRIBUTOR") return "Transferred to Pharmacy";
  if (record.role === "PHARMACY") return "Received at Pharmacy";
  return "Transfer";
}

export default function SupplyChainTimeline({
  history,
  currentStatus,
}: SupplyChainTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        No transfer history available.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((record, idx) => {
        const isLast = idx === history.length - 1;
        const icon = getRoleIcon(record.role, record.notes);
        const color = getRoleColor(record.role, record.notes);
        const isRecall = record.notes.toLowerCase().includes("recalled");

        return (
          <div key={idx} className="relative flex gap-4">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border z-0" />
            )}

            {/* Step icon */}
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                          text-lg flex-shrink-0 border
                          ${isRecall ? "bg-danger/10 border-danger/30" : "bg-surface border-border"}`}
            >
              {icon}
            </div>

            {/* Step content */}
            <div className={`pb-6 flex-1 ${!isLast ? "min-h-[56px]" : ""}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className={`font-semibold text-sm ${color}`}>
                    {getStepLabel(record)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDateTime(record.timestamp)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium
                    ${isRecall
                      ? "bg-danger/10 text-danger border-danger/20"
                      : "bg-surface text-text-secondary border-border"
                    }`}
                >
                  {record.role}
                </span>
              </div>

              {/* Location */}
              {record.location && record.location !== "N/A" && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs text-text-secondary">{record.location}</span>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <p className="text-xs text-muted mt-1 italic">{record.notes}</p>
              )}

              {/* Addresses */}
              <div className="flex flex-wrap gap-3 mt-2">
                {record.from !== "0x0000000000000000000000000000000000000000" && (
                  <span className="text-xs text-muted">
                    From:{" "}
                    <a
                      href={etherscanLink(record.from, "address")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono"
                    >
                      {shortenAddress(record.from)}
                    </a>
                  </span>
                )}
                {record.to !== "0x0000000000000000000000000000000000000000" && (
                  <span className="text-xs text-muted">
                    To:{" "}
                    <a
                      href={etherscanLink(record.to, "address")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono"
                    >
                      {shortenAddress(record.to)}
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Status indicator for sold */}
      {currentStatus === BatchStatus.Sold && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-lg">
            ✅
          </div>
          <p className="text-sm text-primary font-medium">Complete supply chain verified</p>
        </div>
      )}
    </div>
  );
}
