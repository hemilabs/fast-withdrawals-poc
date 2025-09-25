import type { Address } from "viem";
import type { Token } from "./token";

export type PoolToken = {
  poolAddress: Address;
  token: Token;
};
