import { useQuery } from "@tanstack/react-query";
import { getPoolFactoryAddress } from "fast-bridge";
import { getAllPools, getPoolToken } from "fast-bridge/actions";
import type { PoolToken } from "types/poolToken";
import type { Token } from "types/token";
import { tokenList } from "utils/tokens";
import {
  createPublicClient,
  http,
  isAddress,
  isAddressEqual,
  type Chain,
} from "viem";

export const usePoolTokens = function (chain: Chain) {
  return useQuery({
    async queryFn() {
      const poolFactoryAddress = getPoolFactoryAddress(chain.id);
      const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
      });

      const allPools = await getAllPools(publicClient, { poolFactoryAddress });
      return Promise.all(
        allPools.map((pool) =>
          getPoolToken(publicClient, { poolAddress: pool }).then(
            (tokenAddress) =>
              ({
                poolAddress: pool,
                token: tokenList.find(
                  (t) =>
                    isAddress(t.address) &&
                    isAddressEqual(t.address, tokenAddress),
                )! as Token,
              }) as PoolToken,
          ),
        ),
      );
    },
    queryKey: ["bridgable-tokens", chain.id],
  });
};
