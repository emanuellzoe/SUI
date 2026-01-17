"use client";

import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWallets,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { useState, useEffect } from "react";

interface WalletInfoProps {
  account: any;
  balance: string;
  onDisconnect: () => void;
}

const WalletInfo = ({ account, balance, onDisconnect }: WalletInfoProps) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Balance Display */}
      <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-gray-900 font-medium text-sm">{balance} SUI</span>
      </div>

      {/* Account Info */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {account.address.slice(2, 4).toUpperCase()}
          </span>
        </div>
        <span className="text-gray-700 font-medium text-sm">
          {formatAddress(account.address)}
        </span>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={onDisconnect}
        className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        title="Disconnect Wallet"
      >
        Disconnect
      </button>
    </div>
  );
};

interface WalletSelectorProps {
  wallets: any[];
  onConnect: (walletName: string) => void;
  isConnecting: boolean;
}

const WalletSelector = ({
  wallets,
  onConnect,
  isConnecting,
}: WalletSelectorProps) => {
  return (
    <div className="space-y-2">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Connect Wallet
        </h3>
        <p className="text-gray-600 text-sm">Choose your wallet to continue</p>
      </div>

      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => onConnect(wallet.name)}
          disabled={isConnecting}
          className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            {wallet.icon ? (
              <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
            ) : (
              <span className="text-white text-sm font-medium">
                {wallet.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900 text-sm">
              {wallet.name}
            </div>
            {wallet.version && (
              <div className="text-xs text-gray-500">
                Version {wallet.version}
              </div>
            )}
          </div>

          {isConnecting && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          )}
        </button>
      ))}
    </div>
  );
};

const WalletConnection = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const wallets = useWallets();

  const { data: balance } = useSuiClientQuery(
    "getBalance",
    {
      owner: currentAccount?.address || "",
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleConnect = async (walletName: string) => {
    try {
      setIsConnecting(true);
      const selectedWallet = wallets.find(
        (wallet) => wallet.name === walletName
      );

      if (selectedWallet) {
        connect(
          { wallet: selectedWallet },
          {
            onSuccess: () => {
              setIsConnecting(false);
              setShowDropdown(false);
            },
            onError: (error) => {
                            setIsConnecting(false);
            },
          }
        );
      }
    } catch (error) {
            setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const formatBalance = (balance: any): string => {
    if (!balance) return "0";
    const totalBalance = balance.totalBalance || "0";
    const balanceInSui = Number(totalBalance) / 1_000_000_000; // Convert MIST to SUI
    return balanceInSui.toFixed(4);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".wallet-dropdown")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (currentAccount) {
    return (
      <WalletInfo
        account={currentAccount}
        balance={formatBalance(balance)}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <div className="relative wallet-dropdown">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="btn btn-primary flex items-center gap-2"
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-white rounded-lg border border-gray-200 shadow-lg z-50 animate-in slide-in-from-top-2">
          <WalletSelector
            wallets={wallets}
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
