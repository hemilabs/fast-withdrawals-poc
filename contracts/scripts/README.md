# PoolFactory Deployment Script

This script deploys the PoolFactory contract to various chains using viem and TypeScript.

## Prerequisites

1. **Environment Setup**: Copy `.env.example` to `.env` and configure your settings:

```sh
cp .env.example .env
# Edit .env and set CHAIN, MNEMONIC, and optionally RPC_URL and ACCOUNT_INDEX
```

## Usage

### Basic Deployment

Set your environment variables in `.env`:

```sh
CHAIN="hemi"
MNEMONIC="your twelve word mnemonic phrase goes here"
```

Then deploy:

```sh
npm run deploy:factory
```

### Available Chains

- `mainnet` - Ethereum Mainnet
- `hemi` - Hemi Network

### Configuration Options

**Required Environment Variables:**

- `CHAIN` - Target chain for deployment (mainnet, hemi)
- `MNEMONIC` - 12-word mnemonic phrase for wallet derivation

**Optional Environment Variables:**

- `RPC_URL` - Custom RPC URL (defaults to chain's default RPC)
- `ACCOUNT_INDEX` - Account index from mnemonic (defaults to 0)

### Example Configurations

**Deploy to Hemi with default settings:**

```sh
CHAIN="hemi"
MNEMONIC="your mnemonic here"
```

**Deploy to Mainnet with custom RPC:**

```sh
CHAIN="mainnet"
MNEMONIC="your mnemonic here"
# A local fork for testing could be used here
RPC_URL="https://eth-mainnet.alchemyapi.io/v2/your-api-key"
```

**Deploy with specific account index:**

```sh
CHAIN="hemi"
MNEMONIC="your mnemonic here"
ACCOUNT_INDEX=1
npm run deploy
```

## Output

After successful deployment, the script will:

1. **Console Output**: Display deployment details including contract address, transaction hash, and gas used
2. **Deployment File**: Save deployment information to `deployments/deployment-{chain}-{timestamp}.json`

Example deployment file:

```json
{
  "chain": "mainnet",
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "transactionHash": "0xabc123...",
  "blockNumber": "12345678",
  "gasUsed": "500000",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "endpointUsed": "0x6EDCE65403992e310A62460808c4b910D972f10f"
}
```
