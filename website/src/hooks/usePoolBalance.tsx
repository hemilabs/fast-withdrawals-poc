import { useTokenBalance } from "hooks/useBalance";
import type { PoolToken } from "types/poolToken";

export const usePoolBalance = (pool: PoolToken) =>
  useTokenBalance({
    address: pool.poolAddress,
    chainId: pool.token.chainId,
    tokenAddress: pool.token.address,
  });
