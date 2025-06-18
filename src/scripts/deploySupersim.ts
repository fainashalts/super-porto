import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import PortoCrossChainAccountABI from '../contracts/PortoCrossChainAccount.abi.json';
import PortoBytecode from '../contracts/PortoCrossChainAccount.bytecode.json';

// Load environment variables
dotenv.config();

// Supersim chain configurations
const SUPERSIM_CHAINS = [
  {
    id: 901,
    name: 'Supersim L2 A',
    rpcUrl: 'http://localhost:9545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://localhost:9545'] } }
  },
  {
    id: 902,
    name: 'Supersim L2 B', 
    rpcUrl: 'http://localhost:9546',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://localhost:9546'] } }
  }
];

async function deployToSupersim() {
  console.log('🚀 Porto Supersim Deployment');
  console.log('============================\n');



  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in .env file');
    return;
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  console.log(`👤 Deployer: ${account.address}\n`);

  const deploymentResults: Array<{
    chainName: string;
    chainId: number;
    implementationAddress: string;
    txHash: string;
  }> = [];

  // Deploy to each Supersim chain
  for (const chain of SUPERSIM_CHAINS) {
    console.log(`🔨 Deploying to ${chain.name} (${chain.rpcUrl})...`);
    
    try {
      // Create clients
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(chain.rpcUrl)
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrl)
      });

      // Check connection
      const blockNumber = await publicClient.getBlockNumber();
      console.log(`   🔗 Connected to ${chain.name} - Block: ${blockNumber}`);

      // Check balance
      const balance = await publicClient.getBalance({ address: account.address });
      const balanceEth = Number(balance) / 1e18;
      console.log(`   💰 Balance: ${balanceEth.toFixed(4)} ETH`);

      // Deploy the contract
      console.log('   📡 Deploying Porto contract...');
      const deployTx = await walletClient.deployContract({
        abi: PortoCrossChainAccountABI,
        bytecode: PortoBytecode.bytecode as `0x${string}`,
        args: []
      });

      console.log(`   ⏳ Transaction sent: ${deployTx}`);

      // Wait for confirmation and get contract address
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: deployTx,
        timeout: 30000 // 30 seconds
      });

      if (receipt.status === 'success' && receipt.contractAddress) {
        console.log(`   ✅ Deployed successfully!`);
        console.log(`   📍 Contract Address: ${receipt.contractAddress}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}\n`);

        deploymentResults.push({
          chainName: chain.name,
          chainId: chain.id,
          implementationAddress: receipt.contractAddress,
          txHash: deployTx
        });
      } else {
        console.error(`   ❌ Deployment failed on ${chain.name}`);
      }

    } catch (error) {
      console.error(`   ❌ Error deploying to ${chain.name}:`, error);
    }
  }

  // Check results
  if (deploymentResults.length === 0) {
    console.log('❌ No successful deployments');
    return;
  }

  console.log('📋 Deployment Summary');
  console.log('=====================');

  // Check if all addresses are the same (they should be with CREATE2)
  const addresses = deploymentResults.map(r => r.implementationAddress);
  const allSameAddress = addresses.every(addr => addr === addresses[0]);

  if (allSameAddress) {
    console.log(`🎉 SUCCESS: Same address across all chains!`);
    console.log(`📍 Porto Implementation Address: ${addresses[0]}\n`);
  } else {
    console.log(`⚠️  Different addresses across chains:\n`);
  }

  // Print detailed results
  deploymentResults.forEach(result => {
    console.log(`${result.chainName}:`);
    console.log(`  Address: ${result.implementationAddress}`);
    console.log(`  TX Hash: ${result.txHash}`);
    console.log('');
  });

  // Update .env file
  try {
    // Read existing .env
    let envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');

    // Update the implementation address
    const implementationAddress = addresses[0];
    
    // Update or add PORTO_IMPLEMENTATION_ADDRESS
    const implIndex = lines.findIndex(line => line.startsWith('PORTO_IMPLEMENTATION_ADDRESS='));
    if (implIndex >= 0) {
      lines[implIndex] = `PORTO_IMPLEMENTATION_ADDRESS=${implementationAddress}`;
    } else {
      lines.push(`PORTO_IMPLEMENTATION_ADDRESS=${implementationAddress}`);
    }

    // Update individual chain addresses if different
    if (!allSameAddress) {
      deploymentResults.forEach(result => {
        const chainKey = result.chainId === 901 ? 'PORTO_IMPL_ADDRESS_A' : 'PORTO_IMPL_ADDRESS_B';
        const chainIndex = lines.findIndex(line => line.startsWith(`${chainKey}=`));
        if (chainIndex >= 0) {
          lines[chainIndex] = `${chainKey}=${result.implementationAddress}`;
        } else {
          lines.push(`${chainKey}=${result.implementationAddress}`);
        }
      });
    }

    // Write back to .env
    fs.writeFileSync('.env', lines.join('\n'));
    console.log('✅ Updated .env file with deployment addresses');

  } catch (error) {
    console.warn('⚠️  Could not update .env file:', error);
    console.log(`💡 Manually add to .env:`);
    console.log(`PORTO_IMPLEMENTATION_ADDRESS=${addresses[0]}`);
  }

  console.log('\n🎊 Supersim deployment completed!');
  console.log('💡 You can now run: npm run swap-bridge-swap');
}

deployToSupersim().catch(error => {
  console.error('💥 Deployment failed:', error);
  process.exit(1);
}); 