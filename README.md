# Porto Superchain Extension 🌉

An extension of the **Porto Cross-Chain Account Library** that enables seamless multichain interactions across the Superchain ecosystem. This project demonstrates how to expand Porto's capabilities with real-time cross-chain monitoring, L2-to-L2 messaging, and unified account management across multiple chains.

## 🚀 What is Porto?

Porto is a cross-chain account abstraction library that enables users to interact with multiple blockchains through a single account interface. This project **extends Porto** by adding:

- **Real-time cross-chain message monitoring**
- **L2-to-L2 message lifecycle tracking** 
- **Superchain-optimized interactions**
- **Unified cross-chain session management**
- **Batch cross-chain operations**

## 🌐 Superchain Multichain Capabilities

### Enhanced Porto Features

| Original Porto | **Porto Superchain Extension** |
|----------------|--------------------------------|
| Basic cross-chain calls | ✅ **Real-time message monitoring** |
| Simple account management | ✅ **Unified session key management** |
| Limited tracking | ✅ **Full message lifecycle tracking** |
| Single-chain focus | ✅ **Multi-L2 batch operations** |
| No monitoring | ✅ **Live event detection & callbacks** |

### Superchain Integration

```typescript
// Enhanced Porto Provider with Superchain monitoring
const porto = new PortoCrossChainProvider(
  privateKey,
  implementationAddress,
  [chainA, chainB, chainC] // Multiple Superchain L2s
);

// Real-time monitoring across all chains
const monitor = new CrossChainMonitor({
  chains: superchainL2s,
  pollingInterval: 1000,
  messageExpiry: 7 * 24 * 60 * 60
});
```

## 🛠 Architecture

### Porto Superchain Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    Porto Superchain Extension                   │
├─────────────────────────────────────────────────────────────────┤
│  CrossChainMonitor  │  Enhanced Provider  │  Session Manager    │
│  • Real-time polls  │  • Multi-L2 batch   │  • Unified keys     │
│  • Event detection  │  • Message tracking │  • Cross-chain auth │
│  • Status callbacks │  • Relay monitoring │  • Spend limits     │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                         Porto Core Library                      │
├─────────────────────────────────────────────────────────────────┤
│  Account Abstraction │  Cross-Chain Calls  │  Session Keys      │
│  • EIP-7702 delegation │ • Contract execution │ • Key authorization │
│  • Account management  │ • Token bridging     │ • Permission control │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                         Superchain L2s                          │
├───────────────────┬───────────────────┬─────────────────────────┤
│    Base (8453)    │  Optimism (10)    │   Custom L2 (901,902)   │
│ • L2ToL2Messenger │ • L2ToL2Messenger │  • L2ToL2Messenger      │
│ • CrossL2Inbox    │ • CrossL2Inbox    │  • CrossL2Inbox         │
│ • SuperchainERC20 │ • SuperchainERC20 │  • SuperchainERC20      │
└───────────────────┴───────────────────┴─────────────────────────┘
```

## 🌟 Key Enhancements

### 1. Real-Time Cross-Chain Monitoring

```typescript
// Monitor all L2-to-L2 messages in real-time
monitor.startMonitoring((status) => {
  console.log(`Message ${status.messageHash} is ${status.status}`);
  if (status.status === 'relayed') {
    console.log(`✅ Executed on ${status.destinationChain}`);
  }
});
```

### 2. Enhanced Session Key Management

```typescript
// Authorize session keys across multiple L2s simultaneously
await porto.authorizeSessionKey(chainId, {
  key: sessionKey,
  expiry: timestamp,
  canBridge: true,      // Cross-chain token transfers
  canExecute: true,     // Cross-chain contract calls
  spendLimit: parseEther('100')
});
```

### 3. Batch Cross-Chain Operations

```typescript
// Execute operations across multiple L2s in a single call
await porto.executeCrossChainBatch([
  { chainId: 8453, target: baseContract, data: callData1 },
  { chainId: 10, target: opContract, data: callData2 },
  { chainId: 7777777, target: zoraContract, data: callData3 }
]);
```

### 4. Message Lifecycle Tracking

```typescript
// Track message from sent → relayed/failed
const status = await monitor.monitorMessage(sourceChain, txHash);
console.log(status.status); // 'sent' | 'relayed' | 'failed'

// Wait for specific message to be relayed
await monitor.waitForRelay(chainId, txHash, timeout);
```

## 🚀 Quick Start

### 1. Installation

```bash
git clone <repository>
cd super-porto-demo
npm install
```

### 2. Environment Setup

```bash
# .env
PRIVATE_KEY=0x...
PORTO_IMPL_ADDRESS_A=0x...  # Same address on all chains (CREATE2)
PORTO_IMPL_ADDRESS_B=0x...
TEST_TOKEN_ADDRESS_A=0x...
TEST_TOKEN_ADDRESS_B=0x...
```

### 3. Start Supersim (for testing)

```bash
# Download and run Supersim with interop support
./supersim --interop.autorelay
```

### 4. Run the Enhanced Demo

```bash
# Simulated demo showing integration patterns
npm run demo

# Real demo with actual cross-chain messages
npm run real-demo
```

## 📊 Demo Scenarios

### Simulated Demo (`npm run demo`)
- Shows how to integrate the enhanced Porto provider
- Demonstrates monitoring system setup
- Uses mock transactions for safe testing
- Perfect for understanding the API

### Real Cross-Chain Demo (`npm run real-demo`)
- Deploys actual contracts on Supersim L2s
- Sends real L2-to-L2 messages via `L2ToL2CrossDomainMessenger`
- Shows live monitoring of transaction lifecycle
- Demonstrates real cross-chain message detection

### Interactive Frontend Demo

Experience the Porto Superchain Extension through a modern web interface showcasing real-world portfolio management scenarios.

#### Features
- **Portfolio Management**: Visualize assets across 4 Superchain L2s (OP, Base, Unichain, World Chain)
- **Real-time Monitoring**: Watch cross-chain transactions and message lifecycle
- **Interactive Rebalancing**: Simulate optimizing a $10,000 portfolio for better yields
- **Session Key Management**: Experience "one permission, multiple chains" UX

#### Quick Start

```bash
# Navigate to the demo directory
cd demo

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

#### Demo Flow

1. **Permission Setup** - EIP-7702 delegation and session key authorization
2. **Portfolio Dashboard** - View current distribution and optimization opportunities
3. **Cross-Chain Operations** - Monitor 6 simultaneous rebalancing operations
4. **Results View** - See the improved APY and annual gains

#### Demo Data

The frontend simulates a realistic portfolio scenario:

**Before Optimization:**
- OP Mainnet: $4,500 (45%) - Mixed DeFi positions
- Base: $3,000 (30%) - Liquidity provision and lending
- Unichain: $1,500 (15%) - UNI staking and LP
- World Chain: $1,000 (10%) - WLD staking and identity yields
- **Current APY**: 5.9%

**After Rebalancing:**
- Balanced 25% across all chains
- **Optimized APY**: 7.3% (+1.4% improvement)
- **Annual Gain**: +$1,400 projected

#### Customization

You can modify the demo scenarios by editing:
- `demo/lib/mockData.ts` - Portfolio data and rebalancing operations
- `demo/lib/chains.ts` - Supported chains and protocols
- `demo/components/` - Individual demo components

#### Development Setup (Optional)

For enhanced features, install additional dependencies:

```bash
cd demo
npm install framer-motion lucide-react recharts
```

This enables:
- Smooth animations (Framer Motion)
- Professional icons (Lucide React)  
- Advanced charts (Recharts)

## 🔧 Core Components

### PortoCrossChainProvider (Enhanced)

Extended the original Porto provider with:

```typescript
class PortoCrossChainProvider {
  // Enhanced with multi-chain monitoring integration
  async executeCrossChain(sourceChain, destChain, target, data) {
    // Executes and returns monitoring-compatible results
  }
  
  async executeCrossChainBatch(operations) {
    // Batch operations across multiple L2s
  }
  
  async bridgeTokens(sourceChain, destChain, token, amount) {
    // SuperchainERC20 bridging with monitoring
  }
}
```

### CrossChainMonitor (New)

Real-time monitoring system built for Porto:

```typescript
class CrossChainMonitor {
  startMonitoring(callback)    // Real-time event detection
  monitorMessage(chainId, tx)  // Track specific transactions
  getMessagesStatus(messages)  // Batch status checking
  waitForRelay(chain, tx, timeout) // Wait for completion
}
```

## 🌐 Superchain Support

### Supported Networks

| Network | Chain ID | Status | Features |
|---------|----------|--------|----------|
| Optimism | 10 | ✅ Ready | Full L2ToL2 support |
| Base | 8453 | ✅ Ready | Full L2ToL2 support |
| Zora | 7777777 | ✅ Ready | Full L2ToL2 support |
| Mode | 34443 | ✅ Ready | Full L2ToL2 support |
| Supersim L2A | 901 | 🧪 Testing | Development/Testing |
| Supersim L2B | 902 | 🧪 Testing | Development/Testing |

### Key Contracts

All Superchain L2s include these standard contracts:

- **L2ToL2CrossDomainMessenger**: `0x4200000000000000000000000000000000000023`
- **CrossL2Inbox**: `0x4200000000000000000000000000000000000022`
- **SuperchainERC20**: Standards-compliant cross-chain tokens

## 🔍 Monitoring Features

### Event Detection

The enhanced Porto system monitors these critical events:

```solidity
// Detected by CrossChainMonitor
event SentMessage(
  uint256 indexed destination,
  address indexed target, 
  uint256 indexed nonce,
  address sender,
  bytes message
);

event RelayedMessage(bytes32 indexed msgHash);
event FailedRelayedMessage(bytes32 indexed msgHash);
```

### Message States

```typescript
type MessageStatus = 
  | 'sent'      // Message sent on source chain
  | 'relayed'   // Successfully executed on destination
  | 'failed'    // Execution failed on destination
  | 'expired';  // Message expired before relay
```

## 🛠 Development

### Adding New Chains

```typescript
// Add any Superchain L2 to the monitor
const newChain = {
  chainId: 34443, // Mode Network
  chain: modeChain,
  rpcUrl: 'https://mainnet.mode.network',
  messengerAddress: '0x4200000000000000000000000000000000000023',
  inboxAddress: '0x4200000000000000000000000000000000000022'
};

monitor.addChain(newChain);
```

### Custom Event Handlers

```typescript
// Custom monitoring logic
monitor.startMonitoring((status) => {
  if (status.status === 'sent') {
    // Log message sent
    analytics.track('cross_chain_message_sent', status);
  }
  
  if (status.status === 'relayed') {
    // Update UI, notify user, etc.
    notifyUser(`Message completed on ${status.destinationChain}`);
  }
});
```

## 🎯 Use Cases

### 1. Multi-Chain DeFi
- Execute swaps across multiple L2s
- Bridge assets automatically
- Monitor transaction completion

### 2. Cross-Chain NFT Management
- Transfer NFTs between L2s
- Execute marketplace operations
- Track ownership changes

### 3. Governance Participation
- Vote on proposals across chains
- Delegate voting power
- Monitor execution status

### 4. Gaming & Social
- Cross-chain asset transfers
- Multi-chain leaderboards
- Social interactions across L2s

## 🔮 Future Enhancements

- **WebSocket real-time updates** for instant notifications
- **GraphQL integration** for complex message queries
- **Retry mechanisms** for failed cross-chain operations
- **Gas optimization** across different L2s
- **Multi-signature support** for enhanced security
- **Web UI dashboard** for visual monitoring

## 🤝 Contributing

This project extends the Porto library for the Superchain ecosystem. Contributions should focus on:

- Additional Superchain L2 integrations
- Enhanced monitoring capabilities  
- Cross-chain UX improvements
- Performance optimizations
- Security enhancements

---

🌉 **Porto + Superchain = Seamless Multi-L2 Experience**

*Expanding Porto's cross-chain capabilities to unlock the full potential of the Superchain ecosystem.* 