import { useQuery } from "@tanstack/react-query";
import { getPoolFactoryAddress } from "fast-bridge";
import { getLiquidityAvailable, getPoolAddress } from "fast-bridge/actions";
import type { PoolToken } from "types/poolToken";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const useLiquidityAvailable = (pool: PoolToken) =>
  useQuery({
    async queryFn() {
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      });

      const poolFactoryAddress = getPoolFactoryAddress(mainnet.id);

      return getPoolAddress(publicClient, {
        tokenAddress:
          pool.token.extensions!.bridgeInfo[mainnet.id].tokenAddress,
        poolFactoryAddress,
      }).then((poolAddress) =>
        getLiquidityAvailable(publicClient, {
          poolAddress,
        }),
      );
    },
    queryKey: ["liquidityAvailable", pool.poolAddress],
  });
