import type { Address, PublicClient } from "viem";
import { readContract } from "viem/actions";

import { poolAbi } from "../../contracts/pool";
import { getPoolFactoryAddress } from "../../contracts/poolFactory";
import type { FeeEstimationParams } from "../../types/bridge";
import { prepareSendParams } from "../../utils/pool";
import { getDstEid, getPoolAddress } from "./poolFactory";

export const getFeeBasisPoints = async function (
  publicClient: PublicClient,
  params: { poolAddress: Address },
) {
  const { poolAddress } = params;
  return readContract(publicClient, {
    abi: poolAbi,
    address: poolAddress,
    functionName: "feeBasisPoints",
  });
};

export const getLiquidityAvailable = async function (
  publicClient: PublicClient,
  params: { poolAddress: Address },
) {
  const { poolAddress } = params;
  return readContract(publicClient, {
    abi: poolAbi,
    address: poolAddress,
    functionName: "getLiquidityAvailable",
  });
};

export const getPoolToken = async function (
  publicClient: PublicClient,
  params: { poolAddress: Address },
) {
  const { poolAddress } = params;
  return readContract(publicClient, {
    abi: poolAbi,
    address: poolAddress,
    functionName: "token",
  });
};

export const quoteSend = async function (
  publicClient: PublicClient,
  params: FeeEstimationParams,
) {
  const { amount, chainId, toAddress } = params;

  const poolFactoryAddress = getPoolFactoryAddress(chainId);

  const [dstEid, poolAddress] = await Promise.all([
    getDstEid(publicClient, { poolFactoryAddress }),
    getPoolAddress(publicClient, {
      poolFactoryAddress,
      tokenAddress: params.tokenAddress,
    }),
  ]);

  // Prepare send parameters
  const sendParam = prepareSendParams({
    amount,
    dstEid,
    toAddress,
  });

  // Quote the send operation to get fees
  return readContract(publicClient, {
    abi: poolAbi,
    address: poolAddress,
    args: [sendParam, false],
    functionName: "quoteSend",
  });
};
