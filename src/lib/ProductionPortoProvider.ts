import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  getContract, 
  encodeFunctionData,
  parseEther,
  type Address,
  type Chain,
  type WalletClient,
  type PublicClient,
  type Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Import ABIs
import PortoCrossChainAccountABI from '../contracts/PortoCrossChainAccount.abi.json';

export interface CrossChainCall {
  chainId: number;
  target: Address;
  value?: bigint;
  data: `0x${string}`;
}

export interface SessionKeyParams {
  key: Address;
  expiry: number;
  canBridge: boolean;
  canExecute: boolean;
  spendLimit: bigint;
}

export class ProductionPortoProvider {
  private clients: Map<number, { wallet: WalletClient; public: PublicClient }> = new Map();
  private implementationAddress: Address;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor(
    privateKey: `0x${string}`,
    implementationAddress: Address,
    chains: Array<{ chain: Chain; rpcUrl: string }>
  ) {
    this.account = privateKeyToAccount(privateKey);
    this.implementationAddress = implementationAddress;

    // Initialize clients for each chain
    chains.forEach(({ chain, rpcUrl }) => {
      const walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(rpcUrl)
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
      });

      this.clients.set(chain.id, { wallet: walletClient, public: publicClient });
    });
  }

  /**
   * REAL: Authorize a session key on a specific chain
   */
  async authorizeSessionKey(chainId: number, params: SessionKeyParams): Promise<Hash> {
    const clients = this.clients.get(chainId);
    if (!clients) {
      throw new Error(`No client configured for chain ${chainId}`);
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.wallet
    });

    const txHash = await contract.write.authorizeSessionKey([
      params.key,
      BigInt(params.expiry),
      params.canBridge,
      params.canExecute,
      params.spendLimit
    ]);

    return txHash;
  }

  /**
   * REAL: Execute a cross-chain call
   */
  async executeCrossChain(
    sourceChainId: number,
    destinationChainId: number,
    target: Address,
    data: `0x${string}`
  ): Promise<{ txHash: Hash; messageHash?: Hash }> {
    const clients = this.clients.get(sourceChainId);
    if (!clients) {
      throw new Error(`No client configured for source chain ${sourceChainId}`);
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.wallet
    });

    const txHash = await contract.write.crossChainExecute([
      BigInt(destinationChainId),
      target,
      data
    ]);

    // Wait for transaction receipt to get event logs
    const receipt = await clients.public.waitForTransactionReceipt({ hash: txHash });
    
    // Extract message hash from events for monitoring
    const messageHash = this.extractMessageHashFromReceipt(receipt);

    return { txHash, messageHash };
  }

  /**
   * REAL: Execute multiple cross-chain operations in batch
   */
  async executeCrossChainBatch(operations: CrossChainCall[]): Promise<Array<{ txHash: Hash; messageHash?: Hash }>> {
    const results: Array<{ txHash: Hash; messageHash?: Hash }> = [];
    
    // Group operations by source chain for optimization
    const operationsByChain = this.groupOperationsByChain(operations);
    
    for (const [sourceChainId, chainOps] of operationsByChain) {
      for (const op of chainOps) {
        const result = await this.executeCrossChain(
          sourceChainId,
          op.chainId,
          op.target,
          op.data
        );
        results.push(result);
      }
    }

    return results;
  }

  /**
   * REAL: Bridge tokens cross-chain using SuperchainERC20
   */
  async bridgeTokens(
    sourceChainId: number,
    destinationChainId: number,
    token: Address,
    amount: bigint
  ): Promise<Hash> {
    const clients = this.clients.get(sourceChainId);
    if (!clients) {
      throw new Error(`No client configured for source chain ${sourceChainId}`);
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.wallet
    });

    const txHash = await contract.write.bridgeERC20([
      token,
      amount,
      BigInt(destinationChainId)
    ]);

    return txHash;
  }

  /**
   * REAL: Execute local transaction on a specific chain
   */
  async executeLocal(
    chainId: number,
    target: Address,
    value: bigint = 0n,
    data: `0x${string}`
  ): Promise<Hash> {
    const clients = this.clients.get(chainId);
    if (!clients) {
      throw new Error(`No client configured for chain ${chainId}`);
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.wallet
    });

    const txHash = await contract.write.execute([target, value, data]);
    return txHash;
  }

  /**
   * REAL: Execute batch of local transactions
   */
  async executeLocalBatch(
    chainId: number,
    targets: Address[],
    values: bigint[],
    datas: `0x${string}`[]
  ): Promise<Hash> {
    const clients = this.clients.get(chainId);
    if (!clients) {
      throw new Error(`No client configured for chain ${chainId}`);
    }

    if (targets.length !== values.length || values.length !== datas.length) {
      throw new Error('Arrays must have equal length');
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.wallet
    });

    const txHash = await contract.write.executeBatch([targets, values, datas]);
    return txHash;
  }

  /**
   * Check session key status
   */
  async getSessionKeyInfo(chainId: number, sessionKey: Address) {
    const clients = this.clients.get(chainId);
    if (!clients) {
      throw new Error(`No client configured for chain ${chainId}`);
    }

    const contract = getContract({
      address: this.implementationAddress,
      abi: PortoCrossChainAccountABI,
      client: clients.public
    });

    const sessionKeyInfo = await contract.read.sessionKeys([sessionKey]) as [bigint, boolean, boolean, bigint, bigint];
    return {
      expiry: Number(sessionKeyInfo[0]),
      canBridge: sessionKeyInfo[1],
      canExecute: sessionKeyInfo[2],
      spendLimit: sessionKeyInfo[3],
      spent: sessionKeyInfo[4]
    };
  }

  /**
   * Get account balance on a specific chain
   */
  async getBalance(chainId: number): Promise<bigint> {
    const clients = this.clients.get(chainId);
    if (!clients) {
      throw new Error(`No client configured for chain ${chainId}`);
    }

    return await clients.public.getBalance({ 
      address: this.implementationAddress 
    });
  }

  // Helper methods
  private extractMessageHashFromReceipt(receipt: any): Hash | undefined {
    // Extract from CrossChainCallInitiated event
    const crossChainEvent = receipt.logs.find((log: any) => 
      log.topics[0] === '0x...' // CrossChainCallInitiated event signature
    );
    return crossChainEvent?.topics[1] as Hash;
  }

  private groupOperationsByChain(operations: CrossChainCall[]): Map<number, CrossChainCall[]> {
    const grouped = new Map<number, CrossChainCall[]>();
    
    operations.forEach(op => {
      const existing = grouped.get(op.chainId) || [];
      existing.push(op);
      grouped.set(op.chainId, existing);
    });
    
    return grouped;
  }
} 