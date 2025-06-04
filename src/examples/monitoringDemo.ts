import { CrossChainMonitor, type CrossChainMonitorConfig } from '../lib/CrossChainMonitor';
import { optimism, base } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Define the monitoring configuration
const monitorConfig: CrossChainMonitorConfig = {
  chains: [
    {
      chainId: 901,
      chain: {
        id: 901,
        name: 'Supersim L2 A',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: ['http://localhost:9545'] }
        }
      },
      rpcUrl: 'http://localhost:9545',
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox
    },
    {
      chainId: 902,
      chain: {
        id: 902,
        name: 'Supersim L2 B',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: ['http://localhost:9546'] }
        }
      },
      rpcUrl: 'http://localhost:9546',
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox
    }
  ],
  pollingInterval: 3000, // Poll every 3 seconds
  messageExpiry: 7 * 24 * 60 * 60 // 7 days
};

async function main() {
  console.log('🔍 Cross-Chain Message Monitor Demo\n');
  
  // Initialize the monitor
  const monitor = new CrossChainMonitor(monitorConfig);
  
  // Example 1: Monitor a specific transaction
  console.log('📋 Example 1: Monitor a specific cross-chain message');
  
  // Replace with actual transaction hash from your cross-chain transaction
  const exampleTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const sourceChainId = 901;
  
  try {
    console.log(`   Monitoring transaction: ${exampleTxHash}`);
    console.log(`   Source chain: ${sourceChainId}`);
    
    const status = await monitor.monitorMessage(sourceChainId, exampleTxHash);
    
    console.log('   ✅ Message Status:');
    console.log(`      Hash: ${status.messageHash}`);
    console.log(`      Status: ${status.status}`);
    console.log(`      Source TX: ${status.txHash}`);
    if (status.relayTxHash) {
      console.log(`      Relay TX: ${status.relayTxHash}`);
    }
    if (status.error) {
      console.log(`      Error: ${status.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error monitoring message: ${error}`);
  }
  
  console.log('\n📡 Example 2: Start real-time monitoring');
  
  // Example 2: Start real-time monitoring with callback
  monitor.startMonitoring((status) => {
    console.log(`   🔔 New cross-chain message detected!`);
    console.log(`      From Chain: ${status.identifier.chainId}`);
    console.log(`      Message Hash: ${status.messageHash}`);
    console.log(`      Status: ${status.status}`);
    console.log(`      TX Hash: ${status.txHash}`);
    
    if (status.status === 'relayed') {
      console.log(`      ✅ Message successfully relayed!`);
      console.log(`      Relay TX: ${status.relayTxHash}`);
    } else if (status.status === 'failed') {
      console.log(`      ❌ Message relay failed: ${status.error}`);
    }
    console.log('   ---');
  });
  
  console.log('   Real-time monitoring started...');
  console.log('   Monitoring for cross-chain messages on all configured chains');
  console.log('   Press Ctrl+C to stop monitoring\n');
  
  // Example 3: Batch monitoring
  console.log('📊 Example 3: Batch status check');
  
  const messagesToCheck = [
    { chainId: 901, txHash: '0xabcd1234...' as `0x${string}` },
    { chainId: 902, txHash: '0xefgh5678...' as `0x${string}` },
  ];
  
  try {
    const statuses = await monitor.getMessagesStatus(messagesToCheck);
    console.log(`   Checked ${statuses.length} messages:`);
    
    statuses.forEach((status, index) => {
      console.log(`   Message ${index + 1}:`);
      console.log(`      Status: ${status.status}`);
      console.log(`      Hash: ${status.messageHash}`);
    });
  } catch (error) {
    console.log(`   Error in batch monitoring: ${error}`);
  }
  
  // Example 4: Wait for relay with timeout
  console.log('\n⏱️  Example 4: Wait for message relay');
  
  try {
    // This would wait for a specific message to be relayed
    // const relayResult = await monitor.waitForRelay(sourceChainId, exampleTxHash, 30000); // 30 second timeout
    // console.log('   ✅ Message relayed:', relayResult.status);
    console.log('   (Skipped - would wait for real transaction)');
  } catch (error) {
    console.log(`   Timeout or error waiting for relay: ${error}`);
  }
  
  // Keep monitoring running until interrupted
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  // Keep the process alive for monitoring
  await new Promise(() => {}); // Run indefinitely
}

// Utility function to demonstrate message tracking workflow
async function demonstrateFullWorkflow() {
  console.log('\n🔄 Full Cross-Chain Message Workflow Demo');
  console.log('This would typically involve:');
  console.log('1. 📤 Send cross-chain message on source chain');
  console.log('2. 🔍 Monitor for SentMessage event');
  console.log('3. ⏳ Wait for message to be posted to destination inbox');
  console.log('4. 🚀 Relay message on destination chain');
  console.log('5. ✅ Confirm successful execution');
  console.log('6. 📊 Track entire lifecycle');
}

// Run the demo
main().catch((error) => {
  console.error('Demo error:', error);
  process.exit(1);
}); 