#!/usr/bin/env tsx

import {
  parseEther,
  type Address,
  type TransactionReceipt,
  keccak256,
  toHex,
  decodeEventLog,
} from "viem";
import { mainnet, hemi } from "viem/chains";
import * as dotenv from "dotenv";
import { join } from "path";

import { PoolFactoryABI } from "../abi/index.js";

import { createWallet } from "./utils.js";

// Load environment variables
dotenv.config();

/**
 * Generate the event topic hash for PoolCreated event
 * PoolCreated(address indexed token, address indexed pool, address indexed creator, address treasury, uint16 feeBasisPoints, uint256 poolIndex)
 */
function getPoolCreatedEventTopic(): `0x${string}` {
  return keccak256(
    toHex("PoolCreated(address,address,address,address,uint16,uint256)"),
  );
}

/**
 * Extract pool address from PoolCreated event logs
 * @param receipt Transaction receipt containing the logs
 * @param factoryAddress Address of the PoolFactory contract
 * @returns Pool address if found, null otherwise
 */
function extractPoolAddress(
  receipt: TransactionReceipt,
  factoryAddress: Address,
): Address | null {
  const poolCreatedTopic = getPoolCreatedEventTopic();

  for (const log of receipt.logs) {
    // Check if this log is from our factory contract and has the PoolCreated event signature
    if (
      log.address.toLowerCase() === factoryAddress.toLowerCase() &&
      log.topics[0] === poolCreatedTopic
    ) {
      try {
        // Decode the event log to get properly typed data
        const decodedLog = decodeEventLog({
          abi: PoolFactoryABI,
          eventName: "PoolCreated",
          data: log.data,
          topics: log.topics,
        });

        // Return the pool address from the decoded event
        return decodedLog.args.pool;
      } catch (error) {
        console.warn("⚠️  Failed to decode PoolCreated event:", error);
        // Fallback to manual extraction if decoding fails
        if (log.topics[2]) {
          return `0x${log.topics[2].slice(26)}` as Address;
        }
      }
    }
  }

  return null;
}

// Chain configurations
const CHAINS = {
  mainnet,
  hemi,
} as const;

type ChainName = keyof typeof CHAINS;

export interface PoolConfig {
  chain: (typeof CHAINS)[ChainName]; // The actual chain object
  rpcUrl: string; // Resolved RPC URL (either custom or chain default)
  mnemonic: string;
  accountIndex: number; // Always defined with default value
  factoryAddress: Address;
  tokenAddress: Address;
  treasuryAddress?: Address; // Optional, defaults to caller
  feeBasisPoints: number; // Defaults to 0
}

/**
 * Create a new pool using the PoolFactory
 */
async function createPool(config: PoolConfig) {
  console.log(`🚀 Creating pool on ${config.chain.name}...`);

  // Create wallet and clients
  const { walletClient, publicClient, account } = createWallet(config);

  console.log(`📝 Creating pool from account: ${account.address}`);
  console.log(`🏭 PoolFactory address: ${config.factoryAddress}`);
  console.log(`🪙 Token address: ${config.tokenAddress}`);

  const treasuryAddress = config.treasuryAddress || account.address;
  console.log(`🏦 Treasury address: ${treasuryAddress}`);
  console.log(`💰 Fee basis points: ${config.feeBasisPoints}`);

  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${balance} wei`);

  if (balance < parseEther("0.01")) {
    console.warn("⚠️  Low account balance - transaction may fail");
  }

  try {
    // Call createPool function
    console.log("📡 Creating pool...");

    const hash = await walletClient.writeContract({
      address: config.factoryAddress,
      abi: PoolFactoryABI,
      functionName: "createPool",
      // needed because estimation fails with the default value
      gas: BigInt(5_000_000),
      args: [config.tokenAddress, treasuryAddress, config.feeBasisPoints],
    });

    console.log(`📋 Transaction hash: ${hash}`);
    console.log("⏳ Waiting for transaction confirmation...");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Pool created successfully!");

      // Extract pool address from logs using our helper function
      const poolAddress = extractPoolAddress(receipt, config.factoryAddress);

      if (poolAddress) {
        console.log(`🎯 Pool Address: ${poolAddress}`);
      } else {
        console.log("⚠️  Could not extract pool address from logs");
      }

      console.log(`⛽ Gas used: ${receipt.gasUsed}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);

      return {
        poolAddress,
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
    throw new Error(`Pool creation failed: ${error}`);
  }
}

/**
 * Main function
 */

export async function deployPool(config: PoolConfig) {
  try {
    const result = await createPool(config);

    console.log("\n🎉 Pool Creation Summary:");
    console.log(`Chain: ${config.chain.name}`);
    console.log(`Factory Address: ${config.factoryAddress}`);
    console.log(`Token Address: ${config.tokenAddress}`);
    console.log(`Pool Address: ${result.poolAddress || "N/A"}`);
    console.log(`Transaction Hash: ${result.transactionHash}`);
    console.log(`Block Number: ${result.blockNumber}`);
    console.log(`Gas Used: ${result.gasUsed}`);

    // Save pool creation info to file
    const poolInfo = {
      chain: config.chain.name,
      factoryAddress: config.factoryAddress,
      tokenAddress: config.tokenAddress,
      poolAddress: result.poolAddress,
      treasuryAddress: config.treasuryAddress || "caller",
      feeBasisPoints: config.feeBasisPoints,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber.toString(),
      gasUsed: result.gasUsed.toString(),
      timestamp: new Date().toISOString(),
    };

    const poolFileName = `pool-${config.chain.name}-${Date.now()}.json`;
    const poolPath = join(process.cwd(), "deployments", poolFileName);

    // Create deployments directory if it doesn't exist
    const { execSync } = await import("child_process");
    execSync("mkdir -p deployments", { cwd: process.cwd() });

    require("fs").writeFileSync(poolPath, JSON.stringify(poolInfo, null, 2));
    console.log(`📁 Pool info saved to: ${poolPath}`);

    return poolInfo;
  } catch (error) {
    // Re-throw to be caught by the outer handler
    throw error;
  }
}

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
  const chainEnv = process.env.CHAIN;
  const rpcEnv = process.env.RPC_URL;
  const accountIndexEnv = process.env.ACCOUNT_INDEX;
  const factoryAddressEnv = process.env.FACTORY_ADDRESS;
  const tokenAddressEnv = process.env.TOKEN_ADDRESS;
  const treasuryAddressEnv = process.env.TREASURY_ADDRESS;
  const feeBasisPointsEnv = process.env.FEE_BASIS_POINTS;

  // Validate required environment variables
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error(
      "MNEMONIC environment variable is required\n" +
        "Available chains: mainnet, hemi",
    );
  }

  if (!factoryAddressEnv) {
    throw new Error("FACTORY_ADDRESS environment variable is required");
  }

  if (!tokenAddressEnv) {
    throw new Error("TOKEN_ADDRESS environment variable is required");
  }

  // Validate chain environment variable (mandatory)
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
  const feeBasisPoints = feeBasisPointsEnv ? parseInt(feeBasisPointsEnv) : 0;

  const config: PoolConfig = {
    chain,
    rpcUrl,
    mnemonic,
    accountIndex,
    factoryAddress: factoryAddressEnv as Address,
    tokenAddress: tokenAddressEnv as Address,
    treasuryAddress: treasuryAddressEnv as Address | undefined,
    feeBasisPoints,
  };

  await deployPool(config);
}

if (require.main === module) {
  main().catch(handleError);
}
