import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism, base } from 'viem/chains';
import { worldchain } from '../lib/chains';
import * as fs from 'fs';
import PortoCrossChainAccountABI from '../contracts/PortoCrossChainAccount.abi.json';
import PortoBytecode from '../contracts/PortoCrossChainAccount.bytecode.json';

// Production chain configurations
const PRODUCTION_CHAINS = [
  { 
    chain: optimism, 
    rpcUrl: 'https://mainnet.optimism.io',
    name: 'Optimism Mainnet'
  },
  { 
    chain: base, 
    rpcUrl: 'https://mainnet.base.org',
    name: 'Base Mainnet'
  },
  { 
    chain: worldchain, 
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
    name: 'World Chain Mainnet'
  }
];

// Testnet configurations (cheaper for testing)
const TESTNET_CHAINS = [
  { 
    chain: { ...optimism, id: 11155420 }, // OP Sepolia
    rpcUrl: 'https://sepolia.optimism.io',
    name: 'Optimism Sepolia'
  },
  { 
    chain: { ...base, id: 84532 }, // Base Sepolia
    rpcUrl: 'https://sepolia.base.org',
    name: 'Base Sepolia'
  }
];

async function deployPortoImplementation(useTestnet: boolean = true) {
  console.log('🚀 Porto Implementation Deployment Script');
  console.log('=========================================\n');

  // Check prerequisites
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in .env file');
    console.error('💡 Add your private key: echo "PRIVATE_KEY=0x..." >> .env');
    return;
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const chains = useTestnet ? TESTNET_CHAINS : PRODUCTION_CHAINS;
  
  console.log(`📍 Deploying to ${useTestnet ? 'TESTNET' : 'MAINNET'} chains`);
  console.log(`👤 Deployer: ${account.address}\n`);

  const deploymentResults: Array<{
    chainName: string;
    chainId: number;
    implementationAddress: string;
    txHash: string;
    gasUsed: string;
  }> = [];

  // Deploy to each chain
  for (const { chain, rpcUrl, name } of chains) {
    console.log(`🔨 Deploying to ${name} (Chain ID: ${chain.id})...`);
    
    try {
      // Create clients
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
      });

      // Check balance
      const balance = await publicClient.getBalance({ address: account.address });
      const balanceEth = Number(balance) / 1e18;
      
      if (balanceEth < 0.01) {
        console.warn(`⚠️  Low balance on ${name}: ${balanceEth.toFixed(4)} ETH`);
        console.warn(`   Consider adding more ETH to ${account.address}`);
      }

      console.log(`   💰 Balance: ${balanceEth.toFixed(4)} ETH`);

      // Deploy the contract
      console.log('   📡 Deploying contract...');
      const deployTx = await walletClient.deployContract({
        abi: PortoCrossChainAccountABI,
        bytecode: PortoBytecode.bytecode as `0x${string}`,
        args: []
      });

      console.log(`   ⏳ Transaction sent: ${deployTx}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: deployTx,
        timeout: 60000 // 1 minute timeout
      });

      if (receipt.status === 'success' && receipt.contractAddress) {
        const gasUsed = (Number(receipt.gasUsed) * Number(receipt.effectiveGasPrice || 0n)) / 1e18;
        
        console.log(`   ✅ Deployed successfully!`);
        console.log(`   📍 Contract Address: ${receipt.contractAddress}`);
        console.log(`   ⛽ Gas Used: ${gasUsed.toFixed(6)} ETH`);
        console.log(`   🔗 Explorer: ${chain.blockExplorers?.default.url}/address/${receipt.contractAddress}\n`);

        deploymentResults.push({
          chainName: name,
          chainId: chain.id,
          implementationAddress: receipt.contractAddress,
          txHash: deployTx,
          gasUsed: gasUsed.toFixed(6)
        });
      } else {
        console.error(`   ❌ Deployment failed on ${name}`);
      }

    } catch (error) {
      console.error(`   ❌ Error deploying to ${name}:`, error);
    }
  }

  // Generate summary
  console.log('\n📋 Deployment Summary');
  console.log('=====================');
  
  if (deploymentResults.length === 0) {
    console.log('❌ No successful deployments');
    return;
  }

  // Check if all addresses are the same (deterministic deployment)
  const addresses = deploymentResults.map(r => r.implementationAddress);
  const allSameAddress = addresses.every(addr => addr === addresses[0]);

  if (allSameAddress) {
    console.log(`🎉 SUCCESS: Same address across all chains!`);
    console.log(`📍 Porto Implementation Address: ${addresses[0]}\n`);
  } else {
    console.log(`⚠️  Different addresses across chains (non-deterministic deployment)\n`);
  }

  // Print results table
  deploymentResults.forEach(result => {
    console.log(`${result.chainName}:`);
    console.log(`  Address: ${result.implementationAddress}`);
    console.log(`  TX Hash: ${result.txHash}`);
    console.log(`  Gas Cost: ${result.gasUsed} ETH`);
    console.log('');
  });

  // Update .env file
  if (allSameAddress) {
    const envUpdate = `PORTO_IMPLEMENTATION_ADDRESS=${addresses[0]}`;
    
    try {
      // Read existing .env
      let envContent = '';
      try {
        envContent = fs.readFileSync('.env', 'utf8');
      } catch {
        // .env doesn't exist, will create new
      }

      // Update or add the implementation address
      const lines = envContent.split('\n');
      const existingIndex = lines.findIndex(line => line.startsWith('PORTO_IMPLEMENTATION_ADDRESS='));
      
      if (existingIndex >= 0) {
        lines[existingIndex] = envUpdate;
      } else {
        lines.push(envUpdate);
      }

      // Write back to .env
      fs.writeFileSync('.env', lines.join('\n'));
      console.log('✅ Updated .env file with PORTO_IMPLEMENTATION_ADDRESS');
      
    } catch (error) {
      console.warn('⚠️  Could not update .env file:', error);
      console.log(`💡 Manually add to .env: ${envUpdate}`);
    }
  }

  console.log('\n🎊 Deployment completed!');
  console.log('💡 You can now run: npm run swap-bridge-swap');
}

// CLI interface
const args = process.argv.slice(2);
const useTestnet = !args.includes('--mainnet');

if (args.includes('--help')) {
  console.log('Usage: npm run deploy [--mainnet]');
  console.log('  --mainnet: Deploy to mainnet (default: testnet)');
  process.exit(0);
}

deployPortoImplementation(useTestnet).catch(error => {
  console.error('💥 Deployment failed:', error);
  process.exit(1);
}); 