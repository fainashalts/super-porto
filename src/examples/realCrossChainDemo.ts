import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther, 
  encodeFunctionData,
  type Address,
  getContract
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CrossChainMonitor, type CrossChainMonitorConfig } from '../lib/CrossChainMonitor';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Chain configurations for Supersim
const chainA = {
  id: 901,
  name: 'Supersim L2 A',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:9545'] }
  }
};

const chainB = {
  id: 902,
  name: 'Supersim L2 B', 
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:9546'] }
  }
};

// L2ToL2CrossDomainMessenger ABI (minimal)
const L2ToL2MessengerABI = [
  {
    type: 'function',
    name: 'sendMessage',
    inputs: [
      { name: '_destination', type: 'uint256' },
      { name: '_target', type: 'address' },
      { name: '_message', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'SentMessage',
    inputs: [
      { name: 'destination', type: 'uint256', indexed: true },
      { name: 'target', type: 'address', indexed: true },
      { name: 'nonce', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: false },
      { name: 'message', type: 'bytes', indexed: false }
    ],
    anonymous: false
  }
] as const;

// Load compiled contract data
let SimpleGreeterABI: any;
let SimpleGreeterBytecode: string;

try {
  SimpleGreeterABI = JSON.parse(fs.readFileSync('./src/contracts/SimpleGreeter.abi.json', 'utf8'));
  SimpleGreeterBytecode = fs.readFileSync('./src/contracts/SimpleGreeter.bytecode.json', 'utf8').trim();
  console.log('✅ Contract files loaded successfully');
} catch (error) {
  console.error('❌ Failed to load contract files. Please run: forge build --contracts src/contracts/SimpleGreeter.sol');
  process.exit(1);
}

// Configure the monitor
const monitorConfig: CrossChainMonitorConfig = {
  chains: [
    {
      chainId: chainA.id,
      chain: chainA,
      rpcUrl: 'http://localhost:9545',
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox  
    },
    {
      chainId: chainB.id,
      chain: chainB,
      rpcUrl: 'http://localhost:9546',
      messengerAddress: '0x4200000000000000000000000000000000000023', // L2ToL2CrossDomainMessenger
      inboxAddress: '0x4200000000000000000000000000000000000022'      // CrossL2Inbox
    }
  ],
  pollingInterval: 1000, // Poll every second for immediate feedback
};

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in .env file');
    return false;
  }
  
  // Check if Supersim is running
  try {
    const clientA = createPublicClient({
      chain: chainA,
      transport: http('http://localhost:9545')
    });
    
    const clientB = createPublicClient({
      chain: chainB,
      transport: http('http://localhost:9546')
    });
    
    const [blockA, blockB] = await Promise.all([
      clientA.getBlockNumber(),
      clientB.getBlockNumber()
    ]);
    
    console.log(`✅ Chain A (${chainA.id}) connected - Block: ${blockA}`);
    console.log(`✅ Chain B (${chainB.id}) connected - Block: ${blockB}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supersim chains');
    console.error('💡 Make sure Supersim is running: ./supersim --interop.autorelay');
    return false;
  }
}

async function main() {
  console.log('🚀 Real Cross-Chain Demo with Live Monitoring\n');

  // Check prerequisites first
  if (!await checkPrerequisites()) {
    process.exit(1);
  }

  // Set up account and clients
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const clientA = createWalletClient({
    account,
    chain: chainA,
    transport: http('http://localhost:9545')
  });
  
  const clientB = createWalletClient({
    account,
    chain: chainB,
    transport: http('http://localhost:9546')
  });

  const publicClientA = createPublicClient({
    chain: chainA,
    transport: http('http://localhost:9545')
  });

  const publicClientB = createPublicClient({
    chain: chainB,
    transport: http('http://localhost:9546')
  });

  // Initialize the monitor
  const monitor = new CrossChainMonitor(monitorConfig);
  
  // Track all detected messages
  const detectedMessages: Array<{ txHash: string; chainId: number; timestamp: number }> = [];
  
  // Start monitoring with detailed callback
  console.log('🔍 Starting live cross-chain message monitoring...');
  monitor.startMonitoring((status) => {
    console.log(`\n🔔 LIVE: Cross-chain message detected!`);
    console.log(`   📍 Source Chain: ${status.identifier.chainId}`);
    console.log(`   📝 Status: ${status.status}`);
    console.log(`   🔗 TX Hash: ${status.txHash}`);
    console.log(`   🏷️  Message Hash: ${status.messageHash.slice(0, 12)}...`);
    console.log(`   ⏰ Block: ${status.identifier.blockNumber}`);
    
    if (status.status === 'relayed') {
      console.log(`   ✅ Successfully relayed! Relay TX: ${status.relayTxHash}`);
    } else if (status.status === 'failed') {
      console.log(`   ❌ Relay failed: ${status.error}`);
    } else {
      console.log(`   ⏳ Waiting for relay on chain ${status.identifier.chainId}...`);
    }
    
    // Track this message
    detectedMessages.push({
      txHash: status.txHash,
      chainId: Number(status.identifier.chainId),
      timestamp: Date.now()
    });
  });

  console.log('✅ Monitor started - will detect real cross-chain messages\n');

  try {
    // Demo 1: Deploy a simple target contract on Chain B
    console.log('1️⃣ Deploying SimpleGreeter contract on Chain B...');
    
    const deployTx = await clientB.deployContract({
      abi: SimpleGreeterABI,
      bytecode: SimpleGreeterBytecode as `0x${string}`,
      args: []
    });
    
    console.log(`   ✅ Target contract deployment TX: ${deployTx}`);
    
    // Wait for deployment and get contract address
    const receipt = await publicClientB.waitForTransactionReceipt({ hash: deployTx });
    const targetContractAddress = receipt.contractAddress!;
    console.log(`   📍 Target contract deployed at: ${targetContractAddress}`);
    
    // Verify contract deployment
    const greeterContract = getContract({
      address: targetContractAddress,
      abi: SimpleGreeterABI,
      client: publicClientB
    });
    
    const initialGreeting = await greeterContract.read.greeting([]);
    console.log(`   📝 Initial greeting: "${initialGreeting}"\n`);

    // Demo 2: Send a real cross-chain message
    console.log('2️⃣ Sending REAL cross-chain message from Chain A to Chain B...');
    
    // Create the message to send (calling setGreeting on the target contract)
    const greetingMessage = encodeFunctionData({
      abi: SimpleGreeterABI,
      functionName: 'setGreeting',
      args: ['Hello from Chain A! 🚀']
    });

    // Get the L2ToL2CrossDomainMessenger contract
    const messengerContract = getContract({
      address: '0x4200000000000000000000000000000000000023',
      abi: L2ToL2MessengerABI,
      client: clientA
    });

    console.log('   📡 Sending cross-chain message...');
    console.log(`   🎯 Target: ${targetContractAddress}`);
    console.log(`   📝 Message: setGreeting("Hello from Chain A! 🚀")`);
    
    // Send the actual cross-chain message
    const crossChainTx = await messengerContract.write.sendMessage([
      BigInt(chainB.id), // destination chain
      targetContractAddress, // target contract
      greetingMessage // encoded function call
    ]);

    console.log(`   ✅ Cross-chain transaction sent: ${crossChainTx}`);
    console.log('   ⏳ Waiting for transaction to be mined...');
    
    // Wait for the transaction to be mined
    const crossChainReceipt = await publicClientA.waitForTransactionReceipt({ 
      hash: crossChainTx 
    });
    
    console.log(`   ✅ Transaction mined in block ${crossChainReceipt.blockNumber}`);
    console.log('   🔍 Monitor should detect this message momentarily...\n');

    // Demo 3: Monitor this specific transaction
    console.log('3️⃣ Monitoring the specific transaction we just sent...');
    
    try {
      const status = await monitor.monitorMessage(chainA.id, crossChainTx);
      console.log('   📊 Detailed Status:');
      console.log(`      🔗 TX Hash: ${status.txHash}`);
      console.log(`      🏷️  Message Hash: ${status.messageHash}`);
      console.log(`      📍 Block: ${status.identifier.blockNumber}`);
      console.log(`      ⏰ Timestamp: ${new Date(status.timestamp).toLocaleTimeString()}`);
      console.log(`      📊 Status: ${status.status}`);
      
      if (status.relayTxHash) {
        console.log(`      🔄 Relay TX: ${status.relayTxHash}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Specific monitoring failed (message may still be detected by real-time monitor): ${error}`);
    }

    // Demo 4: Wait and show real-time detection
    console.log('\n4️⃣ Waiting to see real-time monitoring in action...');
    console.log('   🔄 The monitor is now actively watching for our message...');
    console.log('   💡 You should see a "LIVE: Cross-chain message detected!" notification above');
    
    // Wait a bit to see the monitoring in action
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Demo 5: Show all detected messages
    console.log('\n5️⃣ Summary of detected messages:');
    if (detectedMessages.length > 0) {
      detectedMessages.forEach((msg, index) => {
        console.log(`   📬 Message ${index + 1}:`);
        console.log(`      Chain: ${msg.chainId}`);
        console.log(`      TX: ${msg.txHash}`);
        console.log(`      Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
      });
    } else {
      console.log('   📭 No messages detected yet (monitor may need more time)');
      console.log('   💡 This is normal - cross-chain messages take time to be processed');
    }

    // Demo 6: Send another message to see real-time detection
    console.log('\n6️⃣ Sending a second message to see real-time detection...');
    
    const secondMessage = encodeFunctionData({
      abi: SimpleGreeterABI,
      functionName: 'setGreeting',
      args: ['Second message from Chain A! 🎯']
    });

    const secondTx = await messengerContract.write.sendMessage([
      BigInt(chainB.id),
      targetContractAddress,
      secondMessage
    ]);

    console.log(`   ✅ Second message sent: ${secondTx}`);
    console.log('   👀 Watch for real-time detection above!');
    
    // Wait to see the second message detected
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Demo 7: Check if greeting was updated (in a real cross-chain scenario, this would take time)
    console.log('\n7️⃣ Checking contract state...');
    try {
      const currentGreeting = await greeterContract.read.greeting([]);
      console.log(`   📝 Current greeting: "${currentGreeting}"`);
      if (currentGreeting !== initialGreeting) {
        console.log('   ✅ Cross-chain message was successfully relayed!');
      } else {
        console.log('   ⏳ Cross-chain message may still be in transit (this is normal)');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check contract state: ${error}`);
    }

  } catch (error) {
    console.error('❌ Error in demo:', error);
    console.log('\n💡 Troubleshooting steps:');
    console.log('   1. Make sure Supersim is running: ./supersim --interop.autorelay');
    console.log('   2. Check that your PRIVATE_KEY is set in .env');
    console.log('   3. Ensure the account has funds on both chains');
    console.log('   4. Try restarting Supersim if issues persist');
  }

  // Keep monitoring for a bit longer
  console.log('\n🔄 Monitoring will continue for 30 more seconds...');
  console.log('💡 Try sending cross-chain messages from other tools to see them detected!');
  
  setTimeout(() => {
    console.log('\n📊 Final Summary:');
    console.log(`   Total messages detected: ${detectedMessages.length}`);
    if (detectedMessages.length > 0) {
      console.log('   🎉 Success! Real-time monitoring is working!');
    } else {
      console.log('   📝 Note: Cross-chain messages may take time to be detected');
      console.log('        This is normal behavior in development environments');
    }
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
main().catch((error) => {
  console.error('❌ Demo failed:', error);
  console.log('\n💡 Please check the troubleshooting steps above');
  process.exit(1);
}); 