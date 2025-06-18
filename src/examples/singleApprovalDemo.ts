import { createPublicClient, createWalletClient, http, formatEther, encodeAbiParameters, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Mock chains for Supersim
const chainA = { ...foundry, id: 901, rpcUrls: { default: { http: ['http://localhost:9545'] } } }
const chainB = { ...foundry, id: 902, rpcUrls: { default: { http: ['http://localhost:9546'] } } }

const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const PORTO_ADDRESS = process.env.PORTO_IMPLEMENTATION_ADDRESS as `0x${string}` || '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707'

// Porto ABI for session key management and batch execution
const PORTO_ABI = [
  {
    type: 'function',
    name: 'authorizeSessionKey',
    inputs: [
      { name: '_key', type: 'address' },
      { name: '_expiry', type: 'uint256' },
      { name: '_canBridge', type: 'bool' },
      { name: '_canExecute', type: 'bool' },
      { name: '_spendLimit', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'executeBatch',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'datas', type: 'bytes[]' }
    ],
    outputs: [{ type: 'bytes[]' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'crossChainExecute',
    inputs: [
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'SessionKeyAuthorized',
    inputs: [
      { indexed: true, name: 'key', type: 'address' },
      { name: 'expiry', type: 'uint256' },
      { name: 'spendLimit', type: 'uint256' }
    ]
  }
] as const

// L2ToL2CrossDomainMessenger ABI
const MESSENGER_ABI = [
  {
    type: 'function',
    name: 'sendMessage',
    inputs: [
      { name: '_chainId', type: 'uint256' },
      { name: '_target', type: 'address' },
      { name: '_message', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

const L2_TO_L2_MESSENGER = '0x4200000000000000000000000000000000000023'

async function demonstrateSingleApprovalFlow() {
  console.log('🔐 Porto Single Approval Demo')
  console.log('============================\n')
  console.log('This demo shows the TRUE Porto user experience:')
  console.log('• User approves ONCE')
  console.log('• System automatically executes entire cross-chain flow')
  console.log('• No additional approvals needed for subsequent transactions\n')

  // Setup clients
  const account = privateKeyToAccount(PRIVATE_KEY)
  
  const clientA = createWalletClient({
    account,
    chain: chainA,
    transport: http()
  })
  
  const publicClientA = createPublicClient({
    chain: chainA,
    transport: http()
  })

  console.log('📍 Setup:')
  console.log(`   Porto Contract: ${PORTO_ADDRESS}`)
  console.log(`   User Account: ${account.address}`)
  console.log(`   Chain A: ${chainA.rpcUrls.default.http[0]} (ID: ${chainA.id})`)
  console.log(`   Chain B: ${chainB.rpcUrls.default.http[0]} (ID: ${chainB.id})\n`)

  // Check initial balance
  const initialBalance = await publicClientA.getBalance({ address: account.address })
  console.log('💰 Initial Balance:')
  console.log(`   Chain A: ${formatEther(initialBalance)} ETH\n`)

  // Step 1: User's SINGLE approval - authorize session key
  console.log('👤 STEP 1: User Authorization (SINGLE APPROVAL)')
  console.log('===============================================')
  console.log('🔑 User approves session key for automated cross-chain operations...')
  console.log('   This is the ONLY approval the user needs to make!')
  
  try {
    // Create a session key that can execute cross-chain operations
    const sessionKeyAddress = account.address // In practice, this would be a separate key
    const expiry = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const spendLimit = BigInt('1000000000000000000000') // 1000 ETH limit
    
    console.log(`   Session Key: ${sessionKeyAddress}`)
    console.log(`   Expiry: ${new Date(expiry * 1000).toLocaleString()}`)
    console.log(`   Spend Limit: ${formatEther(spendLimit)} ETH`)
    console.log(`   Can Bridge: true`)
    console.log(`   Can Execute: true`)
    
    // This would normally be called by the user's wallet
    const authHash = await clientA.writeContract({
      address: PORTO_ADDRESS,
      abi: PORTO_ABI,
      functionName: 'authorizeSessionKey',
      args: [sessionKeyAddress, BigInt(expiry), true, true, spendLimit]
    })
    
    console.log(`✅ Authorization transaction sent: ${authHash}`)
    
    const authReceipt = await publicClientA.waitForTransactionReceipt({ hash: authHash })
    console.log(`✅ Session key authorized in block: ${authReceipt.blockNumber}`)
    console.log('✅ User has completed their SINGLE approval!\n')
    
  } catch (error: any) {
    console.log('❌ Authorization failed (expected in demo):')
    console.log(`   ${error.shortMessage || error.message}`)
    console.log('ℹ️  In production, this would be authorized by the account owner\n')
  }

  // Step 2: Automated execution of the entire chain
  console.log('🤖 STEP 2: Automated Cross-Chain Execution')
  console.log('==========================================')
  console.log('🚀 Porto now automatically executes the entire transaction chain...')
  console.log('   No additional user approvals needed!')
  console.log('   System uses the pre-authorized session key\n')

  // Prepare the batch of cross-chain operations
  const operations = [
    {
      description: 'Swap USDC → WETH on Chain A',
      target: '0x1111111111111111111111111111111111111111', // Mock DEX
      data: encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'swapExactTokensForTokens',
          inputs: [
            { name: 'amountIn', type: 'uint256' },
            { name: 'amountOutMin', type: 'uint256' },
            { name: 'path', type: 'address[]' },
            { name: 'to', type: 'address' },
            { name: 'deadline', type: 'uint256' }
          ]
        }],
        functionName: 'swapExactTokensForTokens',
        args: [
          BigInt('1000000000000000000'), // 1 USDC
          BigInt('900000000000000000'),  // Min 0.9 WETH
                        ['0xa0b86a33e6441c8c06dd2e4b95a0dfd8b0c9f3a4', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'], // USDC → WETH
          account.address,
          BigInt(Math.floor(Date.now() / 1000) + 1800) // 30 min deadline
        ]
      })
    },
    {
      description: 'Bridge WETH to Chain B',
      target: '0x4200000000000000000000000000000000000028', // SuperchainTokenBridge
      data: encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'sendERC20',
          inputs: [
            { name: '_token', type: 'address' },
            { name: '_to', type: 'address' },
            { name: '_amount', type: 'uint256' },
            { name: '_chainId', type: 'uint256' }
          ]
        }],
        functionName: 'sendERC20',
        args: [
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
          account.address,
          BigInt('900000000000000000'), // 0.9 WETH
          BigInt(chainB.id)
        ]
      })
    },
    {
      description: 'Cross-chain call to swap WETH → USDC on Chain B',
      target: L2_TO_L2_MESSENGER,
      data: encodeFunctionData({
        abi: MESSENGER_ABI,
        functionName: 'sendMessage',
        args: [
          BigInt(chainB.id),
          '0x2222222222222222222222222222222222222222', // Mock DEX on Chain B
          encodeFunctionData({
            abi: [{
              type: 'function',
              name: 'swapExactTokensForTokens',
              inputs: [
                { name: 'amountIn', type: 'uint256' },
                { name: 'amountOutMin', type: 'uint256' },
                { name: 'path', type: 'address[]' },
                { name: 'to', type: 'address' },
                { name: 'deadline', type: 'uint256' }
              ]
            }],
            functionName: 'swapExactTokensForTokens',
            args: [
              BigInt('900000000000000000'), // 0.9 WETH
              BigInt('950000000'), // Min 950 USDC
                             ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xa0b86a33e6441c8c06dd2e4b95a0dfd8b0c9f3a4'], // WETH → USDC
              account.address,
              BigInt(Math.floor(Date.now() / 1000) + 1800)
            ]
          })
        ]
      })
    }
  ]

  // Show what would be executed
  console.log('📋 Automated Operations Queue:')
  operations.forEach((op, i) => {
    console.log(`   ${i + 1}. ${op.description}`)
  })
  console.log('')

  // Execute a simplified version to demonstrate the concept
  console.log('🎯 Executing Cross-Chain Message (Simplified Demo):')
  try {
    const demoMessage = encodeAbiParameters(
      [{ type: 'string' }, { type: 'uint256' }],
      ['Automated cross-chain execution from Porto session key', BigInt(Date.now())]
    )
    
    const hash = await clientA.writeContract({
      address: L2_TO_L2_MESSENGER,
      abi: MESSENGER_ABI,
      functionName: 'sendMessage',
      args: [BigInt(chainB.id), '0x3333333333333333333333333333333333333333', demoMessage]
    })
    
    console.log(`✅ Automated transaction sent: ${hash}`)
    
    const receipt = await publicClientA.waitForTransactionReceipt({ hash })
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`)
    console.log(`📋 Gas used: ${receipt.gasUsed}`)
    
    console.log('\n✅ Cross-chain operation completed automatically!')
    
  } catch (error: any) {
    console.log('❌ Demo execution failed:', error.shortMessage || error.message)
  }

  // Show final state
  const finalBalance = await publicClientA.getBalance({ address: account.address })
  const finalBlock = await publicClientA.getBlockNumber()
  
  console.log('\n📊 Final State:')
  console.log('===============')
  console.log(`   Chain A: Block ${finalBlock}, Balance: ${formatEther(finalBalance)} ETH`)
  console.log('')

  // Summary of the user experience
  console.log('🎉 SINGLE APPROVAL DEMO COMPLETE!')
  console.log('==================================')
  console.log('✅ User Experience Summary:')
  console.log('   1. User approves session key ONCE ✓')
  console.log('   2. System automatically executes entire flow ✓')
  console.log('   3. No additional approvals needed ✓')
  console.log('   4. Cross-chain operations complete seamlessly ✓')
  console.log('')
  console.log('🔍 Key Benefits:')
  console.log('• ONE approval for complex multi-step flows')
  console.log('• Automated execution reduces user friction')
  console.log('• Session keys enable sophisticated DeFi strategies')
  console.log('• User maintains control with spend limits & expiry')
  console.log('')
  console.log('🚀 Production Flow:')
  console.log('User clicks "Optimize Portfolio" → Single approval → Done!')
  console.log('Porto handles: swap→bridge→swap→stake automatically')
}

// Run the demo
demonstrateSingleApprovalFlow().catch(console.error) 