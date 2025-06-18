import { parseEther } from 'viem';
import { ProductionPortoProvider } from '../lib/ProductionPortoProvider';
import { CrossChainMonitor, type CrossChainMonitorConfig } from '../lib/CrossChainMonitor';
import { SuperchainSwapService, type SwapBridgeSwapParams } from '../lib/SuperchainSwapService';
import * as dotenv from 'dotenv';

dotenv.config();

// Supersim chain configurations
const SUPERSIM_CHAINS = [
  { 
    chain: {
      id: 901,
      name: 'Supersim L2 A',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['http://localhost:9545'] } }
    }, 
    rpcUrl: 'http://localhost:9545' 
  },
  { 
    chain: {
      id: 902,
      name: 'Supersim L2 B',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['http://localhost:9546'] } }
    }, 
    rpcUrl: 'http://localhost:9546' 
  }
];

const MONITOR_CONFIG: CrossChainMonitorConfig = {
  chains: SUPERSIM_CHAINS.map(({ chain, rpcUrl }) => ({
    chainId: chain.id,
    chain,
    rpcUrl,
    messengerAddress: '0x4200000000000000000000000000000000000023',
    inboxAddress: '0x4200000000000000000000000000000000000022'
  })),
  pollingInterval: 2000, // Faster polling for local testing
  messageExpiry: 7 * 24 * 60 * 60
};

async function main() {
  console.log('🌉 Supersim Swap→Bridge→Swap Demo');
  console.log('==================================\n');

  // Check prerequisites
  if (!process.env.PRIVATE_KEY || !process.env.PORTO_IMPLEMENTATION_ADDRESS) {
    console.error('❌ Missing required environment variables:');
    console.error('   - PRIVATE_KEY');
    console.error('   - PORTO_IMPLEMENTATION_ADDRESS');
    console.error('\n💡 Run: npm run deploy:supersim first');
    return;
  }

  // Initialize services
  console.log('🔧 Initializing services...');
  
  const portoProvider = new ProductionPortoProvider(
    process.env.PRIVATE_KEY as `0x${string}`,
    process.env.PORTO_IMPLEMENTATION_ADDRESS as `0x${string}`,
    SUPERSIM_CHAINS
  );

  const monitor = new CrossChainMonitor(MONITOR_CONFIG);
  const swapService = new SuperchainSwapService(portoProvider, monitor);

  console.log('✅ Services initialized');
  console.log(`📍 Porto Implementation: ${process.env.PORTO_IMPLEMENTATION_ADDRESS}`);
  console.log(`🔗 Chain A: http://localhost:9545 (ID: 901)`);
  console.log(`🔗 Chain B: http://localhost:9546 (ID: 902)\n`);

  // Demo scenarios for Supersim
  const scenarios = [
    {
      name: 'Supersim Chain A → Chain B Cross-Chain Flow',
      description: 'Simulate token swap on Chain A, bridge to Chain B, then swap on Chain B',
      params: {
        sourceChain: 901, // Supersim L2 A
        sourceTokenIn: '0x0000000000000000000000000000000000000001', // Mock token A
        sourceTokenOut: '0x0000000000000000000000000000000000000002', // Mock token B (bridgeable)
        sourceAmountIn: parseEther('100'), // 100 tokens
        sourceMinAmountOut: parseEther('95'), // 95 tokens expected
        
        destinationChain: 902, // Supersim L2 B
        destTokenIn: '0x0000000000000000000000000000000000000002', // Same token (bridged)
        destTokenOut: '0x0000000000000000000000000000000000000003', // Mock token C
        destMinAmountOut: parseEther('90'), // 90 tokens expected after second swap
        
        recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const, // Default Supersim address
        slippageTolerance: 5 // 5% for testing
      } as SwapBridgeSwapParams
    }
  ];

  // Execute demo scenarios
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`🎯 Scenario ${i + 1}: ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);

    try {
      console.log('📊 Scenario Parameters:');
      console.log(`   Source Chain: ${scenario.params.sourceChain}`);
      console.log(`   Destination Chain: ${scenario.params.destinationChain}`);
      console.log(`   Amount In: ${scenario.params.sourceAmountIn.toString()} wei`);
      console.log(`   Recipient: ${scenario.params.recipient}\n`);

      // Execute the swap-bridge-swap flow
      console.log('🚀 Executing cross-chain flow...');
      const result = await swapService.executeSwapBridgeSwap(scenario.params);
      
      console.log('\n📋 Flow Results:');
      console.log(`   Source Swap TX: ${result.sourceSwapTx}`);
      console.log(`   Bridge TX: ${result.bridgeTx}`);
      console.log(`   Dest Swap Message: ${result.destSwapMessageHash}`);
      console.log(`   Estimated Time: ${result.estimatedTime}s\n`);

      // Show operation breakdown
      console.log('📊 Operation Breakdown:');
      result.operations.forEach((op, idx) => {
        console.log(`   ${idx + 1}. ${op.type.toUpperCase()} on Chain ${op.chainId}`);
        console.log(`      Status: ${op.status}`);
        if (op.txHash) console.log(`      TX: ${op.txHash}`);
        if (op.messageHash) console.log(`      Message: ${op.messageHash}`);
      });

      // Monitor progress (simulated for demo)
      console.log('\n🔍 Monitoring flow progress...');
      await swapService.monitorSwapBridgeSwap(result);

      console.log('✅ Demo flow completed!\n');

    } catch (error) {
      console.error(`❌ Scenario ${i + 1} failed:`, error);
    }
  }

  console.log('🏁 Supersim demo completed!');
  
  // Show what would happen in a real scenario
  console.log('\n💡 In a real scenario, this would:');
  console.log('   1. Execute actual DEX swaps on source chain');
  console.log('   2. Bridge tokens via SuperchainERC20');
  console.log('   3. Execute cross-chain message to trigger destination swap');
  console.log('   4. Monitor real transaction lifecycle');
  console.log('   5. Provide real-time status updates');
  
  console.log('\n🚀 To test with real networks:');
  console.log('   1. Deploy to testnets: npm run deploy');
  console.log('   2. Run production demo: npm run swap-bridge-swap');
}

// Error handling
main().catch(error => {
  console.error('💥 Demo failed:', error);
  process.exit(1);
});

export { main as swapBridgeSwapSupersimDemo }; 