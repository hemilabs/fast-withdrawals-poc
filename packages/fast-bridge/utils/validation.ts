import { isAddress, zeroAddress } from "viem";
import { hemi, mainnet } from "viem/chains";

import { type BridgeParams } from "../types/bridge";

// Validation result type
type ValidationResult = { isValid: true } | { isValid: false; reason: string };

// Validate if address is valid and not zero
const validateAddress = function (address: unknown): ValidationResult {
  if (typeof address !== "string" || !isAddress(address)) {
    return { isValid: false, reason: "Invalid address format" };
  }

  if (address === zeroAddress) {
    return { isValid: false, reason: "Address cannot be zero address" };
  }

  return { isValid: true };
};

// Validate amount is greater than zero
const validateAmount = function (amount: bigint): ValidationResult {
  if (amount <= BigInt(0)) {
    return { isValid: false, reason: "Amount must be greater than zero" };
  }

  return { isValid: true };
};

// Validate chain ID is supported
const validateChainId = function (
  chainId: number | undefined,
): ValidationResult {
  if (chainId === undefined) {
    return { isValid: false, reason: "Chain ID is required" };
  }
  const supportedChainIds = [hemi.id, mainnet.id] as number[];

  if (!supportedChainIds.includes(chainId)) {
    return {
      isValid: false,
      reason: `Chain ID ${chainId} is not supported.`,
    };
  }

  return { isValid: true };
};

// Validate all bridge parameters
export const validateBridgeParams = function (
  params: BridgeParams,
): ValidationResult {
  const { amount, fromAddress, toAddress, tokenAddress, walletClient } = params;

  // Validate individual parameters
  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    return amountValidation;
  }
  const sourceChainIdValidation = validateChainId(walletClient.chain?.id);
  if (!sourceChainIdValidation.isValid) {
    return sourceChainIdValidation;
  }

  const fromAddressValidation = validateAddress(fromAddress);
  if (!fromAddressValidation.isValid) {
    return {
      isValid: false,
      reason: `From address: ${fromAddressValidation.reason}`,
    };
  }

  const toAddressValidation = validateAddress(toAddress);
  if (!toAddressValidation.isValid) {
    return {
      isValid: false,
      reason: `To address: ${toAddressValidation.reason}`,
    };
  }

  const tokenAddressValidation = validateAddress(tokenAddress);
  if (!tokenAddressValidation.isValid) {
    return {
      isValid: false,
      reason: `Token address: ${tokenAddressValidation.reason}`,
    };
  }

  // TODO validate remote address has enough tokens for bridging?

  return { isValid: true };
};
