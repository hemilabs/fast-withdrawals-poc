import { shorten } from "crypto-shortener";
import { smartRound } from "smart-round";
import type { Address, Hash } from "viem";

const cryptoRounder = smartRound(6, 0, 6);
const fiatRounder = smartRound(6, 2, 2);

export const formatNumber = (value: number | string) =>
  cryptoRounder(value, { roundingMode: "round-down", shouldFormat: true });

export const formatFiatNumber = (value: number | string) =>
  fiatRounder(value, { shouldFormat: true });

export const formatTxHash = (hash: Hash) =>
  shorten(hash, { length: 4, prefixes: ["0x"] });

// Same implementation as formatTxHash, but it reads better
export const formatEvmAddress = (address: Address) => formatTxHash(address);
