import { getTargetChainId } from "fast-bridge";
import type { PoolToken } from "types/poolToken";
import { type Token } from "types/token";
import { parseUnits as viemParseUnits } from "viem";

export const getTokenPrice = function (
  token: Token,
  prices: Record<string, string> | undefined,
) {
  const priceSymbol = (
    token.extensions?.priceSymbol ?? token.symbol
  ).toUpperCase();
  const price = prices?.[priceSymbol] ?? "0";
  return price;
};

/**
 * Parses a token amount string into its raw representation in the smallest unit (e.g., wei for ETH)
 * truncating any excess decimal places beyond the token's defined decimals.
 * @param amount - The token amount as a string.
 * @param token - The token metadata, including its decimals.
 * @returns The parsed token amount in the smallest unit.
 */
export const parseTokenUnits = function (amount: string, token: Token) {
  const [whole, fraction] = amount.split(".");
  const truncatedFraction = fraction?.slice(0, token.decimals);
  const normalizedAmount = truncatedFraction
    ? `${whole}.${truncatedFraction}`
    : whole;
  return viemParseUnits(normalizedAmount, token.decimals);
};

export const getToken = function (pool: PoolToken): [Token, Token] {
  const targetChainId = getTargetChainId(pool.token.chainId);
  const fromToken = pool.token;
  // to build the "toToken", just use the bridgeInfo
  const toToken: Token = {
    ...fromToken,
    address: fromToken.extensions!.bridgeInfo[targetChainId].tokenAddress,
    chainId: targetChainId,
  };
  return [fromToken, toToken];
};
