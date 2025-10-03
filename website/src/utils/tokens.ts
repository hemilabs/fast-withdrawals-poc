import { tokens } from "@hemilabs/token-list";
import type { Token } from "types/token";
import type { Address } from "viem";
import { hemi } from "viem/chains";

const getRemoteTokens = function (token: Token) {
  if (!token.extensions?.bridgeInfo) {
    return [] satisfies Token[];
  }
  return Object.keys(token.extensions!.bridgeInfo!).map((l1ChainId) => ({
    ...token,
    address: token.extensions!.bridgeInfo![l1ChainId].tokenAddress!,
    chainId: Number(l1ChainId),
    extensions: {
      bridgeInfo: {
        [token.chainId]: {
          tokenAddress: token.address as Address,
        },
      },
      l1LogoURI: token.extensions!.l1LogoURI,
    },
    logoURI: token.extensions!.l1LogoURI,
    name: token.name
      // Remove the ".e" suffix
      .replace(".e", "")
      .trim(),
    symbol: token.symbol
      // Remove the ".e" suffix
      .replace(".e", "")
      .trim(),
  })) satisfies Token[];
};

const hemiTokens = tokens.filter((t) => t.chainId === hemi.id) as Token[];

export const tokenList = hemiTokens.concat(
  hemiTokens.flatMap((t) => getRemoteTokens(t)),
);
