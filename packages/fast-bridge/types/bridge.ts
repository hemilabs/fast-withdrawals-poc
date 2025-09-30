import type { Address, Hash, TransactionReceipt, WalletClient } from "viem";

// Bridge operation events
export type BridgeEvents = {
  "bridge-failed": [Error];
  "bridge-failed-validation": [string];
  "bridge-settled": [];
  "bridge-transaction-reverted": [TransactionReceipt];
  "bridge-transaction-succeeded": [TransactionReceipt];
  "pre-approve": [];
  "pre-bridge": [];
  "token-approval-failed": [Error];
  "token-approval-reverted": [TransactionReceipt];
  "token-approval-succeeded": [TransactionReceipt];
  "unexpected-error": [Error];
  "user-rejected-bridge": [Error];
  "user-rejected-token-approval": [Error];
  "user-signed-bridge": [Hash];
  "user-signed-token-approval": [Hash];
};

// Bridge parameters
export type BridgeParams = {
  amount: bigint;
  fromAddress: Address;
  toAddress: Address;
  tokenAddress: Address;
  walletClient: WalletClient;
};

// Fee estimation parameters
export type FeeEstimationParams = {
  amount: bigint;
  chainId: number;
  feeBasisPoints: number;
  toAddress: Address;
  tokenAddress: Address;
};
