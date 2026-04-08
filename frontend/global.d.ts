// Extend Window interface to include MetaMask's ethereum provider
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    // Use loose handler type so callers can provide typed handlers via cast
    on: (event: string, handler: (...args: never[]) => void) => void;
    removeListener: (event: string, handler: (...args: never[]) => void) => void;
    selectedAddress?: string;
    chainId?: string;
  };
}
