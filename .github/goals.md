# Fast Withdrawals PoC - Project Goals

## Overview

Build a proof of concept that enables fast withdrawals from Hemi (L2) to Ethereum using LayerZero infrastructure, replacing the slow 3-transaction Optimism withdrawal flow with a faster 2-3 minute cross-chain solution.

## Current Problem

- **Slow withdrawals**: Current Optimism withdrawal flow requires 3 transactions (1 on Hemi + 2 on Ethereum)
- **Poor UX**: Painfully slow process for users wanting to withdraw from Hemi to Ethereum
- **Need for speed**: Users need faster liquidity access

## Solution Architecture

### Core Components

1. **LayerZero OApp Standard**: Use Omnichain App (OApp) for cross-chain messaging
2. **Dual Chain Deployment**: Deploy contracts on both Ethereum and Hemi
3. **Liquidity Pools**: Lock liquidity in both chains for supported tokens
4. **Cross-Chain Messaging**: Lock tokens on source chain, release on target chain

### Contract Architecture

- **Factory Contracts**: One per chain to deploy OApp instances for new tokens
- **OApp Contracts**: Handle token locking/unlocking and cross-chain messaging
- **Bidirectional Support**: Enable transfers both ways (Hemi ↔ Ethereum)
- **ERC20 Focus**: Support fungible tokens only (no NFTs)

## Technical Stack

- **Solidity**: Smart contract development
- **LayerZero**: Cross-chain infrastructure
- **Anvil + Forge**: Local development and deployment
- **TypeScript**: Deployment and utility scripts

## Target Chains

- **Ethereum**: Mainnet destination chain
- **Hemi**: L2 source chain (EVM compatible, similar to Optimism)

## Token Support

- **ERC20 Tokens**: Fungible tokens only
- **Multi-Token**: Factory pattern to support multiple tokens
- **Extensible**: Easy to add new tokens via factory deployment

## Initial Scope

- **Primary Use Case**: Withdrawals from Hemi to Ethereum
- **Liquidity Provision**: Initially focus on Hemi → Ethereum liquidity
- **Fast Execution**: Target 2-3 minute transaction completion

## Success Criteria

1. Deploy working factory contracts on both chains
2. Successfully deploy OApp contracts for test tokens
3. Demonstrate fast cross-chain token transfers
4. Achieve 2-3 minute transaction times
5. Secure liquidity management across chains

## Development Phases

1. **Phase 1**: Core contract development (Factory + OApp)
2. **Phase 2**: LayerZero integration and cross-chain messaging
3. **Phase 3**: Local testing with Anvil/Forge
4. **Phase 4**: Deployment scripts and utilities
5. **Phase 5**: Integration testing and optimization
