# fast-withdrawals-poc

Proof of concept for enabling fast withdrawals from Hemi to Ethereum using LayerZero

## Setup

1. **Install Foundry** (includes Anvil for local blockchain forking):

```sh
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Install dependencies**:

```sh
# node dependencies
npm install
# solidity dependencies
cd contracts && forge install
```

## 📁 Directory Structure

```
│── contracts/ # Contains the necessary Smart Contracts
│
│── packages/ # Contains a TS package that integrates the UI with the published contracts
│
│── website/ # Contains a simple UI to use the Fast Bridge PoC
```
