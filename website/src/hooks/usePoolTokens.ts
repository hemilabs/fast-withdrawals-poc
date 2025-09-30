import tokenList from "@hemilabs/token-list";
import { useQuery } from "@tanstack/react-query";
import { getPoolFactoryAddress } from "fast-bridge";
import { getAllPools, getPoolToken } from "fast-bridge/actions";
import type { PoolToken } from "types/poolToken";
import type { Token } from "types/token";
import { createPublicClient, http, isAddress, isAddressEqual } from "viem";
import { hemi } from "viem/chains";

export const usePoolTokens = function () {
  return useQuery({
    async queryFn() {
      const poolFactoryAddress = getPoolFactoryAddress(hemi.id);
      const publicClient = createPublicClient({
        chain: hemi,
        transport: http(),
      });

      const allPools = await getAllPools(publicClient, { poolFactoryAddress });
      return Promise.all(
        allPools.map((pool) =>
          getPoolToken(publicClient, { poolAddress: pool }).then(
            (tokenAddress) =>
              ({
                poolAddress: pool,
                // @ts-expect-error it infers tokenAddress as string, but it's Address
                token: tokenList.tokens.find(
                  (t) =>
                    isAddress(t.address) &&
                    isAddressEqual(t.address, tokenAddress),
                )! as Token,
              }) as PoolToken,
          ),
        ),
      );
    },
    queryKey: ["bridgable-tokens"],
  });
};
