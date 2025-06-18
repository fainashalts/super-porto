// DEX Router configurations for Superchain L2s
export const DEX_ROUTERS = {
  // Optimism - Velodrome
  10: {
    router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' as const,
    name: 'Velodrome Router',
    type: 'velodrome'
  },
  // Base - Aerodrome  
  8453: {
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const,
    name: 'Aerodrome Router',
    type: 'aerodrome'
  },
  // Unichain - Uniswap V4
  1301: {
    router: '0x2626664c2603336E57B271c5C0b26F421741e481' as const,
    name: 'Uniswap V4 Router',
    type: 'uniswap-v4'
  },
  // Supersim L2 A - Mock DEX
  901: {
    router: '0x1111111111111111111111111111111111111111' as const,
    name: 'Supersim Mock DEX A',
    type: 'uniswap-v3'
  },
  // Supersim L2 B - Mock DEX
  902: {
    router: '0x2222222222222222222222222222222222222222' as const,
    name: 'Supersim Mock DEX B', 
    type: 'uniswap-v3'
  }
};

// Uniswap V3 Router ABI (compatible with most DEXes)
export const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' }, 
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable'
  },
  {
    type: 'function', 
    name: 'exactOutputSingle',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountOut', type: 'uint256' },
          { name: 'amountInMaximum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    outputs: [{ name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable'
  }
] as const;

// Velodrome/Aerodrome Router ABI (Solidly forks)
export const SOLIDLY_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' }
        ]
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable'
  }
] as const;

// Token addresses for testing
export const SUPERCHAIN_TOKENS = {
  // USDC addresses
  USDC: {
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as const, // OP
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const, // Base
    1301: '0xA0b86a33E6E8b0b1Ca0c6dFf0a7A6a8e7F0b4b1c' as const, // Unichain (example)
  },
  // WETH addresses  
  WETH: {
    10: '0x4200000000000000000000000000000000000006' as const, // OP
    8453: '0x4200000000000000000000000000000000000006' as const, // Base
    1301: '0x4200000000000000000000000000000000000006' as const, // Unichain
  }
};

export function getRouterConfig(chainId: number) {
  return DEX_ROUTERS[chainId as keyof typeof DEX_ROUTERS];
}

export function getTokenAddress(symbol: string, chainId: number) {
  const token = SUPERCHAIN_TOKENS[symbol as keyof typeof SUPERCHAIN_TOKENS];
  return token?.[chainId as keyof typeof token];
} 