// Porto Cross-Chain Transaction Format Types
// Use these interfaces to ensure consistency across your team's implementations

import { Address, Hex } from 'viem';

// ============================================================================
// CORE TRANSACTION TYPES
// ============================================================================

/**
 * Session Key Authorization Transaction
 * User's initial approval that enables automated cross-chain operations
 */
export interface SessionKeyAuthTransaction {
  target: Address;                    // Porto contract address
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
 * Cross-Chain Message Transaction
 * Sends messages between chains via L2ToL2CrossDomainMessenger
 */
export interface CrossChainMessageTransaction {
  target: '0x4200000000000000000000000000000000000023'; // L2ToL2Messenger
  functionName: 'sendMessage';
  args: [
    bigint,                          // Destination chain ID
    Address,                         // Target contract on destination chain
    Hex                              // Encoded message data
  ];
}

/**
 * Batch Execution Transaction
 * Executes multiple operations atomically on a single chain
 */
export interface BatchExecutionTransaction {
  target: Address;                   // Porto contract address
  functionName: 'executeBatch';
  args: [
    Address[],                       // Array of target contracts
    bigint[],                        // Array of ETH values (usually 0)
    Hex[]                            // Array of encoded function calls
  ];
}

/**
 * Token Bridge Transaction
 * Bridges tokens between chains via SuperchainTokenBridge
 */
export interface TokenBridgeTransaction {
  target: '0x4200000000000000000000000000000000000028'; // SuperchainTokenBridge
  functionName: 'sendERC20';
  args: [
    Address,                         // Token contract address
    Address,                         // Recipient address
    bigint,                          // Amount to bridge
    bigint                           // Destination chain ID
  ];
}

// ============================================================================
// MESSAGE ENCODING TYPES
// ============================================================================

/**
 * Simple Data Message
 * For passing structured data between chains
 */
export interface SimpleDataMessage {
  types: readonly [
    { type: 'string' },
    { type: 'uint256' },
    { type: 'address' }
  ];
  values: [
    string,                          // Message text
    bigint,                          // Source chain ID
    Address                          // Related contract address
  ];
}

/**
 * Function Call Message
 * For triggering specific functions on destination chain
 */
export interface FunctionCallMessage {
  abi: readonly any[];               // Function ABI
  functionName: string;              // Function to call
  args: readonly any[];              // Function arguments
}

/**
 * DEX Swap Message
 * Standard format for cross-chain swap operations
 */
export interface SwapMessage {
  abi: readonly [{
    type: 'function';
    name: 'swapExactTokensForTokens';
    inputs: readonly [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ];
  }];
  functionName: 'swapExactTokensForTokens';
  args: [
    bigint,                          // Amount in
    bigint,                          // Minimum amount out
    Address[],                       // Token path
    Address,                         // Recipient
    bigint                           // Deadline timestamp
  ];
}

// ============================================================================
// CHAINED TRANSACTION PATTERNS
// ============================================================================

/**
 * Complete Cross-Chain Arbitrage Transaction
 * Example: USDC → WETH (Chain A) → Bridge → WETH → USDC (Chain B)
 */
export interface ChainedArbitrageTransaction {
  // Step 0: User authorization (one-time)
  authorization: SessionKeyAuthTransaction;
  
  // Step 1: Swap on source chain
  sourceSwap: {
    target: Address;                 // DEX contract on source chain
    functionName: 'swapExactTokensForTokens';
    args: [
      bigint,                        // Amount in
      bigint,                        // Minimum amount out
      Address[],                     // Token path
      Address,                       // Recipient (session key)
      bigint                         // Deadline
    ];
  };
  
  // Step 2: Bridge tokens
  bridge: TokenBridgeTransaction;
  
  // Step 3: Cross-chain swap trigger
  crossChainTrigger: CrossChainMessageTransaction;
}

/**
 * Portfolio Rebalancing Transaction
 * Example: Multi-chain portfolio optimization
 */
export interface PortfolioRebalanceTransaction {
  authorization: SessionKeyAuthTransaction;
  operations: Array<{
    chainId: bigint;
    operations: Array<{
      target: Address;
      functionName: string;
      args: readonly any[];
    }>;
  }>;
  crossChainTransfers: TokenBridgeTransaction[];
}

// ============================================================================
// EXECUTION CONTEXT TYPES
// ============================================================================

/**
 * Transaction Execution Context
 * Metadata for transaction execution
 */
export interface TransactionContext {
  sessionKey: Address;               // Authorized session key
  sourceChain: bigint;               // Origin chain ID
  destinationChain?: bigint;         // Target chain ID (if cross-chain)
  deadline: bigint;                  // Transaction deadline
  slippageTolerance: bigint;         // Acceptable slippage (basis points)
  gasLimit?: bigint;                 // Gas limit override
}

/**
 * Transaction with Fallback
 * Error handling pattern for failed transactions
 */
export interface TransactionWithFallback {
  primary: {
    target: Address;
    functionName: string;
    args: readonly any[];
  };
  fallback?: {
    target: Address;
    functionName: string;
    args: readonly any[];
  };
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Verifiable Cross-Chain Message
 * Enhanced message format with verification data
 */
export interface VerifiableMessage {
  nonce: bigint;                     // Unique message ID
  sourceChain: bigint;               // Origin chain
  destinationChain: bigint;          // Target chain
  timestamp: bigint;                 // Creation time
  sender: Address;                   // Message sender
  target: Address;                   // Message target
  payload: Hex;                      // Actual message data
  signature?: Hex;                   // Optional verification signature
}

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

/**
 * Superchain System Contract Addresses
 */
export const SUPERCHAIN_CONTRACTS = {
  L2_TO_L2_MESSENGER: '0x4200000000000000000000000000000000000023' as const,
  SUPERCHAIN_TOKEN_BRIDGE: '0x4200000000000000000000000000000000000028' as const,
} as const;

/**
 * Supported Chain IDs
 */
export const CHAIN_IDS = {
  // Mainnet chains
  OPTIMISM: 10n,
  BASE: 8453n,
  UNICHAIN: 1301n,
  WORLD_CHAIN: 480n,
  
  // Supersim test chains
  CHAIN_A: 901n,
  CHAIN_B: 902n,
} as const;

/**
 * Common Token Addresses (example - update with actual addresses)
 */
export const TOKENS = {
  USDC: '0xa0b86a33e6441c8c06dd2e4b95a0dfd8b0c9f3a4' as Address,
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address,
  // Add more tokens as needed
} as const;

/**
 * Transaction Configuration Defaults
 */
export const TRANSACTION_DEFAULTS = {
  SESSION_KEY_EXPIRY_HOURS: 24,
  DEFAULT_SLIPPAGE_BPS: 50n,         // 0.5%
  DEFAULT_DEADLINE_MINUTES: 30,
  MAX_SPEND_LIMIT_ETH: 1000n,
  DEFAULT_GAS_LIMIT: 300000n,
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic Transaction Structure
 */
export interface Transaction {
  target: Address;
  functionName: string;
  args: readonly any[];
  value?: bigint;
  gasLimit?: bigint;
}

/**
 * Transaction Result
 */
export interface TransactionResult {
  hash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  success: boolean;
  events: Array<{
    address: Address;
    topics: Hex[];
    data: Hex;
  }>;
}

/**
 * Chain Configuration
 */
export interface ChainConfig {
  id: bigint;
  name: string;
  rpcUrl: string;
  portoAddress: Address;
  supportedTokens: Address[];
  dexAddresses: Address[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a session key authorization transaction
 */
export function isValidSessionKeyAuth(tx: any): tx is SessionKeyAuthTransaction {
  return (
    typeof tx === 'object' &&
    typeof tx.target === 'string' &&
    tx.functionName === 'authorizeSessionKey' &&
    Array.isArray(tx.args) &&
    tx.args.length === 5
  );
}

/**
 * Validates a cross-chain message transaction
 */
export function isValidCrossChainMessage(tx: any): tx is CrossChainMessageTransaction {
  return (
    typeof tx === 'object' &&
    tx.target === SUPERCHAIN_CONTRACTS.L2_TO_L2_MESSENGER &&
    tx.functionName === 'sendMessage' &&
    Array.isArray(tx.args) &&
    tx.args.length === 3
  );
}

/**
 * Type guard for chained arbitrage transactions
 */
export function isChainedArbitrageTransaction(tx: any): tx is ChainedArbitrageTransaction {
  return (
    typeof tx === 'object' &&
    isValidSessionKeyAuth(tx.authorization) &&
    typeof tx.sourceSwap === 'object' &&
    typeof tx.bridge === 'object' &&
    isValidCrossChainMessage(tx.crossChainTrigger)
  );
} 