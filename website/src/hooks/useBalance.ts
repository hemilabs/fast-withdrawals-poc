import { type Token } from "types/token";
import { type Address, erc20Abi, isAddress } from "viem";
import {
  useAccount,
  useBalance as useWagmiBalance,
  useReadContract,
} from "wagmi";

export const useNativeTokenBalance = function (
  chainId: Token["chainId"],
  enabled: boolean = true,
) {
  const { address, isConnected } = useAccount();
  return useWagmiBalance({
    address,
    chainId,
    query: {
      enabled: isConnected && enabled,
    },
  });
};

export const useTokenBalance = ({
  address,
  chainId,
  tokenAddress,
}: {
  address: Address | undefined;
  chainId: Token["chainId"];
  tokenAddress: string;
}) =>
  useReadContract({
    abi: erc20Abi,
    address: tokenAddress as Address,
    // @ts-expect-error if address is not defined, the query is disabled
    args: [address],
    chainId,
    functionName: "balanceOf",
    query: {
      enabled: !!address && isAddress(address) && isAddress(tokenAddress),
    },
  });

export const useAccountTokenBalance = ({
  chainId,
  tokenAddress,
}: {
  chainId: Token["chainId"];
  tokenAddress: string;
}) =>
  useTokenBalance({
    address: useAccount().address,
    chainId,
    tokenAddress,
  });
