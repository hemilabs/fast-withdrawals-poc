import type { Address } from "viem";

export const prepareSendParams = ({
  amount,
  dstEid,
  feeBasisPoints,
  toAddress,
}: {
  amount: bigint;
  dstEid: number;
  feeBasisPoints: number;
  toAddress: Address;
}) => ({
  amountLD: amount,
  composeMsg: "0x" as const,
  dstEid,
  extraOptions: "0x" as const,
  minAmountLD:
    feeBasisPoints === 0
      ? amount
      : (amount * BigInt(10000 - feeBasisPoints)) / BigInt(10000),
  oftCmd: "0x" as const,
  // Convert to bytes32
  to: `0x${toAddress.slice(2).padStart(64, "0")}` as const,
});
