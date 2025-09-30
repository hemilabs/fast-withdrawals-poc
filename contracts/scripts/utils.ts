import { createWalletClient, createPublicClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { mainnet, hemi } from "viem/chains";

/**
 * Converts an Ethereum address to bytes32 format (left-padded with zeros).
 * Equivalent to Solidity: bytes32(uint256(uint160(address)))
 */
export function addressToBytes32(address: string) {
  // Remove 0x prefix if present
  const addr = address.startsWith("0x") ? address.slice(2) : address;
  // Pad left with zeros to 64 chars (32 bytes)
  const padded = addr.padStart(64, "0");
  return `0x${padded}` as `0x${string}`;
}

export const CHAINS = {
  mainnet,
  hemi,
} as const;

export type ChainName = keyof typeof CHAINS;

export interface WalletConfig {
  chain: (typeof CHAINS)[ChainName];
  rpcUrl: string;
  mnemonic: string;
  accountIndex: number;
}

export function createWallet(config: WalletConfig) {
  const account = mnemonicToAccount(config.mnemonic, {
    addressIndex: config.accountIndex,
    // accountIndex: config.accountIndex,
  });

  const walletClient = createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  return { walletClient, publicClient, account };
}
