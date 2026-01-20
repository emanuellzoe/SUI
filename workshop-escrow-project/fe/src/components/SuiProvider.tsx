"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { RoleProvider } from "../hooks/useRole";

export const networks = {
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  localnet: { url: "http://localhost:9000" },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Enable refetch on window focus for wallet changes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

interface SuiProviderProps {
  children: ReactNode;
  network?: keyof typeof networks;
}

const SuiProvider: React.FC<SuiProviderProps> = ({
  children,
  network = "testnet",
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networks}
        defaultNetwork={network}
        onNetworkChange={(newNetwork) => {
                  }}
      >
        <WalletProvider
          autoConnect
          stashedWallet={{
            name: "Freelance Marketplace",
          }}
        >
          <RoleProvider>
            {children}
          </RoleProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export default SuiProvider;

