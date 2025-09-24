# Fast Withdrawals Contracts

This directory contains the smart contracts for the Fast Withdrawals proof of concept, enabling quick cross-chain transfers between Hemi (L2) and Ethereum using LayerZero OApp standard.

## 📁 Directory Structure

```
contracts/
├── src/                     # Smart contract source files
│   ├── Pool.sol            # Individual token pool contract (OApp)
│   └── PoolFactory.sol     # Factory contract for deploying pools
├── test/                   # Test files
│   ├── Pool.t.sol          # Pool contract tests
│   ├── PoolFactory.t.sol   # PoolFactory contract tests
│   └── mocks/              # Mock contracts for testing
├── scripts/                # Deployment and utility scripts
│   ├── deploy-factory.ts   # PoolFactory deployment script
│   └── README.md           # Deployment documentation
├── out/                    # Compiled contract artifacts (auto-generated)
└── lib/                    # External dependencies
```

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

```bash
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

## 🔧 Configuration

### Environment Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Configure your settings in `.env`:

```bash
# Deployment Configuration
CHAIN="hemi"                           # Target chain (mainnet, hemi)
MNEMONIC="your twelve word mnemonic"   # Wallet mnemonic
ACCOUNT_INDEX=0                        # Account index (optional)
RPC_URL="https://..."                  # Custom RPC URL (optional)
```

### Supported Chains

- **Ethereum Mainnet**: Primary destination
- **Hemi Network**: L2 source chain

## 🚀 Deployment

### Deploy PoolFactory

```bash
cd scripts/
npm run deploy:factory
```
