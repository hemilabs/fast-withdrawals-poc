import { useQuery } from "@tanstack/react-query";
import { getFeeBasisPoints } from "fast-bridge/actions";
import type { PoolToken } from "types/poolToken";
import { createPublicClient, http } from "viem";
import { hemi } from "viem/chains";

export const useEstimatePoolFees = (pool: PoolToken) =>
  useQuery({
    async queryFn() {
      const publicClient = createPublicClient({
        chain: hemi,
        transport: http(),
      });

      return getFeeBasisPoints(publicClient, { poolAddress: pool.poolAddress });
    },
    queryKey: ["estimate-pool-fees", pool.poolAddress],
  });
