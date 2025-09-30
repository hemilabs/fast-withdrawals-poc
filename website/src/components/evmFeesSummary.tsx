import { useEstimateLayerZeroFees } from "hooks/useEstimateLayerZeroFees";
import Skeleton from "react-loading-skeleton";
import { type Token } from "types/token";
import { networks } from "utils/networks";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { DisplayAmount } from "./displayAmount";
import type { PoolToken } from "types/poolToken";
import { useEstimatePoolFees } from "hooks/useEstimatePoolFees";

export const EvmFeesSummary = function ({
  amount,
  pool,
}: {
  amount: bigint;
  pool: PoolToken;
}) {
  const { token } = pool;
  const { address } = useAccount();
  const { data: layerZeroFees, isError: isLayerZeroError } =
    useEstimateLayerZeroFees({
      amount,
      pool,
    });
  const { data: poolFees, isError: isPoolFeeError } = useEstimatePoolFees(pool);

  const chain = networks.find((network) => network.id === token.chainId)!;

  const calculatePoolFee = (feeBasisPoints: number) =>
    (amount * BigInt(feeBasisPoints)) / BigInt(10_000);

  const renderAmount = function ({
    fee,
    decimals,
    isError,
    symbol,
  }: {
    fee: bigint | undefined;
    decimals: number;
    isError: boolean;
    symbol: string;
  }) {
    if (!address || isError) {
      return <span>-</span>;
    }
    if (fee === undefined) {
      return <Skeleton className="w-12" />;
    }

    return (
      <div className="text-neutral-950">
        <DisplayAmount
          amount={formatUnits(fee, decimals)}
          showTokenLogo={false}
          token={
            // hacky!
            {
              decimals: decimals,
              symbol: symbol,
            } as Token
          }
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-y-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-neutral-500">Layer Zero Fees</span>
        {renderAmount({
          fee: layerZeroFees?.nativeFee,
          decimals: chain.nativeCurrency.decimals,
          isError: isLayerZeroError,
          symbol: chain.nativeCurrency.symbol,
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-neutral-500">Pool Fees</span>
        {renderAmount({
          fee: poolFees !== undefined ? calculatePoolFee(poolFees) : undefined,
          decimals: token.decimals,
          isError: isPoolFeeError,
          symbol: token.symbol,
        })}
      </div>
    </div>
  );
};
