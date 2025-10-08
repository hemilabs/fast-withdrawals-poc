# Fast Withdrawals Contracts

This directory contains the smart contracts for the Fast Withdrawals proof of concept, enabling quick cross-chain transfers between Hemi (L2) and Ethereum using LayerZero OApp standard.

## 🚀 Getting Started

### Prerequisites

Follow the steps in the README from the [root](../README.md).

## 🔨 Development Commands

### Compilation

```sh
# Compile all contracts
forge build
```

### Testing

```sh
# Run all tests
forge test
```

## 📋 Getting Contract ABIs

### Method 1: Using Forge (Recommended)

```sh
# Get ABI for Pool contract
forge inspect Pool abi

# Save ABI to file
forge inspect Pool abi > Pool_ABI.json
```

## 🏗️ Contract Architecture

### Pool Contract

- **Purpose**: Manages liquidity for a specific ERC20 token

### PoolFactory Contract

- **Purpose**: Deploys new Pool contracts for different tokens

## 🔧 Deployment steps

### Environment Setup

1. Copy the environment template:

```sh
cp .env.example .env
```

2. Deploy the Pool Factory:

Configure your settings in `.env`:

```sh
# Deployment Configuration
ACCOUNT_INDEX=0                        # Account index (optional)
CHAIN="hemi"                           # Target chain (mainnet, hemi)
FEE_BASIS_POINTS=100                   # Fee in basis points (10000 = 100%)
MNEMONIC="your twelve word mnemonic"   # Wallet mnemonic
RPC_URL="https://..."                  # Custom RPC URL (optional)
TREASURY_ADDRESS="0x..."               # Address that can withdraw collected fees
```

With those, running `npm run deploy:factory` will deploy the Factory contract to the defined chain. The factory needs to be deployed on each chain

3. Create Pools

Add the following env variables:

```sh
FACTORY_ADDRESS="0x..."                # Address of the Factory above published
TOKEN_ADDRESS="0x..."                  # ERC20 token address
```

By running `npm run deploy:pool`, you will create a transaction that publishes a pool for the given token. A pool per token needs to be published on each chain.

4. Associate Pools

### Supported Chains

Add the following env variables:

```sh
PEER_ADDRESS="0x..."                   # Pool address of the remote chain. If associating in the Hemi Pool, it will contain the Ethereum Pool address.
```

By running `npm run pool:configure-peer`, you will associate the pool with its counterpart. Each pool needs to be associated with the other one.

That makes it a total of:

- 2 transactions (one in each chain) to create a PoolFactory
- 4 transactions to setup the flow for a given token (2 pool deployments in each chain, and 2 txs making the association in each one)

- **Ethereum Mainnet**: Primary destination
- **Hemi Network**: L2 source chain

### Assumptions

Some assumptions were made as part of developing this Proof of Concept:

- The goal is to enable fast withdrawals, not earn money.
- Liquidity may be provided by us (Hemi). Because of this, a simple way to withdraw the tokens was set, as it's assumed that all whitelisted address belong to us.

### Feature list

- Track a list of pools through the PoolFactory
- Pool ownership for the pool creator.
- Fee support, as well as configuring an address to collect fees
- Withdraw tokens from Hemi to Ethereum
- Whitelist users to withdraw liquidity
- While the contract allows to add liquidity through it, technically anyone can send tokens to the contract address and it will be liquidity available.

### Wishlist

- Make all contracts upgradeable
- Verify the flow from Ethereum > Hemi works (Not tested)
- Enable users to add Liquidity, which they can later withdraw, and earn fees given how much they've contributed. Add control to who can withdraw and how much, depending on what they've provided.
