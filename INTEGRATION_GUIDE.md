# Porto Cross-Chain Integration Guide 🚀

This guide shows you how to integrate Porto's cross-chain functionality into your live application.

## 🏗️ **1. Production Setup**

### Install Dependencies

```bash
npm install viem @wagmi/core @rainbow-me/rainbowkit
npm install @eth-optimism/viem # For Superchain support
```

### Environment Configuration

```bash
# .env.production
PORTO_IMPLEMENTATION_ADDRESS=0x... # Same on all chains via CREATE2
PRIVATE_KEY=0x... # Your application's private key
MONITOR_POLLING_INTERVAL=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## 🔧 **2. Core Service Integration**

### Complete Production Service

```typescript
// src/services/CrossChainService.ts
import { ProductionPortoProvider } from '../lib/ProductionPortoProvider';
import { CrossChainMonitor, MessageStatus } from '../lib/CrossChainMonitor';
import { optimism, base, arbitrum, polygon } from 'viem/chains';
import { EventEmitter } from 'events';

export class CrossChainService extends EventEmitter {
  private portoProvider: ProductionPortoProvider;
  private monitor: CrossChainMonitor;
  private messageCache: Map<string, MessageStatus> = new Map();

  constructor(config: {
    privateKey: `0x${string}`;
    implementationAddress: `0x${string}`;
    supportedChains: Array<{ chain: Chain; rpcUrl: string }>;
  }) {
    super();
    
    this.portoProvider = new ProductionPortoProvider(
      config.privateKey,
      config.implementationAddress,
      config.supportedChains
    );

    this.monitor = new CrossChainMonitor({
      chains: config.supportedChains.map(({ chain, rpcUrl }) => ({
        chainId: chain.id,
        chain,
        rpcUrl,
        messengerAddress: '0x4200000000000000000000000000000000000023',
        inboxAddress: '0x4200000000000000000000000000000000000022'
      })),
      pollingInterval: 3000
    });

    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.monitor.startMonitoring((status) => {
      // Cache the status
      this.messageCache.set(status.messageHash, status);
      
      // Emit events for subscribers
      this.emit('messageStatusUpdate', status);
      
      // Store in database
      this.persistMessageStatus(status);
      
      // Notify users via WebSocket/Server-Sent Events
      this.notifyClients(status);
    });
  }

  // Public API methods...
  
  async executeSwap(params: {
    fromChain: number;
    toChain: number;
    tokenIn: Address;
    tokenOut: Address;
    amountIn: bigint;
    minAmountOut: bigint;
    recipient: Address;
  }) {
    // 1. Execute swap on source chain
    const swapData = encodeFunctionData({
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: 3000,
        recipient: params.recipient,
        deadline: Math.floor(Date.now() / 1000) + 1200,
        amountIn: params.amountIn,
        amountOutMinimum: params.minAmountOut,
        sqrtPriceLimitX96: 0
      }]
    });

    // 2. Bridge tokens to destination chain
    const bridgeResult = await this.portoProvider.bridgeTokens(
      params.fromChain,
      params.toChain,
      params.tokenIn,
      params.amountIn
    );

    // 3. Execute swap on destination chain
    const crossChainResult = await this.portoProvider.executeCrossChain(
      params.fromChain,
      params.toChain,
      SWAP_ROUTER_ADDRESS,
      swapData
    );

    return {
      bridgeTx: bridgeResult,
      crossChainTx: crossChainResult.txHash,
      messageHash: crossChainResult.messageHash
    };
  }

  async executeGovernanceVote(params: {
    chainIds: number[];
    proposalId: bigint;
    support: boolean;
  }) {
    const results = [];
    
    for (const chainId of params.chainIds) {
      const voteData = encodeFunctionData({
        abi: GOVERNANCE_ABI,
        functionName: 'castVote',
        args: [params.proposalId, params.support ? 1 : 0]
      });

      if (chainId === params.chainIds[0]) {
        // Execute locally on first chain
        const result = await this.portoProvider.executeLocal(
          chainId,
          GOVERNANCE_CONTRACT,
          0n,
          voteData
        );
        results.push({ chainId, txHash: result, type: 'local' });
      } else {
        // Execute cross-chain on other chains
        const result = await this.portoProvider.executeCrossChain(
          params.chainIds[0], // Source chain
          chainId,           // Destination chain
          GOVERNANCE_CONTRACT,
          voteData
        );
        results.push({ 
          chainId, 
          txHash: result.txHash, 
          messageHash: result.messageHash, 
          type: 'crosschain' 
        });
      }
    }

    return results;
  }

  async manageLiquidity(params: {
    action: 'add' | 'remove';
    chainId: number;
    pool: Address;
    amount0: bigint;
    amount1: bigint;
  }) {
    const liquidityData = encodeFunctionData({
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: params.action === 'add' ? 'addLiquidity' : 'removeLiquidity',
      args: [params.pool, params.amount0, params.amount1]
    });

    return await this.portoProvider.executeLocal(
      params.chainId,
      LIQUIDITY_MANAGER_ADDRESS,
      0n,
      liquidityData
    );
  }

  // Monitoring and status methods
  
  async getMessageStatus(messageHash: string): Promise<MessageStatus | null> {
    // First check cache
    const cached = this.messageCache.get(messageHash);
    if (cached) return cached;

    // Then check database
    return await this.getMessageStatusFromDB(messageHash);
  }

  async waitForCompletion(messageHash: string, timeoutMs: number = 300000): Promise<MessageStatus> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for message completion'));
      }, timeoutMs);

      const checkStatus = (status: MessageStatus) => {
        if (status.messageHash === messageHash && 
           (status.status === 'relayed' || status.status === 'failed')) {
          clearTimeout(timeout);
          this.off('messageStatusUpdate', checkStatus);
          resolve(status);
        }
      };

      this.on('messageStatusUpdate', checkStatus);
    });
  }

  // Private helper methods
  private async persistMessageStatus(status: MessageStatus) {
    // Store in your database
    await db.crossChainMessages.upsert({
      where: { messageHash: status.messageHash },
      update: status,
      create: status
    });
  }

  private notifyClients(status: MessageStatus) {
    // WebSocket notification
    io.emit('messageUpdate', {
      messageHash: status.messageHash,
      status: status.status,
      txHash: status.txHash,
      relayTxHash: status.relayTxHash
    });
  }

  private async getMessageStatusFromDB(messageHash: string): Promise<MessageStatus | null> {
    return await db.crossChainMessages.findUnique({
      where: { messageHash }
    });
  }
}
```

## 🎯 **3. Frontend Integration**

### React Hook for Cross-Chain Operations

```typescript
// src/hooks/useCrossChain.ts
import { useState, useEffect } from 'react';
import { CrossChainService } from '../services/CrossChainService';

export function useCrossChain() {
  const [service] = useState(() => new CrossChainService(config));
  const [pendingMessages, setPendingMessages] = useState<MessageStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleStatusUpdate = (status: MessageStatus) => {
      setPendingMessages(prev => {
        const updated = prev.filter(msg => msg.messageHash !== status.messageHash);
        if (status.status === 'sent') {
          updated.push(status);
        }
        return updated;
      });
    };

    service.on('messageStatusUpdate', handleStatusUpdate);
    setIsConnected(true);

    return () => {
      service.off('messageStatusUpdate', handleStatusUpdate);
    };
  }, [service]);

  const executeSwap = async (params: SwapParams) => {
    try {
      const result = await service.executeSwap(params);
      
      // Wait for completion if needed
      if (result.messageHash) {
        const finalStatus = await service.waitForCompletion(result.messageHash);
        return { ...result, finalStatus };
      }
      
      return result;
    } catch (error) {
      console.error('Swap failed:', error);
      throw error;
    }
  };

  const voteOnProposal = async (params: VoteParams) => {
    return await service.executeGovernanceVote(params);
  };

  return {
    executeSwap,
    voteOnProposal,
    pendingMessages,
    isConnected,
    service
  };
}
```

### Cross-Chain Swap Component

```typescript
// src/components/CrossChainSwap.tsx
import React, { useState } from 'react';
import { useCrossChain } from '../hooks/useCrossChain';

export function CrossChainSwap() {
  const { executeSwap, pendingMessages } = useCrossChain();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSwap = async (formData) => {
    setIsLoading(true);
    try {
      const swapResult = await executeSwap({
        fromChain: 10, // Optimism
        toChain: 8453, // Base
        tokenIn: '0x...', // USDC on Optimism
        tokenOut: '0x...', // USDC on Base
        amountIn: parseEther(formData.amount),
        minAmountOut: parseEther(formData.minAmount),
        recipient: userAddress
      });
      
      setResult(swapResult);
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cross-chain-swap">
      {/* Swap form UI */}
      
      {/* Pending messages */}
      <div className="pending-messages">
        {pendingMessages.map(msg => (
          <MessageStatus key={msg.messageHash} message={msg} />
        ))}
      </div>
    </div>
  );
}
```

## 🔒 **4. Security & Production Considerations**

### Session Key Management

```typescript
// src/services/SessionKeyManager.ts
export class SessionKeyManager {
  async createSessionKey(userId: string, permissions: SessionKeyParams) {
    // Generate new keypair
    const sessionAccount = generatePrivateKey();
    const sessionAddress = privateKeyToAddress(sessionAccount);

    // Store in secure database
    await db.sessionKeys.create({
      data: {
        userId,
        address: sessionAddress,
        privateKey: encrypt(sessionAccount), // Encrypt the private key
        permissions,
        createdAt: new Date(),
        expiresAt: new Date(permissions.expiry * 1000)
      }
    });

    // Authorize on all chains
    for (const chainId of supportedChains) {
      await portoService.authorizeSessionKey(chainId, {
        key: sessionAddress,
        ...permissions
      });
    }

    return { address: sessionAddress, permissions };
  }

  async revokeSessionKey(address: Address) {
    // Mark as revoked in database
    await db.sessionKeys.update({
      where: { address },
      data: { revokedAt: new Date() }
    });

    // Could also revoke on-chain by setting expiry to 0
  }
}
```

### Error Handling & Retry Logic

```typescript
// src/utils/CrossChainRetry.ts
export class CrossChainRetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
        );
      }
    }
    throw new Error('Max retries exceeded');
  }

  async monitorAndRetry(messageHash: string) {
    // Monitor for stuck messages and retry if needed
    const status = await crossChainService.getMessageStatus(messageHash);
    
    if (status?.status === 'sent' && 
        Date.now() - status.timestamp > 10 * 60 * 1000) { // 10 minutes
      // Message might be stuck, attempt manual relay
      await this.attemptManualRelay(messageHash);
    }
  }
}
```

## 🚀 **5. Deployment Strategy**

### Infrastructure Setup

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - PORTO_IMPLEMENTATION_ADDRESS=${PORTO_IMPLEMENTATION_ADDRESS}
      - PRIVATE_KEY=${PRIVATE_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: crosschain_app
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  monitoring:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
```

### Contract Deployment Script

```typescript
// scripts/deploy.ts
async function deployPortoImplementation() {
  const chains = [optimism, base, arbitrum]; // Production chains
  
  for (const chain of chains) {
    console.log(`Deploying to ${chain.name}...`);
    
    const client = createWalletClient({
      account: deployerAccount,
      chain,
      transport: http(getRpcUrl(chain.id))
    });

    // Deploy using CREATE2 for deterministic addresses
    const deployTx = await client.deployContract({
      abi: PortoCrossChainAccountABI,
      bytecode: PortoBytecode.bytecode,
      args: [],
      // Use CREATE2 factory for same address across chains
    });

    console.log(`Deployed on ${chain.name}: ${deployTx}`);
  }
}
```

## 📊 **6. Monitoring & Analytics**

### Health Monitoring

```typescript
// src/monitoring/HealthCheck.ts
export class CrossChainHealthMonitor {
  async checkHealth() {
    const health = {
      chains: {},
      monitoring: false,
      lastMessageTimestamp: 0
    };

    // Check each chain connectivity
    for (const [chainId, client] of portoService.clients) {
      try {
        const blockNumber = await client.public.getBlockNumber();
        health.chains[chainId] = { 
          status: 'healthy', 
          blockNumber: Number(blockNumber) 
        };
      } catch (error) {
        health.chains[chainId] = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }

    // Check monitoring status
    health.monitoring = monitor.isMonitoring;
    
    // Check recent message activity
    const recentMessage = await db.crossChainMessages.findFirst({
      orderBy: { timestamp: 'desc' }
    });
    health.lastMessageTimestamp = recentMessage?.timestamp || 0;

    return health;
  }
}
```

## 🎯 **7. Usage Examples**

### DeFi Integration

```typescript
// Example: Cross-chain yield farming
const result = await crossChainService.executeSwap({
  fromChain: 1, // Ethereum
  toChain: 10,  // Optimism
  tokenIn: USDC_ETHEREUM,
  tokenOut: USDC_OPTIMISM,
  amountIn: parseEther('1000'),
  minAmountOut: parseEther('995'),
  recipient: userAddress
});

// Wait for completion and then stake
await crossChainService.waitForCompletion(result.messageHash);
await stakingService.stake(10, USDC_OPTIMISM, parseEther('1000'));
```

### NFT Marketplace

```typescript
// Example: Cross-chain NFT purchase
const purchaseData = encodeFunctionData({
  abi: NFT_MARKETPLACE_ABI,
  functionName: 'purchaseNFT',
  args: [tokenId, parseEther('0.1')]
});

const result = await crossChainService.executeCrossChain(
  8453, // Base (user's chain)
  1,    // Ethereum (NFT chain)
  NFT_MARKETPLACE_ADDRESS,
  purchaseData
);
```

This integration approach gives you a production-ready cross-chain system with real-time monitoring, robust error handling, and scalable architecture. 