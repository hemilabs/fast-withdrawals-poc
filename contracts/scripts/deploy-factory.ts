#!/usr/bin/env tsx

import { type Chain, parseEther, Address } from "viem";
import { mainnet, hemi } from "viem/chains";
import * as dotenv from "dotenv";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

import { createWallet } from "./utils.js";

// Load environment variables
dotenv.config();

// LayerZero configuration interface
interface LayerZeroConfig {
  endpoint: Address;
  srcEid: number;
  dstEid: number;
  sendLib: Address;
  receiveLib: Address;
}

// LayerZero configurations indexed by chain ID
const LAYERZERO_CONFIGS: Record<Chain["id"], LayerZeroConfig> = {
  // See https://docs.layerzero.network/v2/deployments/chains/ethereum
  [mainnet.id]: {
    endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    srcEid: 30101,
    dstEid: 30329, // Hemi
    sendLib: "0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1",
    receiveLib: "0xc02Ab410f0734EFa3F14628780e6e695156024C2",
  },
  // See https://docs.layerzero.network/v2/deployments/chains/hemi
  [hemi.id]: {
    endpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    srcEid: 30329,
    dstEid: 30101, // Ethereum
    sendLib: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
    receiveLib: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043",
  },
} as const;

// Chain configurations
const CHAINS = {
  mainnet,
  hemi,
} as const;

type ChainName = keyof typeof CHAINS;

interface DeploymentConfig {
  chain: (typeof CHAINS)[ChainName]; // The actual chain object
  rpcUrl: string; // Resolved RPC URL (either custom or chain default)
  mnemonic: string;
  accountIndex: number; // Always defined with default value
}

/**
 * Compile the contracts using Foundry
 */
function compileContracts() {
  console.log("🔨 Compiling contracts...");
  try {
    execSync("npm run build", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    console.log("✅ Compilation successful");
  } catch (error) {
    throw new Error(`Compilation failed: ${error}`);
  }
}

/**
 * Load contract artifacts from Foundry output
 */
function loadContractArtifact(contractName: string) {
  const artifactPath = join(
    process.cwd(),
    "out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );

  try {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    return {
      bytecode: artifact.bytecode.object as `0x${string}`,
      abi: artifact.abi,
    };
  } catch (error) {
    throw new Error(`Failed to load artifact for ${contractName}: ${error}`);
  }
}

/**
 * Deploy the PoolFactory contract
 */
async function deployPoolFactory(config: DeploymentConfig) {
  console.log(`🚀 Starting deployment to ${config.chain.name}...`);

  // Compile contracts first
  compileContracts();

  // Load contract artifact
  const { bytecode, abi } = loadContractArtifact("PoolFactory");

  // Create wallet and clients
  const { walletClient, publicClient, account } = createWallet(config);

  console.log(`📝 Deploying from account: ${account.address}`);

  // Get LayerZero configuration for the target chain
  const lzConfig = LAYERZERO_CONFIGS[config.chain.id];
  console.log(`🔗 Using LayerZero configuration:`);
  console.log(`  Endpoint: ${lzConfig.endpoint}`);
  console.log(`  Source EID: ${lzConfig.srcEid}`);
  console.log(`  Destination EID: ${lzConfig.dstEid}`);
  console.log(`  Send Library: ${lzConfig.sendLib}`);
  console.log(`  Receive Library: ${lzConfig.receiveLib}`);

  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${balance} wei`);

  if (balance < parseEther("0.01")) {
    console.warn("⚠️  Low account balance - deployment may fail");
  }

  try {
    // Deploy the contract
    console.log("📡 Deploying PoolFactory...");
    const hash = await walletClient.deployContract({
      abi,
      bytecode,
      args: [
        lzConfig.endpoint,
        lzConfig.dstEid,
        lzConfig.sendLib,
        lzConfig.srcEid,
        lzConfig.receiveLib,
      ],
    });

    console.log(`📋 Transaction hash: ${hash}`);
    console.log("⏳ Waiting for transaction confirmation...");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ PoolFactory deployed successfully!");
      console.log(
        `📍 PoolFactory contract address: ${receipt.contractAddress}`,
      );
      console.log(`⛽ Gas used: ${receipt.gasUsed}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);

      return {
        address: receipt.contractAddress,
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
    throw new Error(`Contract deployment failed: ${error}`);
  }
}

/**
 * Main function
 */
async function main() {
  // Read configuration from environment variables
  const chainEnv = process.env.CHAIN;
  const rpcEnv = process.env.RPC_URL;
  const accountIndexEnv = process.env.ACCOUNT_INDEX;

  // Validate required environment variables
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error(
      "MNEMONIC environment variable is required\n" +
        "Usage: Set environment variables: CHAIN, MNEMONIC, [RPC_URL], [ACCOUNT_INDEX]\n" +
        "Available chains: mainnet, hemi",
    );
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

  const config: DeploymentConfig = {
    chain,
    rpcUrl,
    mnemonic,
    accountIndex,
  };

  try {
    const result = await deployPoolFactory(config);

    console.log("\n🎉 Deployment Summary:");
    console.log(`Chain: ${config.chain.name}`);
    console.log(`Contract Address: ${result.address}`);
    console.log(`Transaction Hash: ${result.transactionHash}`);
    console.log(`Block Number: ${result.blockNumber}`);
    console.log(`Gas Used: ${result.gasUsed}`);

    // Save deployment info to file
    const lzConfig = LAYERZERO_CONFIGS[config.chain.id];
    const deploymentInfo = {
      chain: config.chain.name,
      contractAddress: result.address,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber.toString(),
      gasUsed: result.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      layerZeroConfig: {
        endpoint: lzConfig.endpoint,
        srcEid: lzConfig.srcEid,
        dstEid: lzConfig.dstEid,
        sendLib: lzConfig.sendLib,
        receiveLib: lzConfig.receiveLib,
      },
    };

    const deploymentFileName = `deployment-${config.chain.name}-${Date.now()}.json`;
    const deploymentPath = join(
      process.cwd(),
      "deployments",
      deploymentFileName,
    );

    // Create deployments directory if it doesn't exist
    execSync("mkdir -p deployments", { cwd: process.cwd() });

    require("fs").writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2),
    );
    console.log(`📁 Deployment info saved to: ${deploymentPath}`);
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

main().catch(handleError);
