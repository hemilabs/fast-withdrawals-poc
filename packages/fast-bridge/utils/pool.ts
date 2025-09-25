import type { Address } from "viem";

export const prepareSendParams = ({
  amount,
  dstEid,
  toAddress,
}: {
  amount: bigint;
  dstEid: number;
  toAddress: Address;
}) => ({
  amountLD: amount,
  composeMsg: "0x" as const,
  dstEid,
  extraOptions: "0x" as const,
  // For now, no slippage tolerance
  minAmountLD: amount,
  oftCmd: "0x" as const,
  // Convert to bytes32
  to: `0x${toAddress.slice(2).padStart(64, "0")}` as const,
});
