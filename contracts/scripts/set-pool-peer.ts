#!/usr/bin/env tsx

import { type Address } from "viem";
import { readContract } from "viem/actions";
import * as dotenv from "dotenv";

import { PoolABI, PoolFactoryABI } from "../abi/index.js";

import { addressToBytes32, CHAINS, ChainName, createWallet } from "./utils.js";

// Load environment variables
dotenv.config();

interface PeerConfig {
  accountIndex: number;
  chain: (typeof CHAINS)[ChainName];
  dstEid: number;
  mnemonic: string;
  peerAddress: Address;
  poolAddress: Address;
  poolFactoryAddress: Address;
  rpcUrl: string;
}

export async function setPoolPeer(config: PeerConfig) {
  console.log(`🔗 Setting peer for pool on ${config.chain.name}...`);
  const { walletClient, publicClient, account } = createWallet(config);

  console.log(`📝 Pool address: ${config.poolAddress}`);
  console.log(`🌐 Peer address: ${config.peerAddress}`);
  console.log(`🆔 EID: ${config.dstEid}`);

  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${balance} wei`);

  if (balance === 0n) {
    console.warn("⚠️  Account balance is zero - transaction will fail");
  }

  try {
    // Call setPeer function
    console.log("📡 Calling setPeer...");
    const hash = await walletClient.writeContract({
      address: config.poolAddress,
      abi: PoolABI,
      functionName: "setPeer",
      args: [config.dstEid, addressToBytes32(config.peerAddress)],
    });

    console.log(`📋 Transaction hash: ${hash}`);
    console.log("⏳ Waiting for transaction confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

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
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`setPeer failed: ${error}`);
  }
}

async function main() {
  // Read configuration from environment variables
  const chainEnv = process.env.CHAIN;
  const rpcEnv = process.env.RPC_URL;
  const accountIndexEnv = process.env.ACCOUNT_INDEX;
  const poolAddressEnv = process.env.POOL_ADDRESS;
  const poolFactoryAddressEnv = process.env.FACTORY_ADDRESS;
  const peerAddressEnv = process.env.PEER_ADDRESS;

  // Validate required environment variables
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error(
      "MNEMONIC environment variable is required\nAvailable chains: mainnet, hemi",
    );
  }

  if (!poolAddressEnv) {
    throw new Error("POOL_ADDRESS environment variable is required");
  }

  if (!poolFactoryAddressEnv) {
    throw new Error("FACTORY_ADDRESS environment variable is required");
  }

  if (!peerAddressEnv) {
    throw new Error("PEER_ADDRESS environment variable is required");
  }

  if (!chainEnv || !(chainEnv in CHAINS)) {
    throw new Error(
      `CHAIN environment variable is required\nAvailable chains: ${Object.keys(CHAINS).join(", ")}`,
    );
  }

  // Resolve chain and RPC URL
  const chainName = chainEnv as ChainName;
  const chain = CHAINS[chainName];
  const rpcUrl = rpcEnv || chain.rpcUrls.default.http[0];
  const accountIndex = accountIndexEnv ? parseInt(accountIndexEnv) : 0;

  const config: Omit<PeerConfig, "dstEid"> = {
    chain,
    rpcUrl,
    mnemonic,
    accountIndex,
    poolAddress: poolAddressEnv as Address,
    peerAddress: peerAddressEnv as Address,
    poolFactoryAddress: poolFactoryAddressEnv as Address,
  };

  const { publicClient } = createWallet(config);

  const dstEid = await readContract(publicClient, {
    abi: PoolFactoryABI,
    address: config.poolFactoryAddress,
    functionName: "dstEid",
  });

  const result = await setPoolPeer({ ...config, dstEid });

  console.log("\n🎉 Peer Set Summary:");
  console.log(`Chain: ${config.chain.name}`);
  console.log(`Pool Address: ${config.poolAddress}`);
  console.log(`Peer Address: ${config.peerAddress}`);
  console.log(`EID: ${dstEid}`);
  console.log(`Transaction Hash: ${result.transactionHash}`);
  console.log(`Block Number: ${result.blockNumber}`);
  console.log(`Gas Used: ${result.gasUsed}`);
}

function handleError(error: unknown): never {
  console.error("❌ Script failed:");
  console.error(error);
  process.exit(1);
}

if (require.main === module) {
  main().catch(handleError);
}
