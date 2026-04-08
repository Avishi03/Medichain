"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentChainId, shortenAddress, switchToAppNetwork } from "@/lib/web3";
import { getUserRole } from "@/lib/contract";
import { APP_CHAIN_ID, type WalletState } from "@/lib/types";

export interface WalletHook extends WalletState {
  roles:       string[];
  isCorrectNetwork: boolean;
  connect:     () => Promise<void>;
  disconnect:  () => void;
  switchNetwork: () => Promise<void>;
  shortAddress: string;
}

export function useWallet(): WalletHook {
  const [state, setState] = useState<WalletState>({
    address:   null,
    chainId:   null,
    connected: false,
  });
  const [roles, setRoles] = useState<string[]>([]);

  const fetchRoles = useCallback(async (address: string) => {
    try {
      const r = await getUserRole(address);
      setRoles(r);
    } catch {
      setRoles([]);
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      window.open("https://metamask.io", "_blank");
      return;
    }
    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts.length) return;
    const chainId = await getCurrentChainId();
    const address = accounts[0];
    setState({ address, chainId, connected: true });
    await fetchRoles(address);
  }, [fetchRoles]);

  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, connected: false });
    setRoles([]);
  }, []);

  const switchNetwork = useCallback(async () => {
    await switchToAppNetwork();
    const chainId = await getCurrentChainId();
    setState((s) => ({ ...s, chainId }));
  }, []);

  // Listen for MetaMask events
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = async (accs: unknown) => {
      const accounts = accs as string[];
      if (!accounts.length) {
        disconnect();
      } else {
        const chainId = await getCurrentChainId();
        setState({ address: accounts[0], chainId, connected: true });
        await fetchRoles(accounts[0]);
      }
    };

    const handleChainChanged = (hex: unknown) => {
      const chainId = parseInt(hex as string, 16);
      setState((s) => ({ ...s, chainId }));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.ethereum.on("accountsChanged", handleAccountsChanged as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.ethereum.on("chainChanged", handleChainChanged as any);

    // Auto-reconnect if already connected
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(async (res) => {
        const accounts = res as string[];
        if (accounts.length) {
          const chainId = await getCurrentChainId();
          setState({ address: accounts[0], chainId, connected: true });
          await fetchRoles(accounts[0]);
        }
      })
      .catch(() => {});

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.ethereum?.removeListener("chainChanged", handleChainChanged as any);
    };
  }, [disconnect, fetchRoles]);

  return {
    ...state,
    roles,
    isCorrectNetwork: state.chainId === APP_CHAIN_ID,
    connect,
    disconnect,
    switchNetwork,
    shortAddress: state.address ? shortenAddress(state.address) : "",
  };
}
