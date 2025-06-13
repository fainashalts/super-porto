export interface PortfolioPosition {
  chainId: number;
  protocol: string;
  asset: string;
  amount: number;
  value: number;
  apy: number;
  category: 'lending' | 'staking' | 'liquidity' | 'yield';
}

export interface ChainBalance {
  chainId: number;
  totalValue: number;
  percentage: number;
  positions: PortfolioPosition[];
}

export interface CrossChainOperation {
  id: string;
  type: 'bridge' | 'swap' | 'stake' | 'withdraw' | 'deposit';
  sourceChain: number;
  destinationChain?: number;
  asset: string;
  amount: number;
  status: 'pending' | 'confirming' | 'relaying' | 'completed' | 'failed';
  progress: number;
  txHash?: string;
  messageHash?: string;
  estimatedTime: number; // seconds
  startTime: number;
}

// Mock portfolio data - realistic Superchain distribution
export const mockPortfolio: ChainBalance[] = [
  {
    chainId: 10, // OP Mainnet
    totalValue: 4500,
    percentage: 45,
    positions: [
      {
        chainId: 10,
        protocol: 'Aave',
        asset: 'USDC',
        amount: 3000,
        value: 3000,
        apy: 4.2,
        category: 'lending'
      },
      {
        chainId: 10,
        protocol: 'OP Staking',
        asset: 'OP',
        amount: 750,
        value: 1500,
        apy: 5.8,
        category: 'staking'
      }
    ]
  },
  {
    chainId: 8453, // Base
    totalValue: 3000,
    percentage: 30,
    positions: [
      {
        chainId: 8453,
        protocol: 'Aerodrome',
        asset: 'ETH/USDC LP',
        amount: 1,
        value: 2000,
        apy: 6.5,
        category: 'liquidity'
      },
      {
        chainId: 8453,
        protocol: 'Moonwell',
        asset: 'USDC',
        amount: 1000,
        value: 1000,
        apy: 3.8,
        category: 'lending'
      }
    ]
  },
  {
    chainId: 1301, // Unichain
    totalValue: 1500,
    percentage: 15,
    positions: [
      {
        chainId: 1301,
        protocol: 'UNI Staking',
        asset: 'UNI',
        amount: 100,
        value: 1000,
        apy: 8.2,
        category: 'staking'
      },
      {
        chainId: 1301,
        protocol: 'Uniswap V4',
        asset: 'UNI/ETH LP',
        amount: 0.5,
        value: 500,
        apy: 12.4,
        category: 'liquidity'
      }
    ]
  },
  {
    chainId: 480, // World Chain
    totalValue: 1000,
    percentage: 10,
    positions: [
      {
        chainId: 480,
        protocol: 'WLD Staking',
        asset: 'WLD',
        amount: 200,
        value: 700,
        apy: 7.5,
        category: 'staking'
      },
      {
        chainId: 480,
        protocol: 'World ID Yield',
        asset: 'USDC',
        amount: 300,
        value: 300,
        apy: 5.2,
        category: 'yield'
      }
    ]
  }
];

// Optimized portfolio after rebalancing
export const optimizedPortfolio: ChainBalance[] = [
  {
    chainId: 10,
    totalValue: 2500,
    percentage: 25,
    positions: [
      {
        chainId: 10,
        protocol: 'Velodrome',
        asset: 'OP/ETH LP',
        amount: 1,
        value: 1500,
        apy: 8.4,
        category: 'liquidity'
      },
      {
        chainId: 10,
        protocol: 'OP Staking',
        asset: 'OP',
        amount: 500,
        value: 1000,
        apy: 5.8,
        category: 'staking'
      }
    ]
  },
  {
    chainId: 8453,
    totalValue: 2500,
    percentage: 25,
    positions: [
      {
        chainId: 8453,
        protocol: 'Aerodrome',
        asset: 'ETH/USDC LP',
        amount: 1.5,
        value: 2000,
        apy: 6.5,
        category: 'liquidity'
      },
      {
        chainId: 8453,
        protocol: 'Compound',
        asset: 'ETH',
        amount: 0.2,
        value: 500,
        apy: 4.1,
        category: 'lending'
      }
    ]
  },
  {
    chainId: 1301,
    totalValue: 2500,
    percentage: 25,
    positions: [
      {
        chainId: 1301,
        protocol: 'UNI Staking',
        asset: 'UNI',
        amount: 150,
        value: 1500,
        apy: 8.2,
        category: 'staking'
      },
      {
        chainId: 1301,
        protocol: 'Uniswap V4',
        asset: 'UNI/ETH LP',
        amount: 1,
        value: 1000,
        apy: 12.4,
        category: 'liquidity'
      }
    ]
  },
  {
    chainId: 480,
    totalValue: 2500,
    percentage: 25,
    positions: [
      {
        chainId: 480,
        protocol: 'WLD Staking',
        asset: 'WLD',
        amount: 500,
        value: 1750,
        apy: 7.5,
        category: 'staking'
      },
      {
        chainId: 480,
        protocol: 'World ID Yield',
        asset: 'USDC',
        amount: 750,
        value: 750,
        apy: 5.2,
        category: 'yield'
      }
    ]
  }
];

// Mock rebalancing operations
export const mockRebalanceOperations: CrossChainOperation[] = [
  {
    id: '1',
    type: 'withdraw',
    sourceChain: 10,
    asset: 'USDC',
    amount: 2000,
    status: 'completed',
    progress: 100,
    txHash: '0xabc123...',
    estimatedTime: 15,
    startTime: Date.now() - 45000
  },
  {
    id: '2',
    type: 'bridge',
    sourceChain: 10,
    destinationChain: 8453,
    asset: 'USDC',
    amount: 500,
    status: 'completed',
    progress: 100,
    txHash: '0xdef456...',
    messageHash: '0x789abc...',
    estimatedTime: 30,
    startTime: Date.now() - 30000
  },
  {
    id: '3',
    type: 'bridge',
    sourceChain: 10,
    destinationChain: 1301,
    asset: 'USDC',
    amount: 1000,
    status: 'relaying',
    progress: 75,
    txHash: '0xghi789...',
    messageHash: '0xdef456...',
    estimatedTime: 30,
    startTime: Date.now() - 20000
  },
  {
    id: '4',
    type: 'bridge',
    sourceChain: 10,
    destinationChain: 480,
    asset: 'USDC',
    amount: 1500,
    status: 'confirming',
    progress: 25,
    txHash: '0xjkl012...',
    estimatedTime: 30,
    startTime: Date.now() - 10000
  },
  {
    id: '5',
    type: 'swap',
    sourceChain: 8453,
    asset: 'USDC → ETH',
    amount: 500,
    status: 'pending',
    progress: 0,
    estimatedTime: 20,
    startTime: Date.now()
  },
  {
    id: '6',
    type: 'stake',
    sourceChain: 1301,
    asset: 'UNI',
    amount: 50,
    status: 'pending',
    progress: 0,
    estimatedTime: 25,
    startTime: Date.now() + 5000
  }
];

export const calculateTotalValue = (portfolio: ChainBalance[]): number => {
  return portfolio.reduce((total, chain) => total + chain.totalValue, 0);
};

export const calculateWeightedAPY = (portfolio: ChainBalance[]): number => {
  const totalValue = calculateTotalValue(portfolio);
  const weightedSum = portfolio.reduce((sum, chain) => {
    const chainWeightedAPY = chain.positions.reduce((chainSum, position) => {
      return chainSum + (position.apy * position.value);
    }, 0);
    return sum + chainWeightedAPY;
  }, 0);
  return weightedSum / totalValue;
}; 