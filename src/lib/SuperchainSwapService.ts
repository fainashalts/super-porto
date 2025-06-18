import { encodeFunctionData, type Address, type Hash } from 'viem';
import { ProductionPortoProvider } from './ProductionPortoProvider';
import { CrossChainMonitor, type MessageStatus } from './CrossChainMonitor';
import { 
  DEX_ROUTERS, 
  SWAP_ROUTER_ABI, 
  SOLIDLY_ROUTER_ABI, 
  SUPERCHAIN_TOKENS,
  getRouterConfig,
  getTokenAddress 
} from './DexRouters';

export interface SwapBridgeSwapParams {
  // Source chain swap
  sourceChain: number;
  sourceTokenIn: string; // Token symbol like 'USDC' or address
  sourceTokenOut: string; // What to swap to on source (usually SuperchainERC20)
  sourceAmountIn: bigint;
  sourceMinAmountOut: bigint;
  
  // Bridge parameters
  destinationChain: number;
  
  // Destination chain swap
  destTokenIn: string; // Usually same as sourceTokenOut (bridged token)
  destTokenOut: string; // Final desired token
  destMinAmountOut: bigint;
  
  // General
  recipient: Address;
  slippageTolerance: number; // 1 = 1%
  deadline?: number; // Unix timestamp
}

export interface SwapBridgeSwapResult {
  sourceSwapTx: Hash;
  bridgeTx: Hash;
  destSwapMessageHash: Hash;
  estimatedTime: number;
  operations: Array<{
    type: 'swap' | 'bridge' | 'cross-chain-swap';
    chainId: number;
    txHash?: Hash;
    messageHash?: Hash;
    status: 'pending' | 'completed' | 'failed';
  }>;
}

export class SuperchainSwapService {
  private portoProvider: ProductionPortoProvider;
  private monitor: CrossChainMonitor;

  constructor(
    portoProvider: ProductionPortoProvider,
    monitor: CrossChainMonitor
  ) {
    this.portoProvider = portoProvider;
    this.monitor = monitor;
  }

  /**
   * Execute the full swap → bridge → swap flow
   */
  async executeSwapBridgeSwap(params: SwapBridgeSwapParams): Promise<SwapBridgeSwapResult> {
    const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1800; // 30 min default
    
    // Resolve token addresses
    const sourceTokenInAddr = this.resolveTokenAddress(params.sourceTokenIn, params.sourceChain);
    const sourceTokenOutAddr = this.resolveTokenAddress(params.sourceTokenOut, params.sourceChain);
    const destTokenInAddr = this.resolveTokenAddress(params.destTokenIn, params.destinationChain);
    const destTokenOutAddr = this.resolveTokenAddress(params.destTokenOut, params.destinationChain);

    console.log('🔄 Starting Swap→Bridge→Swap Flow...');
    console.log(`   Source: ${params.sourceTokenIn} → ${params.sourceTokenOut} on Chain ${params.sourceChain}`);
    console.log(`   Bridge: Chain ${params.sourceChain} → Chain ${params.destinationChain}`);
    console.log(`   Dest: ${params.destTokenIn} → ${params.destTokenOut} on Chain ${params.destinationChain}`);

    const operations: SwapBridgeSwapResult['operations'] = [];

    try {
      // Step 1: Swap on source chain
      console.log('1️⃣ Executing source swap...');
      const sourceSwapData = this.encodeSwapData(
        params.sourceChain,
        sourceTokenInAddr,
        sourceTokenOutAddr,
        params.sourceAmountIn,
        params.sourceMinAmountOut,
        params.recipient,
        deadline
      );

      const sourceRouterConfig = getRouterConfig(params.sourceChain);
      if (!sourceRouterConfig) {
        throw new Error(`No DEX router configured for chain ${params.sourceChain}`);
      }

      const sourceSwapTx = await this.portoProvider.executeLocal(
        params.sourceChain,
        sourceRouterConfig.router,
        0n,
        sourceSwapData
      );

      operations.push({
        type: 'swap',
        chainId: params.sourceChain,
        txHash: sourceSwapTx,
        status: 'completed'
      });

      console.log(`✅ Source swap completed: ${sourceSwapTx}`);

      // Step 2: Bridge tokens to destination chain
      console.log('2️⃣ Bridging tokens...');
      const bridgeTx = await this.portoProvider.bridgeTokens(
        params.sourceChain,
        params.destinationChain,
        sourceTokenOutAddr,
        params.sourceMinAmountOut // Use minimum output from swap
      );

      operations.push({
        type: 'bridge',
        chainId: params.sourceChain,
        txHash: bridgeTx,
        status: 'completed'
      });

      console.log(`✅ Bridge initiated: ${bridgeTx}`);

      // Step 3: Execute destination swap cross-chain
      console.log('3️⃣ Preparing destination swap...');
      const destSwapData = this.encodeSwapData(
        params.destinationChain,
        destTokenInAddr,
        destTokenOutAddr,
        params.sourceMinAmountOut, // Amount received from bridge
        params.destMinAmountOut,
        params.recipient,
        deadline
      );

      const destRouterConfig = getRouterConfig(params.destinationChain);
      if (!destRouterConfig) {
        throw new Error(`No DEX router configured for chain ${params.destinationChain}`);
      }

      const destSwapResult = await this.portoProvider.executeCrossChain(
        params.sourceChain,
        params.destinationChain,
        destRouterConfig.router,
        destSwapData
      );

      operations.push({
        type: 'cross-chain-swap',
        chainId: params.destinationChain,
        txHash: destSwapResult.txHash,
        messageHash: destSwapResult.messageHash,
        status: 'pending'
      });

      console.log(`✅ Cross-chain swap initiated: ${destSwapResult.txHash}`);
      console.log(`📨 Message hash: ${destSwapResult.messageHash}`);

      return {
        sourceSwapTx,
        bridgeTx,
        destSwapMessageHash: destSwapResult.messageHash!,
        estimatedTime: 180, // 3 minutes estimated
        operations
      };

    } catch (error) {
      // Mark failed operations
      operations.forEach(op => {
        if (op.status === 'pending') op.status = 'failed';
      });

      console.error('❌ Swap-Bridge-Swap failed:', error);
      throw error;
    }
  }

  /**
   * Monitor the full flow progress
   */
  async monitorSwapBridgeSwap(result: SwapBridgeSwapResult): Promise<MessageStatus[]> {
    const statuses: MessageStatus[] = [];

    // Monitor the cross-chain destination swap
    if (result.destSwapMessageHash) {
      console.log('🔍 Monitoring cross-chain message...');
      
      try {
        const status = await this.monitor.monitorMessage(
          result.operations.find(op => op.type === 'cross-chain-swap')?.chainId || 0,
          result.destSwapMessageHash
        );
        statuses.push(status);
        
        console.log(`📊 Cross-chain swap status: ${status.status}`);
      } catch (error) {
        console.warn('⚠️ Could not monitor cross-chain message:', error);
      }
    }

    return statuses;
  }

  /**
   * Wait for the entire flow to complete
   */
  async waitForCompletion(
    result: SwapBridgeSwapResult, 
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<boolean> {
    console.log('⏳ Waiting for full flow completion...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const statuses = await this.monitorSwapBridgeSwap(result);
      
      const allCompleted = statuses.every(status => 
        status.status === 'relayed'
      );
      
      if (allCompleted) {
        console.log('🎉 Full swap-bridge-swap flow completed!');
        return true;
      }

      const anyFailed = statuses.some(status => status.status === 'failed');
      if (anyFailed) {
        console.error('❌ Flow failed during execution');
        return false;
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.warn('⏰ Flow completion timeout reached');
    return false;
  }

  /**
   * Encode swap data based on DEX type
   */
  private encodeSwapData(
    chainId: number,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOutMin: bigint,
    recipient: Address,
    deadline: number
  ): `0x${string}` {
    const routerConfig = getRouterConfig(chainId);
    
    if (!routerConfig) {
      throw new Error(`No router config for chain ${chainId}`);
    }

    switch (routerConfig.type) {
      case 'uniswap-v4':
      case 'uniswap-v3':
        return encodeFunctionData({
          abi: SWAP_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn,
            tokenOut,
            fee: 3000, // 0.3%
            recipient,
            deadline: BigInt(deadline),
            amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0n
          }]
        });

      case 'velodrome':
      case 'aerodrome':
        return encodeFunctionData({
          abi: SOLIDLY_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountIn,
            amountOutMin,
            [{
              from: tokenIn,
              to: tokenOut,
              stable: false, // Assume volatile pair
              factory: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746' // Velodrome factory
            }],
            recipient,
            BigInt(deadline)
          ]
        });

      default:
        throw new Error(`Unsupported DEX type: ${routerConfig.type}`);
    }
  }

  /**
   * Resolve token symbol to address
   */
  private resolveTokenAddress(tokenOrSymbol: string, chainId: number): Address {
    // If it's already an address, return it
    if (tokenOrSymbol.startsWith('0x')) {
      return tokenOrSymbol as Address;
    }

    // Otherwise, look up by symbol
    const address = getTokenAddress(tokenOrSymbol.toUpperCase(), chainId);
    if (!address) {
      throw new Error(`Token ${tokenOrSymbol} not found for chain ${chainId}`);
    }

    return address;
  }
} 