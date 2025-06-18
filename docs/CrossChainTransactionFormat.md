# Porto Cross-Chain Transaction Format Specification

## Overview

This document defines the **actual** transaction format used in Porto's cross-chain chained transactions, based on our working demos. This format uses Viem's `writeContract` interface and enables complex multi-step operations across the Superchain with a single user approval.

**Important**: This format is extracted directly from our working demo code and represents what actually executes successfully.

## Core Transaction Types

### 1. Session Key Authorization Transaction

**Purpose**: Initial user approval that enables automated cross-chain operations

```typescript
// ACTUAL format used in singleApprovalDemo.ts
await client.writeContract({
  address: '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707', // Porto contract address
  abi: PORTO_ABI,                                        // Porto contract ABI
  functionName: 'authorizeSessionKey',
  args: [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',      // Session key address
    BigInt(1734534443),                                  // Expiry timestamp
    true,                                               // Can bridge tokens
    true,                                               // Can execute transactions
    BigInt('1000000000000000000000')                    // Spend limit in wei
  ]
})
```

**TypeScript Interface**:
```typescript
interface SessionKeyAuthTransaction {
  address: Address;                    // Porto contract address
  abi: readonly any[];                 // Porto contract ABI
  functionName: 'authorizeSessionKey';
  args: [
    Address,                          // Session key address
    bigint,                           // Expiry timestamp
    boolean,                          // Can bridge tokens
    boolean,                          // Can execute transactions
    bigint                            // Spend limit in wei
  ];
}
```

### 2. Cross-Chain Message Transaction

**Purpose**: Send messages between chains via L2ToL2CrossDomainMessenger

```typescript
// ACTUAL format used in chainedTransactionsDemo.ts
await client.writeContract({
  address: '0x4200000000000000000000000000000000000023', // L2ToL2Messenger
  abi: MESSENGER_ABI,                                    // Messenger contract ABI
  functionName: 'sendMessage',
  args: [
    BigInt(902),                                         // Destination chain ID
    '0x2222222222222222222222222222222222222222',        // Target contract
    encodedMessageData                                   // Encoded message payload
  ]
})
```

**TypeScript Interface**:
```typescript
interface CrossChainMessageTransaction {
  address: '0x4200000000000000000000000000000000000023'; // L2ToL2Messenger
  abi: readonly any[];                 // Messenger contract ABI
  functionName: 'sendMessage';
  args: [
    bigint,                           // Destination chain ID
    Address,                          // Target contract on destination chain
    Hex                               // Encoded message data
  ];
}
```

### 3. Token Bridge Transaction

**Purpose**: Bridge tokens between chains via SuperchainTokenBridge

```typescript
// ACTUAL format used in singleApprovalDemo.ts operations
await client.writeContract({
  address: '0x4200000000000000000000000000000000000028', // SuperchainTokenBridge
  abi: BRIDGE_ABI,                                       // Bridge contract ABI
  functionName: 'sendERC20',
  args: [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',      // WETH token address
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',       // Recipient address
    BigInt('900000000000000000'),                        // Amount to bridge
    BigInt(902)                                          // Destination chain ID
  ]
})
```

## Message Encoding Patterns

### 1. Simple Data Message

**Used in**: `chainedTransactionsDemo.ts` for passing structured data between chains

```typescript
const message = encodeAbiParameters(
  [
    { type: 'string' },
    { type: 'uint256' },
    { type: 'address' }
  ],
  [
    'Step 2: Chain B received message from Chain A',
    BigInt(901),                                        // Source chain ID
    '0x2222222222222222222222222222222222222222'        // Related contract
  ]
);
```

### 2. Function Call Message

**Used in**: `singleApprovalDemo.ts` for triggering DEX swaps on destination chains

```typescript
const swapCallData = encodeFunctionData({
  abi: [{
    type: 'function',
    name: 'swapExactTokensForTokens',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ]
  }],
  functionName: 'swapExactTokensForTokens',
  args: [
    BigInt('1000000000000000000'),                       // 1 token in
    BigInt('900000000000000000'),                        // Min 0.9 tokens out
    ['0xa0b86a33e6441c8c06dd2e4b95a0dfd8b0c9f3a4', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',      // Recipient
    BigInt(Math.floor(Date.now() / 1000) + 1800)        // 30 min deadline
  ]
});
```

## Complete Working Example

### Cross-Chain Transaction Chain (A → B → A → B)

**From**: `chainedTransactionsDemo.ts` - This actually executes successfully

```typescript
// Step 1: Chain A → Chain B
const step1Message = encodeAbiParameters(
  [{ type: 'string' }, { type: 'uint256' }, { type: 'address' }],
  ['Step 2: Chain B received message from Chain A', BigInt(901), MOCK_CONTRACT]
);

const hash1 = await clientA.writeContract({
  address: '0x4200000000000000000000000000000000000023',
  abi: DEMO_ABI,
  functionName: 'sendMessage',
  args: [BigInt(902), MOCK_CONTRACT, step1Message]
});

// Step 2: Chain B → Chain A  
const step2Message = encodeAbiParameters(
  [{ type: 'string' }, { type: 'uint256' }, { type: 'uint256' }],
  ['Step 3: Chain A, this is Chain B responding!', BigInt(902), BigInt(Date.now())]
);

const hash2 = await clientB.writeContract({
  address: '0x4200000000000000000000000000000000000023',
  abi: DEMO_ABI,
  functionName: 'sendMessage',
  args: [BigInt(901), MOCK_CONTRACT, step2Message]
});

// Step 3: Chain A → Chain B (Final)
const finalMessage = encodeAbiParameters(
  [{ type: 'string' }, { type: 'bool' }],
  ['Chain complete: A→B→A transaction flow successful!', true]
);

const hash3 = await clientA.writeContract({
  address: '0x4200000000000000000000000000000000000023',
  abi: DEMO_ABI,
  functionName: 'sendMessage',
  args: [BigInt(902), MOCK_CONTRACT, finalMessage]
});
```

**Result**: 3 successful cross-chain transactions with real transaction hashes and block confirmations.

## Execution Results from Working Demos

### Chained Transaction Demo Results
```
✅ Transaction 1 sent: 0xdb32759f8e7d61eacfd5a81835e2cb53e0b2fbf14ac032b8d142a1b0b8475317
✅ Transaction 1 confirmed in block: 121915
✅ Transaction 2 sent: 0x3fbb19de235033dc8cd4b4e422419945ed11c4ef2690ab59f6feb1f117cbce57
✅ Transaction 2 confirmed in block: 121911
✅ Transaction 3 sent: 0x3789052ebbf6fd286e85dbb8c0210d0759a6baa13561c55d61f1c5c8e29da3e3
✅ Transaction 3 confirmed in block: 121919
```

### Single Approval Demo Results
```
✅ Automated transaction sent: 0xe54489007f88655c787a3a49f13ce974339fc74a4db9c9d663f3c4e22871e50e
✅ Transaction confirmed in block: 126723
📋 Gas used: 49784
```

## Required ABIs

### Porto Contract ABI (Simplified)
```typescript
const PORTO_ABI = [
  {
    type: 'function',
    name: 'authorizeSessionKey',
    inputs: [
      { name: '_key', type: 'address' },
      { name: '_expiry', type: 'uint256' },
      { name: '_canBridge', type: 'bool' },
      { name: '_canExecute', type: 'bool' },
      { name: '_spendLimit', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;
```

### L2ToL2CrossDomainMessenger ABI
```typescript
const MESSENGER_ABI = [
  {
    type: 'function',
    name: 'sendMessage',
    inputs: [
      { name: '_chainId', type: 'uint256' },
      { name: '_target', type: 'address' },
      { name: '_message', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;
```

## Constants (From Working Demos)

```typescript
// Superchain system contracts
export const L2_TO_L2_MESSENGER = '0x4200000000000000000000000000000000000023';
export const SUPERCHAIN_TOKEN_BRIDGE = '0x4200000000000000000000000000000000000028';

// Working deployment addresses
export const PORTO_ADDRESS = '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707';

// Test chain IDs (Supersim)
export const CHAIN_A = 901;
export const CHAIN_B = 902;

// Mock contracts used in demos
export const MOCK_CONTRACT = '0x2222222222222222222222222222222222222222';
export const MOCK_DEX = '0x1111111111111111111111111111111111111111';
```

## Validation Checklist

✅ **Format matches working demos**: All examples extracted from actual demo code  
✅ **Uses Viem writeContract format**: Standard Viem transaction interface  
✅ **Includes required ABI field**: Contract ABI must be provided  
✅ **Correct address field**: Uses `address` not `target`  
✅ **Working transaction hashes**: Proven to execute successfully  
✅ **Real gas consumption**: Actual gas usage data included  

## Running the Demos

To see these formats in action:

```bash
# Simple cross-chain message
npm run demo:simple-interop

# 3-step chained transactions  
npm run demo:chained

# Single approval workflow
npm run demo:single-approval
```

All demos use the exact transaction format documented above and execute successfully on Supersim.

## TypeScript Integration

Import the working types:

```typescript
import {
  ActualSessionKeyAuthTransaction,
  ActualCrossChainMessageTransaction,
  createCrossChainMessageTx,
  ACTUAL_SUPERCHAIN_CONTRACTS
} from './types/ActualDemoTransactionTypes';
```

This ensures your implementation matches the proven working format from our demos. 