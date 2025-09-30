import type { Address, Chain } from "viem";
import { mainnet, hemi } from "viem/chains";

export const poolFactoryAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct PoolFactoryConstructorParams",
        components: [
          {
            name: "dstEid",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "endpoint",
            type: "address",
            internalType: "address",
          },
          {
            name: "sendLib",
            type: "address",
            internalType: "address",
          },
          {
            name: "receiveLib",
            type: "address",
            internalType: "address",
          },
          {
            name: "dvnAddresses",
            type: "address[]",
            internalType: "address[]",
          },
          {
            name: "executorAddress",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allPools",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createPool",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "treasury",
        type: "address",
        internalType: "address",
      },
      {
        name: "feeBasisPoints",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "poolAddress",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dstEid",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "endpoint",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPool",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoolByIndex",
    inputs: [
      {
        name: "index",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoolsCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenPools",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "pool",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "treasury",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "feeBasisPoints",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
      {
        name: "poolIndex",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "InvalidEndpointAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidLibraryAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "PoolAlreadyExists",
    inputs: [],
  },
] as const;

export const getPoolFactoryAddress = function (chainId: number) {
  // Contract addresses by chain ID
  const addresses: Record<Chain["id"], Address> = {
    [mainnet.id]: "0xc5766faf6f0d2aed5c4e6e7a4a11fb26b92e0bec",
    [hemi.id]: "0xe91d925ec1275cac3bc0072549a0c298733a7797",
  } as const;
  const address = addresses[chainId];
  if (!address) {
    throw new Error(`PoolFactory contract not available for chain ${chainId}`);
  }
  return address;
};
