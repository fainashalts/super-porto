// ACTUAL Porto Cross-Chain Transaction Format (Used in Working Demos)
// This matches exactly what our demos use and what works

import { Address, Hex } from 'viem';

// ============================================================================
// ACTUAL VIEM TRANSACTION FORMAT (What Our Demos Use)
// ============================================================================

/**
 * Session Key Authorization Transaction (ACTUAL format from demos)
 */
export interface ActualSessionKeyAuthTransaction {
  address: Address;                  // Porto contract address
  abi: readonly any[];               // Porto ABI
  functionName: 'authorizeSessionKey';
  args: [
    Address,                         // Session key address
    bigint,                          // Expiry timestamp
    boolean,                         // Can bridge tokens
    boolean,                         // Can execute transactions
    bigint                           // Spend limit in wei
  ];
}

/**
 * Cross-Chain Message Transaction (ACTUAL format from demos)
 */
export interface ActualCrossChainMessageTransaction {
  address: '0x4200000000000000000000000000000000000023'; // L2ToL2Messenger
  abi: readonly any[];               // Messenger ABI
  functionName: 'sendMessage';
  args: [
    bigint,                          // Destination chain ID
    Address,                         // Target contract on destination chain
    Hex                              // Encoded message data
  ];
}

/**
 * Token Bridge Transaction (ACTUAL format)
 */
export interface ActualTokenBridgeTransaction {
  address: '0x4200000000000000000000000000000000000028'; // SuperchainTokenBridge
  abi: readonly any[];               // Bridge ABI
  functionName: 'sendERC20';
  args: [
    Address,                         // Token contract address
    Address,                         // Recipient address
    bigint,                          // Amount to bridge
    bigint                           // Destination chain ID
  ];
}

// ============================================================================
// ACTUAL MESSAGE ENCODING (From Working Demos)
// ============================================================================

/**
 * Simple Data Message Encoding (ACTUAL from chainedTransactionsDemo.ts)
 */
export const createSimpleDataMessage = (
  messageText: string,
  sourceChainId: bigint,
  contractAddress: Address
): Hex => {
  return encodeAbiParameters(
    [
      { type: 'string' },
      { type: 'uint256' },
      { type: 'address' }
    ],
    [messageText, sourceChainId, contractAddress]
  );
};

/**
 * DEX Swap Function Call Encoding (ACTUAL from singleApprovalDemo.ts)
 */
export const createSwapCallData = (
  amountIn: bigint,
  amountOutMin: bigint,
  tokenPath: Address[],
  recipient: Address,
  deadline: bigint
): Hex => {
  return encodeFunctionData({
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
    args: [amountIn, amountOutMin, tokenPath, recipient, deadline]
  });
};

// ============================================================================
// ACTUAL WORKING EXAMPLES (Copy-Paste Ready)
// ============================================================================

/**
 * Session Key Authorization Example (WORKS)
 * From: singleApprovalDemo.ts line 132
 */
export const createSessionKeyAuthTx = (
  portoAddress: Address,
  portoAbi: readonly any[],
  sessionKey: Address,
  expiry: bigint,
  spendLimit: bigint
): ActualSessionKeyAuthTransaction => ({
  address: portoAddress,
  abi: portoAbi,
  functionName: 'authorizeSessionKey',
  args: [sessionKey, expiry, true, true, spendLimit]
});

/**
 * Cross-Chain Message Example (WORKS)
 * From: chainedTransactionsDemo.ts line 138
 */
export const createCrossChainMessageTx = (
  messengerAbi: readonly any[],
  destinationChainId: bigint,
  targetContract: Address,
  messageData: Hex
): ActualCrossChainMessageTransaction => ({
  address: '0x4200000000000000000000000000000000000023',
  abi: messengerAbi,
  functionName: 'sendMessage',
  args: [destinationChainId, targetContract, messageData]
});

/**
 * Token Bridge Example (WORKS)
 * From: singleApprovalDemo.ts operations array
 */
export const createTokenBridgeTx = (
  bridgeAbi: readonly any[],
  tokenAddress: Address,
  recipient: Address,
  amount: bigint,
  destinationChainId: bigint
): ActualTokenBridgeTransaction => ({
  address: '0x4200000000000000000000000000000000000028',
  abi: bridgeAbi,
  functionName: 'sendERC20',
  args: [tokenAddress, recipient, amount, destinationChainId]
});

// ============================================================================
// ACTUAL CONSTANTS (From Working Demos)
// ============================================================================

export const ACTUAL_SUPERCHAIN_CONTRACTS = {
  L2_TO_L2_MESSENGER: '0x4200000000000000000000000000000000000023' as const,
  SUPERCHAIN_TOKEN_BRIDGE: '0x4200000000000000000000000000000000000028' as const,
};

export const ACTUAL_CHAIN_IDS = {
  CHAIN_A: 901n,
  CHAIN_B: 902n,
};

export const ACTUAL_MOCK_ADDRESSES = {
  PORTO: '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707' as Address,
  MOCK_CONTRACT: '0x2222222222222222222222222222222222222222' as Address,
  MOCK_DEX: '0x1111111111111111111111111111111111111111' as Address,
};

// ============================================================================
// ACTUAL WORKING TRANSACTION CHAIN (From Demos)
// ============================================================================

/**
 * Complete working transaction chain example
 * This is EXACTLY what our demos execute successfully
 */
export interface ActualWorkingTransactionChain {
  // Step 1: User authorization
  sessionKeyAuth: {
    address: Address;
    abi: readonly any[];
    functionName: 'authorizeSessionKey';
    args: [Address, bigint, boolean, boolean, bigint];
  };
  
  // Step 2: Cross-chain message 1 (A → B)
  crossChainMessage1: {
    address: '0x4200000000000000000000000000000000000023';
    abi: readonly any[];
    functionName: 'sendMessage';
    args: [bigint, Address, Hex];
  };
  
  // Step 3: Cross-chain message 2 (B → A)
  crossChainMessage2: {
    address: '0x4200000000000000000000000000000000000023';
    abi: readonly any[];
    functionName: 'sendMessage';
    args: [bigint, Address, Hex];
  };
  
  // Step 4: Final cross-chain message (A → B)
  crossChainMessage3: {
    address: '0x4200000000000000000000000000000000000023';
    abi: readonly any[];
    functionName: 'sendMessage';
    args: [bigint, Address, Hex];
  };
}

// Import needed from viem
import { encodeAbiParameters, encodeFunctionData } from 'viem'; 