import { useQuery } from "@tanstack/react-query";
import { getLiquidityAvailable } from "fast-bridge/actions";
import type { PoolToken } from "types/poolToken";
import { createPublicClient, http } from "viem";
import { hemi } from "viem/chains";

export const useLiquidityAvailable = (pool: PoolToken) =>
  useQuery({
    async queryFn() {
      const publicClient = createPublicClient({
        chain: hemi,
        transport: http(),
      });

      return getLiquidityAvailable(publicClient, {
        poolAddress: pool.poolAddress,
      });
    },
    queryKey: ["liquidityAvailable", pool.poolAddress],
  });
