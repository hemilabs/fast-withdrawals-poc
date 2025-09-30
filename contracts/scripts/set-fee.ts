#!/usr/bin/env tsx

import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { Address } from "viem";
import * as dotenv from "dotenv";

import { PoolABI } from "../abi";

import { ChainName, CHAINS, createWallet } from "./utils";

// Load environment variables
dotenv.config();

/**
 * Handle errors with appropriate messages and exit codes
 */
function handleError(error: unknown): never {
  console.error("❌ Script failed:");
  console.error(error);
  process.exit(1);
}

async function main() {
  // Read configuration from environment variables
  const accountIndexEnv = process.env.ACCOUNT_INDEX;
  const chainEnv = process.env.CHAIN;
  const mnemonic = process.env.MNEMONIC;
  const poolAddressEnv = process.env.POOL_ADDRESS;

  if (!mnemonic) {
    throw new Error(
      "MNEMONIC environment variable is required\n" +
        "Available chains: mainnet, hemi",
    );
  }

  if (!poolAddressEnv) {
    throw new Error("POOL_ADDRESS environment variable is required");
  }

  if (!chainEnv || !(chainEnv in CHAINS)) {
    throw new Error(
      `CHAIN environment variable is required\nAvailable chains: ${Object.keys(CHAINS).join(", ")}`,
    );
  }

  // Resolve chain and RPC URL
  const chainName = chainEnv as ChainName;
  const chain = CHAINS[chainName];
  const accountIndex = accountIndexEnv ? parseInt(accountIndexEnv) : 0;
  const poolAddress = poolAddressEnv as Address;

  const { walletClient } = createWallet({
    chain,
    accountIndex,
    mnemonic,
    rpcUrl: chain.rpcUrls.default.http[0],
  });

  const hash = await writeContract(walletClient, {
    abi: PoolABI,
    address: poolAddress,
    functionName: "setFee",
    // 1%
    args: [100],
  });

  const receipt = await waitForTransactionReceipt(walletClient, { hash });

  if (receipt.status === "success") {
    console.log("✅ Peer set successfully!");
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    console.log(`🧾 Block number: ${receipt.blockNumber}`);
    return {
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } else {
    throw new Error("Transaction failed");
  }
}

if (require.main === module) {
  main().catch(handleError);
}
