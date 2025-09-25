import { type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";

import { poolFactoryAbi } from "../../contracts/poolFactory";

export const getAllPools = async function (
  publicClient: PublicClient,
  params: { poolFactoryAddress: Address },
) {
  const { poolFactoryAddress } = params;
  return readContract(publicClient, {
    abi: poolFactoryAbi,
    address: poolFactoryAddress,
    functionName: "getAllPools",
  });
};

export const getDstEid = async function (
  publicClient: PublicClient,
  params: { poolFactoryAddress: Address },
) {
  const { poolFactoryAddress } = params;
  return readContract(publicClient, {
    abi: poolFactoryAbi,
    address: poolFactoryAddress,
    functionName: "dstEid",
  });
};

export const getPoolAddress = async function (
  publicClient: PublicClient,
  params: { poolFactoryAddress: Address; tokenAddress: Address },
) {
  const { poolFactoryAddress, tokenAddress } = params;
  return readContract(publicClient, {
    abi: poolFactoryAbi,
    address: poolFactoryAddress,
    functionName: "getPool",
    args: [tokenAddress],
  });
};
