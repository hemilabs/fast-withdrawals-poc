import { useQuery } from "@tanstack/react-query";
import { quoteSend } from "fast-bridge/actions";
import { type PublicClient } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useEstimatePoolFees } from "./useEstimatePoolFees";
import type { PoolToken } from "types/poolToken";

export const useEstimateLayerZeroFees = function ({
  amount,
  pool,
}: {
  amount: bigint;
  pool: PoolToken;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: pool.token.chainId });

  const { data: feeBasisPoints } = useEstimatePoolFees(pool);

  return useQuery({
    enabled: !!address && !!publicClient && feeBasisPoints !== undefined,
    queryFn: () =>
      quoteSend(publicClient as PublicClient, {
        amount,
        chainId: pool.token.chainId,
        feeBasisPoints: feeBasisPoints!,
        toAddress: address!,
        tokenAddress: pool.token.address,
      }),
    queryKey: [
      "estimate-bridge-fees",
      address,
      amount.toString(),
      pool.token.chainId,
      pool.token.address,
    ],
    // every 12 seconds
    refetchInterval: 12 * 1000,
  });
};
