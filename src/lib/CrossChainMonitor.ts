import { 
  createPublicClient, 
  http, 
  type Log, 
  type Address, 
  type Chain, 
  type PublicClient,
  type Hash,
  keccak256,
  encodeAbiParameters
} from 'viem';

export interface MessageIdentifier {
  origin: Address;
  blockNumber: bigint;
  logIndex: bigint;
  timestamp: bigint;
  chainId: bigint;
}

export interface SentMessage {
  destination: number;
  target: Address;
  nonce: bigint;
  sender: Address;
  message: `0x${string}`;
}

export interface MessageStatus {
  messageHash: Hash;
  identifier: MessageIdentifier;
  status: 'sent' | 'relayed' | 'failed' | 'expired';
  txHash: Hash;
  relayTxHash?: Hash;
  error?: string;
  timestamp: number;
}

export interface CrossChainMonitorConfig {
  chains: Array<{
    chainId: number;
    chain: Chain;
    rpcUrl: string;
    messengerAddress: Address;
    inboxAddress: Address;
  }>;
  pollingInterval?: number; // milliseconds
  messageExpiry?: number; // seconds (default 7 days)
}

export class CrossChainMonitor {
  private clients: Map<number, PublicClient> = new Map();
  private config: CrossChainMonitorConfig;
  private pollingInterval: number;
  private messageExpiry: number;
  private isMonitoring = false;
  private monitoringIntervals: NodeJS.Timeout[] = [];

  // Event signatures
  private static readonly SENT_MESSAGE_SIGNATURE = '0x382409ac69001e11931a28435afef442cbfd20d9891907e8fa373ba7d351f320'; // keccak256('SentMessage(uint256,address,uint256,address,bytes)')
  private static readonly RELAYED_MESSAGE_SIGNATURE = '0x4641df4a962071e12719d8c8c8e5ac7fc4d97b927346a3d7a335b1f7517e133c'; // keccak256('RelayedMessage(bytes32)')
  private static readonly FAILED_RELAYED_MESSAGE_SIGNATURE = '0x99d0e048484baa1b1540b1367cb128acd7ab2946d1ed91ec10e3c85e4bf51b8f'; // keccak256('FailedRelayedMessage(bytes32)')

  constructor(config: CrossChainMonitorConfig) {
    this.config = config;
    this.pollingInterval = config.pollingInterval || 5000; // 5 seconds default
    this.messageExpiry = config.messageExpiry || 7 * 24 * 60 * 60; // 7 days default

    // Initialize clients for each chain
    config.chains.forEach(({ chainId, chain, rpcUrl }) => {
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl)
      });
      this.clients.set(chainId, client);
    });
  }

  /**
   * Monitor a specific cross-chain message by transaction hash
   */
  async monitorMessage(sourceChainId: number, txHash: Hash): Promise<MessageStatus> {
    const client = this.clients.get(sourceChainId);
    if (!client) {
      throw new Error(`No client configured for chain ${sourceChainId}`);
    }

    const receipt = await client.getTransactionReceipt({ hash: txHash });
    
    // Find SentMessage events in the transaction receipt
    const sentMessageLogs = receipt.logs.filter(
      (log: Log) => log.topics[0] === CrossChainMonitor.SENT_MESSAGE_SIGNATURE
    );

    if (sentMessageLogs.length === 0) {
      throw new Error('No SentMessage events found in transaction');
    }

    // Process the first SentMessage event (assuming one per transaction)
    const log = sentMessageLogs[0];
    const sentMessage = this.decodeSentMessage(log);
    const identifier = await this.createMessageIdentifier(sourceChainId, log, receipt.blockNumber);
    const messageHash = this.calculateMessageHash(identifier, sentMessage);

    const status: MessageStatus = {
      messageHash,
      identifier,
      status: 'sent',
      txHash,
      timestamp: Date.now()
    };

    // Check if message has been relayed on destination chain
    const destinationClient = this.clients.get(sentMessage.destination);
    if (destinationClient) {
      const relayStatus = await this.checkRelayStatus(sentMessage.destination, messageHash);
      if (relayStatus.isRelayed) {
        status.status = relayStatus.status;
        status.relayTxHash = relayStatus.txHash;
        status.error = relayStatus.error;
      }
    }

    return status;
  }

  /**
   * Start monitoring all chains for cross-chain messages
   */
  startMonitoring(callback?: (status: MessageStatus) => void): void {
    if (this.isMonitoring) {
      console.log('Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting cross-chain message monitoring...');

    this.config.chains.forEach(chainConfig => {
      const interval = setInterval(async () => {
        try {
          await this.pollChainForMessages(chainConfig, callback);
        } catch (error) {
          console.error(`Error polling chain ${chainConfig.chainId}:`, error);
        }
      }, this.pollingInterval);

      this.monitoringIntervals.push(interval);
    });
  }

  /**
   * Stop monitoring all chains
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];
    console.log('⏹️ Stopped cross-chain message monitoring');
  }

  /**
   * Get the status of multiple messages
   */
  async getMessagesStatus(messages: Array<{ chainId: number; txHash: Hash }>): Promise<MessageStatus[]> {
    const statuses = await Promise.all(
      messages.map(async ({ chainId, txHash }) => {
        try {
          return await this.monitorMessage(chainId, txHash);
        } catch (error) {
          console.error(`Error monitoring message ${txHash} on chain ${chainId}:`, error);
          return null;
        }
      })
    );

    return statuses.filter(status => status !== null) as MessageStatus[];
  }

  /**
   * Create a message identifier from log data
   */
  private async createMessageIdentifier(chainId: number, log: Log, blockNumber: bigint): Promise<MessageIdentifier> {
    const client = this.clients.get(chainId)!;
    const block = await client.getBlock({ blockNumber });

    return {
      origin: log.address as Address,
      blockNumber,
      logIndex: BigInt(log.logIndex || 0),
      timestamp: block.timestamp,
      chainId: BigInt(chainId)
    };
  }

  /**
   * Calculate the message hash using the same algorithm as the L2ToL2 system
   */
  private calculateMessageHash(identifier: MessageIdentifier, sentMessage: SentMessage): Hash {
    // Message hash as per L2ToL2 spec
    const msgHash = keccak256(
      encodeAbiParameters(
        [
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'address' },
          { type: 'uint256' },
          { type: 'address' },
          { type: 'bytes' }
        ],
        [
          CrossChainMonitor.SENT_MESSAGE_SIGNATURE,
          BigInt(sentMessage.destination),
          sentMessage.target,
          sentMessage.nonce,
          sentMessage.sender,
          sentMessage.message
        ]
      )
    );

    // Final hash combining identifier and message hash
    return keccak256(
      encodeAbiParameters(
        [
          { type: 'tuple', components: [
            { type: 'address', name: 'origin' },
            { type: 'uint256', name: 'blockNumber' },
            { type: 'uint256', name: 'logIndex' },
            { type: 'uint256', name: 'timestamp' },
            { type: 'uint256', name: 'chainId' }
          ]},
          { type: 'bytes32' }
        ],
        [identifier, msgHash]
      )
    );
  }

  /**
   * Decode SentMessage event from log data
   */
  private decodeSentMessage(log: Log): SentMessage {
    // Topics: [signature, destination, target, nonce]
    // Data: [sender, message]
    const destination = parseInt(log.topics[1] as string, 16);
    const target = `0x${log.topics[2]?.slice(26)}` as Address; // Remove padding
    const nonce = BigInt(log.topics[3] as string);

    // Decode data (sender and message are in the data field)
    const dataHex = log.data.slice(2); // Remove 0x
    const senderHex = dataHex.slice(0, 64); // First 32 bytes (64 hex chars)
    const sender = `0x${senderHex.slice(24)}` as Address; // Remove padding

    // Message is the rest of the data (after offset and length)
    const messageOffsetHex = dataHex.slice(64, 128);
    const messageOffset = parseInt(messageOffsetHex, 16) * 2; // Convert to hex position
    const messageLengthHex = dataHex.slice(messageOffset, messageOffset + 64);
    const messageLength = parseInt(messageLengthHex, 16) * 2; // Convert to hex length
    const messageHex = dataHex.slice(messageOffset + 64, messageOffset + 64 + messageLength);
    const message = `0x${messageHex}` as `0x${string}`;

    return {
      destination,
      target,
      nonce,
      sender,
      message
    };
  }

  /**
   * Check if a message has been relayed on the destination chain
   */
  private async checkRelayStatus(destinationChainId: number, messageHash: Hash): Promise<{
    isRelayed: boolean;
    status: 'relayed' | 'failed';
    txHash?: Hash;
    error?: string;
  }> {
    const client = this.clients.get(destinationChainId);
    if (!client) {
      return { isRelayed: false, status: 'failed', error: 'No client for destination chain' };
    }

    const chainConfig = this.config.chains.find(c => c.chainId === destinationChainId);
    if (!chainConfig) {
      return { isRelayed: false, status: 'failed', error: 'Chain config not found' };
    }

    try {
      // Check for RelayedMessage events
      const relayedLogs = await client.getLogs({
        address: chainConfig.messengerAddress,
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Filter for RelayedMessage events with our message hash
      const relayedMessage = relayedLogs.find(log => 
        log.topics[0] === CrossChainMonitor.RELAYED_MESSAGE_SIGNATURE &&
        log.topics[1] === messageHash
      );

      if (relayedMessage) {
        return {
          isRelayed: true,
          status: 'relayed',
          txHash: relayedMessage.transactionHash as Hash
        };
      }

      // Check for FailedRelayedMessage events
      const failedMessage = relayedLogs.find(log => 
        log.topics[0] === CrossChainMonitor.FAILED_RELAYED_MESSAGE_SIGNATURE &&
        log.topics[1] === messageHash
      );

      if (failedMessage) {
        return {
          isRelayed: true,
          status: 'failed',
          txHash: failedMessage.transactionHash as Hash,
          error: 'Message relay failed on destination chain'
        };
      }

      return { isRelayed: false, status: 'failed' };
    } catch (error) {
      return { 
        isRelayed: false, 
        status: 'failed', 
        error: `Error checking relay status: ${error}` 
      };
    }
  }

  /**
   * Poll a single chain for new cross-chain messages
   */
  private async pollChainForMessages(
    chainConfig: CrossChainMonitorConfig['chains'][0], 
    callback?: (status: MessageStatus) => void
  ): Promise<void> {
    const client = this.clients.get(chainConfig.chainId)!;
    
    try {
      // Get recent blocks (last 10 blocks to avoid missing messages)
      const latestBlockNumber = await client.getBlockNumber();
      const fromBlock = latestBlockNumber - 10n;

      // Look for SentMessage events
      const logs = await client.getLogs({
        address: chainConfig.messengerAddress,
        fromBlock
      });

      // Filter for SentMessage events
      const sentMessageLogs = logs.filter(log => 
        log.topics[0] === CrossChainMonitor.SENT_MESSAGE_SIGNATURE
      );

      for (const log of sentMessageLogs) {
        try {
          const sentMessage = this.decodeSentMessage(log);
          const identifier = await this.createMessageIdentifier(chainConfig.chainId, log, log.blockNumber!);
          const messageHash = this.calculateMessageHash(identifier, sentMessage);

          const status: MessageStatus = {
            messageHash,
            identifier,
            status: 'sent',
            txHash: log.transactionHash as Hash,
            timestamp: Date.now()
          };

          // Check relay status
          const relayStatus = await this.checkRelayStatus(sentMessage.destination, messageHash);
          if (relayStatus.isRelayed) {
            status.status = relayStatus.status;
            status.relayTxHash = relayStatus.txHash;
            status.error = relayStatus.error;
          }

          callback?.(status);
        } catch (error) {
          console.error('Error processing log:', error);
        }
      }
    } catch (error) {
      console.error(`Error polling chain ${chainConfig.chainId}:`, error);
    }
  }

  /**
   * Wait for a message to be relayed with timeout
   */
  async waitForRelay(
    sourceChainId: number, 
    txHash: Hash, 
    timeoutMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<MessageStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.monitorMessage(sourceChainId, txHash);
      
      if (status.status === 'relayed' || status.status === 'failed') {
        return status;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Timeout waiting for message relay');
  }
}