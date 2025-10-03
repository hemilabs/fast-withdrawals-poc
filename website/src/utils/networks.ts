import { hemi, mainnet, type Chain } from "viem/chains";

export const networks = [hemi, mainnet];

export const getChainById = (chainId: Chain["id"]) =>
  networks.find((n) => n.id === chainId) as Chain;
