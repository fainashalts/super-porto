import { parseEther, encodeFunctionData } from 'viem';
import { PortoCrossChainProvider } from '../lib/PortoCrossChainProvider';
import { CrossChainMonitor, type CrossChainMonitorConfig } from '../lib/CrossChainMonitor';
import * as dotenv from 'dotenv';

dotenv.config();

// Chain configurations for Supersim
const chainA = {
  chain: {
    id: 901,
    name: 'Supersim L2 A',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['http://localhost:9545'] }
    }
  },
  rpcUrl: 'http://localhost:9545'
};

const chainB = {
  chain: {
    id: 902,
    name: 'Supersim L2 B',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['http://localhost:9546'] }
    }
  },
  rpcUrl: 'http://localhost:9546'
};

// Configure the monitor for tracking cross-chain messages
const monitorConfig: CrossChainMonitorConfig = {
  chains: [
    {
      chainId: chainA.chain.id,
      chain: chainA.chain,
      rpcUrl: chainA.rpcUrl,
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox
    },
    {
      chainId: chainB.chain.id,
      chain: chainB.chain,
      rpcUrl: chainB.rpcUrl,
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox
    }
  ],
  pollingInterval: 2000, // Poll every 2 seconds for faster demo feedback
  messageExpiry: 7 * 24 * 60 * 60 // 7 days
};

async function main() {
  console.log('🚀 Porto Cross-Chain Demo with Monitoring Starting...\n');

  // Initialize Porto provider
  const porto = new PortoCrossChainProvider(
    process.env.PRIVATE_KEY as `0x${string}`,
    process.env.PORTO_IMPL_ADDRESS_A as `0x${string}`, // Same on both chains
    [chainA, chainB]
  );

  // Initialize the message monitor
  const monitor = new CrossChainMonitor(monitorConfig);
  
  // Start real-time monitoring with callback
  console.log('🔍 Starting real-time cross-chain message monitoring...');
  monitor.startMonitoring((status) => {
    console.log(`\n📬 Cross-chain message detected!`);
    console.log(`   From Chain: ${status.identifier.chainId}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   TX Hash: ${status.txHash}`);
    console.log(`   Message Hash: ${status.messageHash.slice(0, 10)}...`);
    
    if (status.status === 'relayed') {
      console.log(`   ✅ Successfully relayed! Relay TX: ${status.relayTxHash}`);
    } else if (status.status === 'failed') {
      console.log(`   ❌ Relay failed: ${status.error}`);
    }
  });

  // Demo 1: Authorize a session key (with monitoring)
  console.log('1️⃣ Authorizing session key on Chain A...');
  const sessionKey = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // Example key
  
  const sessionKeyTx = await porto.authorizeSessionKey(chainA.chain.id, {
    key: sessionKey as `0x${string}`,
    expiry: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    canBridge: true,
    canExecute: true,
    spendLimit: parseEther('100')
  });
  console.log('✅ Session key authorized\n');

  // If this were a real transaction, we could monitor it:
  if (sessionKeyTx !== '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') {
    try {
      console.log('🔍 Monitoring session key authorization...');
      const status = await monitor.monitorMessage(chainA.chain.id, sessionKeyTx as `0x${string}`);
      console.log(`   Status: ${status.status}`);
    } catch (error) {
      console.log(`   Note: Session key authorization is simulated, no real monitoring available`);
    }
  }

  // Demo 2: Cross-chain token bridge (with monitoring)
  console.log('2️⃣ Bridging tokens from Chain A to Chain B...');
  const tokenAddress = process.env.TEST_TOKEN_ADDRESS_A as `0x${string}`;
  const bridgeAmount = parseEther('10');
  
  const bridgeTx = await porto.bridgeTokens(
    chainA.chain.id,
    chainB.chain.id,
    tokenAddress,
    bridgeAmount
  );
  console.log(`✅ Bridge transaction: ${bridgeTx}\n`);

  // Monitor the bridge transaction (simulated)
  if (bridgeTx !== '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890') {
    try {
      console.log('🔍 Monitoring bridge transaction...');
      const status = await monitor.monitorMessage(chainA.chain.id, bridgeTx as `0x${string}`);
      console.log(`   Bridge Status: ${status.status}`);
    } catch (error) {
      console.log(`   Note: Bridge transaction is simulated, no real monitoring available`);
    }
  }

  // Demo 3: Cross-chain contract call (with monitoring)
  console.log('3️⃣ Executing cross-chain contract call...');
  
  const targetContract = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Example contract
  const callData = encodeFunctionData({
    abi: [{
      name: 'setValue',
      type: 'function',
      inputs: [{ name: 'value', type: 'uint256' }],
      outputs: []
    }],
    functionName: 'setValue',
    args: [42n]
  });

  const crossChainResult = await porto.executeCrossChain(
    chainA.chain.id,
    chainB.chain.id,
    targetContract,
    callData
  );
  console.log('✅ Cross-chain call executed:', crossChainResult);

  // Demo 4: Complex cross-chain batch (with monitoring)
  console.log('\n4️⃣ Executing complex cross-chain batch...');
  
  const batchOps = [
    {
      chainId: chainB.chain.id,
      target: targetContract as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          name: 'increment',
          type: 'function',
          inputs: [],
          outputs: []
        }],
        functionName: 'increment'
      })
    },
    {
      chainId: chainA.chain.id,
      target: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
      data: encodeFunctionData({
        abi: [{
          name: 'updateState',
          type: 'function',
          inputs: [],
          outputs: []
        }],
        functionName: 'updateState'
      })
    }
  ];

  const batchResults = await porto.executeCrossChainBatch(batchOps);
  console.log('✅ Batch operations completed:', batchResults.length, 'operations');

  // Demo 5: Monitor specific transactions (if you have real transaction hashes)
  console.log('\n5️⃣ Monitoring specific transactions...');
  
  // Example: If you have real transaction hashes from actual cross-chain calls
  const realTransactions: Array<{ chainId: number; txHash: `0x${string}` }> = [
    // Add your real transaction hashes here when you send actual cross-chain messages
    // { chainId: 901, txHash: '0x...' },
    // { chainId: 902, txHash: '0x...' },
  ];

  if (realTransactions.length > 0) {
    console.log(`Checking status of ${realTransactions.length} real transactions...`);
    try {
      const statuses = await monitor.getMessagesStatus(realTransactions);
      statuses.forEach((status, index) => {
        console.log(`   Transaction ${index + 1}:`);
        console.log(`      Status: ${status.status}`);
        console.log(`      Hash: ${status.messageHash.slice(0, 10)}...`);
        if (status.relayTxHash) {
          console.log(`      Relay TX: ${status.relayTxHash}`);
        }
      });
    } catch (error) {
      console.error('Error checking transaction statuses:', error);
    }
  } else {
    console.log('   No real transactions to monitor (add transaction hashes to see monitoring in action)');
  }

  // Demo 6: Wait for relay example (commented out to avoid hanging on simulated transactions)
  console.log('\n6️⃣ Wait for relay example...');
  console.log('   (Commented out to avoid hanging on simulated transactions)');
  /*
  if (realTransactions.length > 0) {
    try {
      console.log('   Waiting for first transaction to be relayed...');
      const relayResult = await monitor.waitForRelay(
        realTransactions[0].chainId, 
        realTransactions[0].txHash, 
        30000 // 30 second timeout
      );
      console.log(`   ✅ Transaction relayed with status: ${relayResult.status}`);
    } catch (error) {
      console.log(`   ⏰ Timeout or error: ${error}`);
    }
  }
  */

  console.log('\n✨ Demo completed successfully!');
  console.log('\n💡 Tips for using with real transactions:');
  console.log('   1. Replace simulated transactions with real cross-chain calls');
  console.log('   2. Add real transaction hashes to the realTransactions array');
  console.log('   3. The monitor will automatically detect and track your messages');
  console.log('   4. Use monitor.waitForRelay() to wait for specific messages');
  console.log('   5. Real-time monitoring will show live cross-chain activity');

  // Keep monitoring for a bit to show real-time capabilities
  console.log('\n🔄 Monitoring will continue for 30 seconds to show real-time capabilities...');
  setTimeout(() => {
    console.log('\n🛑 Stopping monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  }, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Run the demo
main().catch(console.error);