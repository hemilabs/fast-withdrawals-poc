import { type PublicClient } from "viem";
import { readContract } from "viem/actions";

import { poolAbi } from "../../contracts/pool";
import { getPoolFactoryAddress } from "../../contracts/poolFactory";
import { FeeEstimationParams } from "../../types/bridge";
import { getDstEid, getPoolAddress } from "./poolFactory";
import { prepareSendParams } from "utils/pool";

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
