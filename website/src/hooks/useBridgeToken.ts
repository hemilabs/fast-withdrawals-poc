import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bridgeToken } from "fast-bridge/actions";
import EventEmitter from "events";
import { type BridgeEvents } from "fast-bridge";
import { type Token } from "types/token";
import { type WalletClient } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import { useNativeTokenBalance, useAccountTokenBalance } from "./useBalance";
import { useUpdateNativeBalanceAfterReceipt } from "./useInvalidateNativeBalanceAfterReceipt";

export const useBridgeToken = function ({
  fromToken,
  on,
}: {
  fromToken: Token;
  on: (emitter: EventEmitter<BridgeEvents>) => void;
}) {
  const { address } = useAccount();
  const { queryKey: nativeTokenBalanceQueryKey } = useNativeTokenBalance(
    fromToken.chainId,
  );
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();

  // source chain
  const { queryKey: tokenBalanceQueryKey } = useAccountTokenBalance({
    chainId: fromToken.chainId,
    tokenAddress: fromToken.address,
  });

  const updateNativeBalanceAfterFees = useUpdateNativeBalanceAfterReceipt(
    fromToken.chainId,
  );

  return useMutation({
    async mutationFn({ amount }: { amount: bigint }) {
      const { emitter, promise } = bridgeToken({
        amount,
        fromAddress: address!,
        toAddress: address!,
        tokenAddress: fromToken.address,
        walletClient: walletClient as WalletClient,
      });

      emitter.on("token-approval-reverted", function (receipt) {
        updateNativeBalanceAfterFees(receipt);
      });
      emitter.on("token-approval-succeeded", function (receipt) {
        updateNativeBalanceAfterFees(receipt);
      });

      emitter.on("bridge-transaction-succeeded", function (receipt) {
        updateNativeBalanceAfterFees(receipt);
      });

      emitter.on("bridge-transaction-reverted", function (receipt) {
        updateNativeBalanceAfterFees(receipt);
      });

      on(emitter);

      return promise;
    },
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: tokenBalanceQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: nativeTokenBalanceQueryKey,
      });
    },
  });
};
