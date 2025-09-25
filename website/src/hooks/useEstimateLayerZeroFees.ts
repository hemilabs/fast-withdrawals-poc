import { useQuery } from "@tanstack/react-query";
import { quoteSend } from "fast-bridge/actions";
import { type Token } from "types/token";
import { type PublicClient } from "viem";
import { useAccount, usePublicClient } from "wagmi";

export const useEstimateLayerZeroFees = function ({
  amount,
  token,
}: {
  amount: bigint;
  token: Token;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: token.chainId });

  return useQuery({
    enabled: !!address && !!publicClient,
    queryFn: () =>
      quoteSend(publicClient as PublicClient, {
        amount,
        chainId: token.chainId,
        toAddress: address!,
        tokenAddress: token.address,
      }),
    queryKey: [
      "estimate-bridge-fees",
      address,
      amount.toString(),
      token.chainId,
      token.address,
    ],
    // every 12 seconds
    refetchInterval: 12 * 1000,
  });
};
