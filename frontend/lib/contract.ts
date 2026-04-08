import { ethers } from "ethers";
import { getReadOnlyProvider, getSigner } from "./web3";
import type {
  MedicineBatch,
  TransferRecord,
  VerifyResult,
  GenuineResult,
} from "./types";

const MEDICHAIN_ABI = [
  "function registerBatch(string batchId, string medicineName, string manufacturer, uint256 expiryDate, uint256 quantity, string ipfsHash) external",
  "function transferToDistributor(string batchId, address distributor, string location, string notes) external",
  "function transferToPharmacy(string batchId, address pharmacy, string location, string notes) external",
  "function dispenseUnits(string batchId, uint256 units) external",
  "function recallBatch(string batchId, string reason) external",
];

const ROLE_MANAGER_ABI = [
  "function isManufacturer(address) view returns (bool)",
  "function isDistributor(address) view returns (bool)",
  "function isPharmacy(address) view returns (bool)",
  "function isAdmin(address) view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MANUFACTURER_ROLE() view returns (bytes32)",
  "function DISTRIBUTOR_ROLE() view returns (bytes32)",
  "function PHARMACY_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
];


function getMedichainAddress(): string {
  const envAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (envAddr && envAddr.startsWith("0x")) return envAddr;
  return "0x0000000000000000000000000000000000000000";
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function getRoleManagerAddress(): string {
  const envAddr = process.env.NEXT_PUBLIC_ROLE_MANAGER_ADDRESS;
  if (envAddr && envAddr.startsWith("0x") && envAddr !== ZERO_ADDRESS) return envAddr;
  return ZERO_ADDRESS;
}

export function isContractDeployed(): boolean {
  const mc = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const rm = process.env.NEXT_PUBLIC_ROLE_MANAGER_ADDRESS;
  return !!(
    mc && mc.startsWith("0x") && mc !== ZERO_ADDRESS &&
    rm && rm.startsWith("0x") && rm !== ZERO_ADDRESS
  );
}

export function getRoleManagerReadOnly(): ethers.Contract {
  return new ethers.Contract(
    getRoleManagerAddress(),
    ROLE_MANAGER_ABI,
    getReadOnlyProvider()
  );
}

export async function getMedichainSigner(): Promise<ethers.Contract> {
  const signer = await getSigner();
  return new ethers.Contract(getMedichainAddress(), MEDICHAIN_ABI, signer);
}

export async function getRoleManagerSigner(): Promise<ethers.Contract> {
  const signer = await getSigner();
  return new ethers.Contract(getRoleManagerAddress(), ROLE_MANAGER_ABI, signer);
}

// ============================================================
// PYTHON API CALLS (READS)
// ============================================================

const API_BASE = "http://127.0.0.1:8000/api";

export async function verifyBatch(batchId: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE}/batches/${batchId}`);
  if (!res.ok) {
    throw new Error("MediChain: batch not found");
  }
  const data = await res.json();
  
  // Transform bigints internally since JSON doesn't support them out of the box
  return {
    batch: {
        ...data.batch,
        quantity: BigInt(data.batch.quantity),
        dispensedCount: BigInt(data.batch.dispensedCount),
        manufactureDate: BigInt(data.batch.manufactureDate),
        expiryDate: BigInt(data.batch.expiryDate)
    },
    history: data.history.map((h: any) => ({
        ...h,
        timestamp: BigInt(h.timestamp)
    }))
  };
}

export async function getStats(): Promise<{
  totalBatches: bigint;
  totalTransfers: bigint;
  totalRecalls: bigint;
}> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) return { totalBatches: 0n, totalTransfers: 0n, totalRecalls: 0n };
  const data = await res.json();
  return {
      totalBatches: BigInt(data.totalBatches),
      totalTransfers: BigInt(data.totalTransfers),
      totalRecalls: BigInt(data.totalRecalls)
  };
}

export async function getRecallReason(batchId: string): Promise<string> {
    const data = await verifyBatch(batchId);
    // As per new backend integration, recall reasons are tracked inside history notes.
    const recallEvent = data.history.find(h => h.notes.toLowerCase().includes("recalled"));
    return recallEvent?.notes.replace("RECALLED: ", "") || "No reason specified";
}

export async function batchExists(batchId: string): Promise<boolean> {
  try {
      await verifyBatch(batchId);
      return true;
  } catch {
      return false;
  }
}

// ─── Write transactions (Smart Contract via MetaMask) ──────────

const getTxOverrides = () => {
  const isLocal = process.env.NODE_ENV === "development" || !process.env.NEXT_PUBLIC_ALCHEMY_URL;
  return isLocal ? { gasLimit: BigInt(5000000), gasPrice: BigInt(0) } : {};
};

export async function registerBatch(params: {
  batchId:      string;
  medicineName: string;
  manufacturer: string;
  expiryDate:   number; 
  quantity:     number;
  ipfsHash:     string;
}): Promise<ethers.TransactionResponse> {
  const contract = await getMedichainSigner();
  return contract.registerBatch(
    params.batchId,
    params.medicineName,
    params.manufacturer,
    params.expiryDate,
    params.quantity,
    params.ipfsHash,
    getTxOverrides()
  ) as Promise<ethers.TransactionResponse>;
}

export async function transferToDistributor(params: {
  batchId:     string;
  distributor: string;
  location:    string;
  notes:       string;
}): Promise<ethers.TransactionResponse> {
  const contract = await getMedichainSigner();
  return contract.transferToDistributor(
    params.batchId,
    params.distributor,
    params.location,
    params.notes,
    getTxOverrides()
  ) as Promise<ethers.TransactionResponse>;
}

export async function transferToPharmacy(params: {
  batchId:  string;
  pharmacy: string;
  location: string;
  notes:    string;
}): Promise<ethers.TransactionResponse> {
  const contract = await getMedichainSigner();
  return contract.transferToPharmacy(
    params.batchId,
    params.pharmacy,
    params.location,
    params.notes,
    getTxOverrides()
  ) as Promise<ethers.TransactionResponse>;
}

export async function dispenseUnits(
  batchId: string,
  units: number
): Promise<ethers.TransactionResponse> {
  const contract = await getMedichainSigner();
  return contract.dispenseUnits(batchId, units, getTxOverrides()) as Promise<ethers.TransactionResponse>;
}

export async function recallBatch(
  batchId: string,
  reason: string
): Promise<ethers.TransactionResponse> {
  const contract = await getMedichainSigner();
  return contract.recallBatch(batchId, reason, getTxOverrides()) as Promise<ethers.TransactionResponse>;
}

export async function grantRole(
  role: string,
  address: string
): Promise<ethers.TransactionResponse> {
  const contract = await getRoleManagerSigner();
  return contract.grantRole(role, address, getTxOverrides()) as Promise<ethers.TransactionResponse>;
}

export async function revokeRole(
  role: string,
  address: string
): Promise<ethers.TransactionResponse> {
  const contract = await getRoleManagerSigner();
  return contract.revokeRole(role, address, getTxOverrides()) as Promise<ethers.TransactionResponse>;
}

export async function getUserRole(address: string): Promise<string[]> {
    if (getRoleManagerAddress() === "0x0000000000000000000000000000000000000000") {
      return [];
    }
    const rm = getRoleManagerReadOnly();
    const [isMfr, isDist, isPharm, isAdm] = await Promise.all([
      rm.isManufacturer(address),
      rm.isDistributor(address),
      rm.isPharmacy(address),
      rm.isAdmin(address),
    ]);
    const roles: string[] = [];
    if (isAdm)   roles.push("ADMIN");
    if (isMfr)   roles.push("MANUFACTURER");
    if (isDist)  roles.push("DISTRIBUTOR");
    if (isPharm) roles.push("PHARMACY");
    return roles;
  }
