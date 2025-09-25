import { Chain } from "viem";
import { hemi, mainnet } from "viem/chains";

export const getTargetChainId = function (sourceChainId: Chain["id"]) {
  const chainMaps: Record<Chain["id"], Chain["id"]> = {
    [mainnet.id]: hemi.id,
    [hemi.id]: mainnet.id,
  };
  const targetChainId = chainMaps[sourceChainId];
  if (targetChainId === undefined) {
    throw new Error(`Unsupported source chain ID: ${sourceChainId}`);
  }
  return targetChainId;
};
