import { parseEther, formatEther } from 'viem';
import { ProductionPortoProvider } from '../lib/ProductionPortoProvider';
import { CrossChainMonitor, type CrossChainMonitorConfig } from '../lib/CrossChainMonitor';
import { SuperchainSwapService, type SwapBridgeSwapParams } from '../lib/SuperchainSwapService';
import { optimism, base } from 'viem/chains';
import { worldchain } from '../lib/chains';
// Load environment variables
if (typeof process !== 'undefined' && process.env) {
  // Running in Node.js environment
}

// Chain configurations
const CHAINS = [
  { chain: optimism, rpcUrl: 'https://mainnet.optimism.io' },
  { chain: base, rpcUrl: 'https://mainnet.base.org' },
  { chain: worldchain, rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public' }
];

const MONITOR_CONFIG: CrossChainMonitorConfig = {
  chains: CHAINS.map(({ chain, rpcUrl }) => ({
    chainId: chain.id,
    chain,
    rpcUrl,
    messengerAddress: '0x4200000000000000000000000000000000000023',
    inboxAddress: '0x4200000000000000000000000000000000000022'
  })),
  pollingInterval: 3000,
  messageExpiry: 7 * 24 * 60 * 60
};

async function main() {
  console.log('🌉 Superchain Swap→Bridge→Swap Demo');
  console.log('=====================================\n');

  // Check prerequisites
  if (!process.env.PRIVATE_KEY || !process.env.PORTO_IMPLEMENTATION_ADDRESS) {
    console.error('❌ Missing required environment variables:');
    console.error('   - PRIVATE_KEY');
    console.error('   - PORTO_IMPLEMENTATION_ADDRESS');
    return;
  }

  // Initialize services
  console.log('🔧 Initializing services...');
  
  const portoProvider = new ProductionPortoProvider(
    process.env.PRIVATE_KEY as `0x${string}`,
    process.env.PORTO_IMPLEMENTATION_ADDRESS as `0x${string}`,
    CHAINS
  );

  const monitor = new CrossChainMonitor(MONITOR_CONFIG);
  const swapService = new SuperchainSwapService(portoProvider, monitor);

  console.log('✅ Services initialized\n');

  // Demo scenarios
  const scenarios = [
    {
      name: 'USDC → WETH on OP, Bridge to Base, WETH → USDC',
      description: 'Swap USDC to WETH on Optimism, bridge WETH to Base, then swap back to USDC',
      params: {
        sourceChain: 10, // Optimism
        sourceTokenIn: 'USDC',
        sourceTokenOut: 'WETH',
        sourceAmountIn: parseEther('1000'), // 1000 USDC (assuming 18 decimals for demo)
        sourceMinAmountOut: parseEther('0.35'), // ~0.35 WETH expected
        
        destinationChain: 8453, // Base
        destTokenIn: 'WETH',
        destTokenOut: 'USDC', 
        destMinAmountOut: parseEther('950'), // Expect 950+ USDC after slippage
        
        recipient: '0x742d35Cc6644C4532B0f2e7F1e5F1b8b0F0e0e0e' as const, // Your address
        slippageTolerance: 2 // 2%
      } as SwapBridgeSwapParams
    },
    {
      name: 'World Chain WLD → USDC → Bridge → Base USDC → ETH',
      description: 'Complex multi-hop: WLD→USDC on World Chain, bridge to Base, USDC→ETH',
      params: {
        sourceChain: 480, // World Chain
        sourceTokenIn: 'WLD',
        sourceTokenOut: 'USDC',
        sourceAmountIn: parseEther('500'), // 500 WLD
        sourceMinAmountOut: parseEther('400'), // ~400 USDC expected
        
        destinationChain: 8453, // Base
        destTokenIn: 'USDC',
        destTokenOut: 'WETH',
        destMinAmountOut: parseEther('0.15'), // ~0.15 ETH expected
        
        recipient: '0x742d35Cc6644C4532B0f2e7F1e5F1b8b0F0e0e0e' as const,
        slippageTolerance: 3 // 3% for more volatile tokens
      } as SwapBridgeSwapParams
    }
  ];

  // Execute demo scenarios
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n🎯 Scenario ${i + 1}: ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);

    try {
      // Execute the swap-bridge-swap flow
      const result = await swapService.executeSwapBridgeSwap(scenario.params);
      
      console.log('📊 Flow Results:');
      console.log(`   Source Swap TX: ${result.sourceSwapTx}`);
      console.log(`   Bridge TX: ${result.bridgeTx}`);
      console.log(`   Dest Swap Message: ${result.destSwapMessageHash}`);
      console.log(`   Estimated Time: ${result.estimatedTime}s\n`);

      // Monitor progress
      console.log('🔍 Monitoring flow progress...');
      await swapService.monitorSwapBridgeSwap(result);

      // Wait for completion (with timeout)
      console.log('⏳ Waiting for completion...');
      const completed = await swapService.waitForCompletion(result, 300000); // 5 min timeout
      
      if (completed) {
        console.log('🎉 Flow completed successfully!\n');
      } else {
        console.log('⏰ Flow did not complete within timeout\n');
      }

      // Show operation breakdown
      console.log('📋 Operation Breakdown:');
      result.operations.forEach((op, idx) => {
        console.log(`   ${idx + 1}. ${op.type.toUpperCase()} on Chain ${op.chainId}`);
        console.log(`      Status: ${op.status}`);
        if (op.txHash) console.log(`      TX: ${op.txHash}`);
        if (op.messageHash) console.log(`      Message: ${op.messageHash}`);
      });

    } catch (error) {
      console.error(`❌ Scenario ${i + 1} failed:`, error);
    }

    // Wait between scenarios
    if (i < scenarios.length - 1) {
      console.log('\n⏸️ Waiting 30s before next scenario...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  console.log('\n🏁 Demo completed!');
  
  // Advanced scenario: Batch operations
  console.log('\n🚀 Advanced: Batch Cross-Chain Operations');
  console.log('==========================================');
  
  try {
    // Demonstrate multiple parallel operations
    const batchParams: SwapBridgeSwapParams[] = [
      {
        sourceChain: 10,
        sourceTokenIn: 'USDC',
        sourceTokenOut: 'WETH',
        sourceAmountIn: parseEther('500'),
        sourceMinAmountOut: parseEther('0.18'),
        destinationChain: 8453,
        destTokenIn: 'WETH',
        destTokenOut: 'USDC',
        destMinAmountOut: parseEther('480'),
        recipient: '0x742d35Cc6644C4532B0f2e7F1e5F1b8b0F0e0e0e' as const,
        slippageTolerance: 2
      },
      {
        sourceChain: 8453,
        sourceTokenIn: 'USDC', 
        sourceTokenOut: 'WETH',
        sourceAmountIn: parseEther('300'),
        sourceMinAmountOut: parseEther('0.11'),
        destinationChain: 10,
        destTokenIn: 'WETH',
        destTokenOut: 'USDC',
        destMinAmountOut: parseEther('290'),
        recipient: '0x742d35Cc6644C4532B0f2e7F1e5F1b8b0F0e0e0e' as const,
        slippageTolerance: 2
      }
    ];

    console.log('📡 Executing parallel cross-chain swaps...');
    
    const batchResults = await Promise.allSettled(
      batchParams.map(params => swapService.executeSwapBridgeSwap(params))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Batch operation ${idx + 1} initiated successfully`);
        console.log(`   Message Hash: ${result.value.destSwapMessageHash}`);
      } else {
        console.log(`❌ Batch operation ${idx + 1} failed:`, result.reason);
      }
    });

  } catch (error) {
    console.error('❌ Batch operations failed:', error);
  }

  console.log('\n🎊 All demos completed! Check your transactions on the respective block explorers.');
}

// Error handling
main().catch(error => {
  console.error('💥 Demo failed:', error);
  process.exit(1);
});

export { main as swapBridgeSwapDemo }; 