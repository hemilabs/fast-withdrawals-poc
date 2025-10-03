import { Column } from "components/table/column";
import { ColumnHeader } from "components/table/columnHeader";
import { usePoolBalance } from "hooks/usePoolBalance";
import { usePoolTokens } from "hooks/usePoolTokens";
import { hemi, mainnet } from "viem/chains";

import { Spinner } from "./spinner";
import { formatUnits, type Chain } from "viem";
import { formatEvmAddress } from "utils/format";
import type { PoolToken } from "types/poolToken";
import { getTargetChainId } from "fast-bridge";
import { getChainById } from "utils/networks";
import Skeleton from "react-loading-skeleton";

const PoolBalance = function ({ pool }: { pool: PoolToken }) {
  const { data: balance, isError } = usePoolBalance(pool);

  function getBalance() {
    if (isError) {
      return "-";
    }
    if (balance === undefined) {
      return <Skeleton className="" />;
    }
    return `${formatUnits(balance, pool.token.decimals)} ${pool.token.symbol}`;
  }

  return <span>Balance: {getBalance()}</span>;
};

const Pool = ({ chain, pool }: { chain: Chain; pool: PoolToken }) => (
  <span className="flex items-center gap-x-1">
    <span>Pool on {chain.name}:</span>
    <a
      className="text-orange-500 hover:text-orange-700"
      href={`${chain.blockExplorers?.default.url}/address/${pool.poolAddress}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      {formatEvmAddress(pool.poolAddress)}
    </a>
  </span>
);

export const Pools = function () {
  const { data: hemiPools } = usePoolTokens(hemi);
  const { data: mainnetPools } = usePoolTokens(mainnet);

  if (hemiPools === undefined || mainnetPools === undefined) {
    return (
      <p className="flex items-center gap-x-1">
        <span>Loading...</span>
        <Spinner color="#ff6a00" size="small" />
      </p>
    );
  }

  const getPoolOnTargetChain = function (pool: PoolToken) {
    const targetChainId = getTargetChainId(pool.token.chainId);
    const counterPartAddress =
      pool.token.extensions?.bridgeInfo?.[targetChainId].tokenAddress;
    if (!counterPartAddress) {
      return;
    }
    return mainnetPools.find((p) => p.token.address === counterPartAddress);
  };

  return (
    <section className="px-40 pt-10 flex-col flex gap-y-4">
      <h1 className="text-center text-2xl">Pools</h1>
      <div className="bg-white p-2 rounded-2xl border-neutral-300/55 shadow-sm">
        <table className="w-full border-separate border-spacing-0 whitespace-nowrap">
          <thead>
            <tr>
              <ColumnHeader>Pool Token</ColumnHeader>
              <ColumnHeader>Addresses</ColumnHeader>
              <ColumnHeader>Balances</ColumnHeader>
            </tr>
          </thead>
          <tbody>
            {hemiPools.map(function (pool) {
              const chain = getChainById(pool.token.chainId)!;

              const targetPool = getPoolOnTargetChain(pool);
              const targetChain = getChainById(
                getTargetChainId(pool.token.chainId),
              );

              return (
                <tr key={pool.poolAddress}>
                  <Column>
                    <span className="h-full text-center block">
                      {pool.token.symbol}
                    </span>
                  </Column>
                  <Column>
                    <div className="flex flex-col gap-y-4">
                      <Pool chain={chain} pool={pool} />
                      {targetPool && targetChain && (
                        <Pool chain={targetChain} pool={targetPool} />
                      )}
                    </div>
                  </Column>
                  <Column>
                    <div className="flex flex-col gap-y-4">
                      <PoolBalance pool={pool} />
                      {targetPool && <PoolBalance pool={targetPool} />}
                    </div>
                  </Column>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
