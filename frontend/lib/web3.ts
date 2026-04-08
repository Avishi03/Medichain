import { ethers } from "ethers";
import {
  APP_BLOCK_EXPLORER_URL,
  APP_CHAIN_HEX,
  APP_CHAIN_ID,
  APP_NETWORK_LABEL,
} from "./types";

// ============================================================
// Provider helpers
// ============================================================

/**
 * Read-only provider — no wallet needed.
 * Used on the /verify page so patients can check without MetaMask.
 */
export function getReadOnlyProvider(): ethers.JsonRpcProvider {
  const url =
    process.env.NEXT_PUBLIC_ALCHEMY_URL ||
    "https://eth-sepolia.g.alchemy.com/v2/demo";
  return new ethers.JsonRpcProvider(url);
}

/**
 * Browser wallet provider (MetaMask).
 * Requests account access — user will see a MetaMask popup.
 */
export async function getBrowserProvider(): Promise<ethers.BrowserProvider> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to continue."
    );
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider;
}

/**
 * Returns the connected signer (wallet) from MetaMask.
 */
export async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const provider = await getBrowserProvider();
  return provider.getSigner();
}

// ============================================================
// Contract factory
// ============================================================

export function getContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  abi: ethers.InterfaceAbi,
  address: string
): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

// ============================================================
// Network helpers
// ============================================================

export async function getCurrentChainId(): Promise<number> {
  if (typeof window === "undefined" || !window.ethereum) return 0;
  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(chainIdHex as string, 16);
}

export async function switchToAppNetwork(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: APP_CHAIN_HEX }],
    });
  } catch (error: unknown) {
    // Chain not added — add it
    if ((error as { code: number }).code === 4902) {
      const isLocal = APP_CHAIN_ID === 31337;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: APP_CHAIN_HEX,
            chainName: APP_NETWORK_LABEL,
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [process.env.NEXT_PUBLIC_ALCHEMY_URL || "http://127.0.0.1:8545"],
            ...(isLocal ? {} : { blockExplorerUrls: [APP_BLOCK_EXPLORER_URL] }),
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

export function isExpectedChain(chainId: number | null): boolean {
  return chainId === APP_CHAIN_ID;
}

// ============================================================
// Address / formatting helpers
// ============================================================

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(timestamp: bigint | number): string {
  const ms = Number(timestamp) * 1000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: bigint | number): string {
  const ms = Number(timestamp) * 1000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isExpired(expiryTimestamp: bigint | number): boolean {
  return Number(expiryTimestamp) * 1000 < Date.now();
}

export function etherscanLink(hash: string, type: "tx" | "address" = "tx"): string {
  const base = APP_BLOCK_EXPLORER_URL;
  if (!base) return "";
  return type === "tx" ? `${base}/tx/${hash}` : `${base}/address/${hash}`;
}

// ============================================================
// Error decoding
// ============================================================

export function decodeContractError(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Unknown error";
  const err = error as {
    reason?: string;
    message?: string;
    shortMessage?: string;
    code?: string | number;
  };

  if (err.reason) return err.reason;
  if (err.shortMessage) return err.shortMessage;

  const msg = err.message || "";

  // Extract Solidity revert reason
  const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
  if (revertMatch) return revertMatch[1];

  // MetaMask / user rejection
  if (msg.includes("user rejected") || err.code === 4001) {
    return "Transaction cancelled by user.";
  }

  // Generic cleanup
  if (msg.length > 120) return msg.slice(0, 120) + "…";
  return msg || "Transaction failed. Please try again.";
}
