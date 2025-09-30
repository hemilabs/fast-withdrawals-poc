import { EventEmitter } from "events";
import {
  type PublicClient,
  type TransactionReceipt,
  formatUnits,
  type Address,
  createPublicClient,
  encodeFunctionData,
  http,
} from "viem";
import {
  getBalance,
  readContract,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "viem/actions";
import {
  approveErc20Token,
  getErc20TokenAllowance,
  getErc20TokenBalance,
  getErc20TokenDecimals,
} from "viem-erc20/actions";

import { poolAbi } from "../../contracts/pool";
import { getPoolFactoryAddress } from "../../contracts/poolFactory";
import type { BridgeEvents, BridgeParams } from "../../types/bridge";
import { validateBridgeParams } from "../../utils/validation";

import { getDstEid, getPoolAddress } from "../public/poolFactory";
import { prepareSendParams } from "../../utils/pool";
import { getFeeBasisPoints, quoteSend } from "actions/public/pool";

// Check user balance and allowance
const checkUserBalance = async function ({
  amount,
  publicClient,
  tokenAddress,
  userAddress,
}: {
  amount: bigint;
  publicClient: PublicClient;
  tokenAddress: Address;
  userAddress: Address;
}): Promise<{ canBridge: true } | { canBridge: false; reason: string }> {
  try {
    // Check user's token balance
    const [balance, decimals] = await Promise.all([
      getErc20TokenBalance(publicClient, {
        account: userAddress,
        address: tokenAddress,
      }),
      getErc20TokenDecimals(publicClient, { address: tokenAddress }),
    ]);

    if (balance < amount) {
      return {
        canBridge: false,
        reason: `Insufficient token balance. Required: ${formatUnits(
          amount,
          decimals,
        )}, Available: ${formatUnits(balance, decimals)}`,
      };
    }

    // Check native token (ETH/BNB) balance for gas
    const nativeBalance = await getBalance(publicClient, {
      address: userAddress,
    });
    if (nativeBalance === BigInt(0)) {
      const nativeToken = publicClient.chain!.nativeCurrency.symbol;
      return {
        canBridge: false,
        reason: `Insufficient ${nativeToken} balance for gas fees`,
      };
    }
    return { canBridge: true };
  } catch (error) {
    return {
      canBridge: false,
      reason: `Failed to check balance: ${(error as Error).message}`,
    };
  }
};

const runBridgeToken = (params: BridgeParams) =>
  // eslint-disable-next-line complexity
  async function (emitter: EventEmitter<BridgeEvents>) {
    // Validate parameters
    const validation = validateBridgeParams(params);
    if (!validation.isValid) {
      emitter.emit("bridge-failed-validation", validation.reason);
      return;
    }

    const { amount, fromAddress, toAddress, tokenAddress, walletClient } =
      params;

    try {
      const sourceChainId = walletClient.chain!.id;

      const publicClient = createPublicClient({
        chain: walletClient.chain,
        transport: http(),
      });

      // Get Pool address
      const poolFactoryAddress = getPoolFactoryAddress(sourceChainId);

      const poolAddress = await getPoolAddress(publicClient, {
        poolFactoryAddress,
        tokenAddress,
      });

      // Check if user can bridge (balance, allowance, etc.)
      const balanceCheck = await checkUserBalance({
        amount,
        publicClient,
        tokenAddress,
        userAddress: fromAddress,
      });

      if (!balanceCheck.canBridge) {
        emitter.emit("bridge-failed-validation", balanceCheck.reason);
        return;
      }

      emitter.emit("pre-bridge");

      const allowance = await getErc20TokenAllowance(publicClient, {
        address: tokenAddress,
        owner: fromAddress,
        spender: poolAddress,
      });

      if (allowance < amount) {
        emitter.emit("pre-approve");

        const approveHash = await approveErc20Token(walletClient, {
          address: tokenAddress,
          amount,
          spender: poolAddress,
        }).catch(function (error: unknown) {
          emitter.emit("user-rejected-token-approval", error as Error);
        });

        if (!approveHash) {
          return;
        }

        emitter.emit("user-signed-token-approval", approveHash);

        const approveReceipt = await waitForTransactionReceipt(publicClient, {
          hash: approveHash,
        }).catch(function (error: unknown) {
          emitter.emit("token-approval-failed", error as Error);
        });

        if (!approveReceipt) {
          return;
        }

        const approveEventMap: Record<
          TransactionReceipt["status"],
          keyof BridgeEvents
        > = {
          reverted: "token-approval-reverted",
          success: "token-approval-succeeded",
        };

        emitter.emit(approveEventMap[approveReceipt.status], approveReceipt);

        if (approveReceipt.status !== "success") {
          return;
        }
      }

      const [dstEid, feeBasisPoints] = await Promise.all([
        getDstEid(publicClient, { poolFactoryAddress }),
        getFeeBasisPoints(publicClient, { poolAddress }),
      ]);

      // Prepare send parameters
      const sendParam = prepareSendParams({
        amount,
        dstEid,
        feeBasisPoints,
        toAddress,
      });

      // Quote the send operation to get fees
      const [messagingFee, nativeTokenBalance] = await Promise.all([
        quoteSend(publicClient, {
          amount,
          chainId: sourceChainId,
          feeBasisPoints,
          toAddress,
          tokenAddress,
        }),
        // Check user's token balance again, we need to compare it against messaging fee
        getBalance(publicClient, {
          address: fromAddress,
        }),
      ]);

      if (nativeTokenBalance < messagingFee.nativeFee) {
        emitter.emit(
          "bridge-failed-validation",
          "Insufficient native token balance to pay Layer Zero fe",
        );
        return;
      }

      // Simulate the bridge transaction
      const { request } = await simulateContract(publicClient, {
        abi: poolAbi,
        account: walletClient.account,
        address: poolAddress,
        args: [sendParam, messagingFee, fromAddress],
        functionName: "send",
        value: messagingFee.nativeFee,
      });

      // Execute the bridge transaction
      const hash = await writeContract(walletClient, request).catch(function (
        error: unknown,
      ) {
        emitter.emit("user-rejected-bridge", error as Error);
      });
      if (!hash) {
        return;
      }

      emitter.emit("user-signed-bridge", hash);

      // Wait for transaction confirmation
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash,
      }).catch(function (error: unknown) {
        emitter.emit("bridge-failed", error as Error);
      });

      if (!receipt) {
        return;
      }

      if (receipt.status === "success") {
        emitter.emit("bridge-transaction-succeeded", receipt);
      } else {
        emitter.emit("bridge-transaction-reverted", receipt);
      }
    } catch (error) {
      emitter.emit("unexpected-error", error as Error);
    } finally {
      emitter.emit("bridge-settled");
    }
  };

// Main export function
export const bridgeToken = function (
  ...args: Parameters<typeof runBridgeToken>
) {
  const emitter = new EventEmitter<BridgeEvents>();
  const promise = Promise.resolve().then(() =>
    runBridgeToken(...args)(emitter),
  );

  return { emitter, promise };
};

/**
 * Encode the send function call for batch operations
 */
export const encodeBridgeSend = function ({
  amount,
  dstEid,
  feeBasisPoints,
  messagingFee,
  refundAddress,
  toAddress,
}: {
  amount: bigint;
  dstEid: number;
  feeBasisPoints: number;
  messagingFee: { lzTokenFee: bigint; nativeFee: bigint };
  refundAddress: Address;
  toAddress: Address;
}) {
  const sendParam = prepareSendParams({
    amount,
    dstEid,
    feeBasisPoints,
    toAddress,
  });

  return encodeFunctionData({
    abi: poolAbi,
    args: [sendParam, messagingFee, refundAddress],
    functionName: "send",
  });
};
