# SilentBridge Smart Contracts

Privacy-preserving cross-chain bridge smart contracts with Fully Homomorphic Encryption (FHE) integration support.

## Overview

SilentBridge is a cross-chain bridge that enables private routing preferences using FHE encryption. Users can specify routing preferences (Fastest/Cheapest) without revealing them on-chain, maintaining privacy while enabling efficient cross-chain transfers.

## Features

- **Privacy-Preserving Routing**: Encrypted routing preferences using FHE
- **Multi-Chain Support**: Deployable on any EVM-compatible chain
- **Native ETH & ERC20 Support**: Bridge both native tokens and ERC20 tokens
- **Executor-Based Withdrawals**: Trusted executor model for cross-chain execution
- **Pausable**: Emergency pause functionality for security
- **Reentrancy Protection**: Secure against reentrancy attacks
- **Minimum Deposit Limits**: Protection against dust attacks

## Contract Architecture

### Core Contracts

- **SilentBridge.sol**: Main bridge contract handling deposits and withdrawals
- **ISilentBridge.sol**: Interface for the bridge contract
- **IFHERelayer.sol**: Interface for FHE relayer integration (Zama FHE)

### Mock Contracts

- **MockERC20.sol**: ERC20 token for testing purposes

## Installation

```bash
cd contracts
npm install
```

## Compilation

```bash
npm run compile
```

## Testing

```bash
npm test
```

## Deployment

### Prerequisites

1. Create a `.env` file in the `contracts` directory:
```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ZAMA_RPC_URL=https://devnet.zama.ai
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deploy to Network

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Deploy to Zama Devnet
npx hardhat run scripts/deploy.ts --network zamaDevnet

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

## Contract Functions

### Deposit

Deposit tokens for cross-chain bridging:

```solidity
function deposit(
    address token,           // Token address (address(0) for native ETH)
    uint256 amount,          // Amount to deposit
    uint256 targetChainId,   // Target chain ID
    bytes calldata encryptedRoutingIntent  // Encrypted FHE routing preference
) external payable returns (bytes32 depositId);
```

### Withdraw

Execute withdrawal on target chain (executor only):

```solidity
function withdraw(
    bytes32 depositId,      // Original deposit identifier
    address user,           // Address to receive withdrawal
    address token,          // Token address
    uint256 amount,         // Amount to withdraw
    uint256 sourceChainId,  // Source chain ID
    bytes calldata proof    // Proof of deposit
) external;
```

### Update Routing Intent

Update encrypted routing intent for a deposit:

```solidity
function updateRoutingIntent(
    bytes32 depositId,
    bytes calldata encryptedRoutingIntent
) external;
```

## Supported Networks

- **Sepolia** (Chain ID: 11155111)
- **Zama Devnet** (Chain ID: 8009)
- **Base Sepolia** (Chain ID: 84532)
- **Polygon Amoy** (Chain ID: 80002)
- **Arbitrum Sepolia** (Chain ID: 421614)
- **Optimism Sepolia** (Chain ID: 11155420)
- **Berachain Artio** (Chain ID: 80085)
- **Blast Sepolia** (Chain ID: 168587773)
- **Linea Sepolia** (Chain ID: 59141)
- **Scroll Sepolia** (Chain ID: 534351)

## Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Access control for critical functions
- **Minimum Deposit**: Protection against dust attacks
- **Deposit ID Uniqueness**: Prevents deposit ID collisions
- **Replay Protection**: Prevents double withdrawals

## Access Control

- **Owner**: Can add/remove executors, pause contract, update settings
- **Executor**: Can execute withdrawals on target chains
- **Users**: Can deposit tokens and update their routing intents

## Events

- `Deposit`: Emitted when a deposit is made
- `Withdrawal`: Emitted when a withdrawal is executed
- `RoutingIntentUpdated`: Emitted when routing intent is updated
- `ExecutorAdded`: Emitted when an executor is added
- `ExecutorRemoved`: Emitted when an executor is removed

## Development

### Local Development

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy.ts --network hardhat
```

### Verify Contracts

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## License

MIT

## Links

- **Repository**: [https://github.com/Forgingalex/silentbridge](https://github.com/Forgingalex/silentbridge)
- **Zama FHE**: [https://zama.ai](https://zama.ai)

