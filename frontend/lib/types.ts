// ============================================================
// MediChain — Shared TypeScript Types
// ============================================================

export enum BatchStatus {
  Manufactured = 0,
  InTransit    = 1,
  AtPharmacy   = 2,
  Sold         = 3,
  Recalled     = 4,
}

export interface MedicineBatch {
  batchId:         string;
  medicineName:    string;
  manufacturer:    string;
  manufacturerAddr: string;
  manufactureDate: bigint;
  expiryDate:      bigint;
  quantity:        bigint;
  dispensedCount:  bigint;
  ipfsHash:        string;
  status:          BatchStatus;
  exists:          boolean;
}

export interface TransferRecord {
  from:      string;
  to:        string;
  role:      string;
  timestamp: bigint;
  location:  string;
  notes:     string;
}

export interface VerifyResult {
  batch:   MedicineBatch;
  history: TransferRecord[];
}

export interface GenuineResult {
  genuine:     boolean;
  status:      string;
  lastUpdated: bigint;
}

// ─── UI-specific types ────────────────────────────────────────────

export type WalletState = {
  address:   string | null;
  chainId:   number | null;
  connected: boolean;
};

export type TxState = "idle" | "pending" | "success" | "error";

export interface TxStatus {
  state:   TxState;
  hash:    string | null;
  error:   string | null;
}

export type UserRole = "MANUFACTURER" | "DISTRIBUTOR" | "PHARMACY" | "ADMIN" | "NONE";

// ─── Lookup helpers ───────────────────────────────────────────────

export const STATUS_LABELS: Record<BatchStatus, string> = {
  [BatchStatus.Manufactured]: "Manufactured",
  [BatchStatus.InTransit]:    "In Transit",
  [BatchStatus.AtPharmacy]:   "At Pharmacy",
  [BatchStatus.Sold]:         "Sold",
  [BatchStatus.Recalled]:     "Recalled",
};

export const STATUS_ICONS: Record<BatchStatus, string> = {
  [BatchStatus.Manufactured]: "🏭",
  [BatchStatus.InTransit]:    "🚚",
  [BatchStatus.AtPharmacy]:   "💊",
  [BatchStatus.Sold]:         "🛒",
  [BatchStatus.Recalled]:     "⚠️",
};

const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

export const APP_CHAIN_ID = Number.isFinite(configuredChainId)
  ? configuredChainId
  : 11155111;
export const APP_CHAIN_HEX = `0x${APP_CHAIN_ID.toString(16)}`;
export const APP_NETWORK_NAME =
  process.env.NEXT_PUBLIC_NETWORK ||
  (APP_CHAIN_ID === 31337 ? "localhost" : "sepolia");
export const APP_NETWORK_LABEL =
  APP_CHAIN_ID === 31337 ? "Local Hardhat" : "Sepolia Testnet";
export const APP_BLOCK_EXPLORER_URL =
  APP_CHAIN_ID === 11155111 ? "https://sepolia.etherscan.io" : "";
