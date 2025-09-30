# Copilot Instructions

## Project Context

This repository contains a proof of concept for fast withdrawals using LayerZero OApp standard to enable quick cross-chain transfers between Hemi (L2) and Ethereum.

## Key Project Information

- **Main Goal**: Replace slow Optimism withdrawal flow with fast LayerZero-based solution
- **Target Time**: 2-3 minute transactions instead of current slow process
- **Architecture**: Factory contracts deploying OApp instances for cross-chain token transfers
- **Chains**: Ethereum and Hemi (EVM compatible L2)
- **Tokens**: ERC20 fungible tokens only

## Important Files

- [Project Goals](./goals.md) - Comprehensive project overview and requirements
- Main contract development in `/contracts` directory
- Website/frontend in `/website` directory

## Technical Stack

- **Solidity**: Smart contract development
- **LayerZero**: Cross-chain infrastructure and OApp standard
- **Anvil + Forge**: Local development and testing
- **TypeScript**: Deployment and utility scripts

## Development Focus

1. Factory contracts for both chains
2. OApp contracts for token locking/unlocking
3. Cross-chain messaging implementation
4. Deployment scripts and testing utilities

Always refer to the Project Goals document for detailed requirements and architecture decisions.
