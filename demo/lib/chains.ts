import { Chain } from 'viem';

export const optimism: Chain = {
  id: 10,
  name: 'OP Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.optimism.io'] },
    public: { http: ['https://mainnet.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Optimism Explorer', url: 'https://optimistic.etherscan.io' },
  },
};

export const base: Chain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Explorer', url: 'https://basescan.org' },
  },
};

export const unichain: Chain = {
  id: 1301,
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.unichain.org'] },
    public: { http: ['https://rpc.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Unichain Explorer', url: 'https://unichain.org' },
  },
};

export const worldchain: Chain = {
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
    public: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://worldchain-mainnet.explorer.alchemy.com' },
  },
};

export interface SuperchainConfig {
  chain: Chain;
  name: string;
  shortName: string;
  color: string;
  emoji: string;
  protocols: string[];
  description: string;
}

export const superchainConfigs: SuperchainConfig[] = [
  {
    chain: optimism,
    name: 'OP Mainnet',
    shortName: 'OP',
    color: '#FF0420',
    emoji: '🔴',
    protocols: ['Aave', 'Velodrome', 'Synthetix', 'OP Staking'],
    description: 'Mature DeFi ecosystem with established protocols'
  },
  {
    chain: base,
    name: 'Base',
    shortName: 'BASE',
    color: '#0052FF',
    emoji: '🔵',
    protocols: ['Aerodrome', 'Moonwell', 'Compound', 'Uniswap V3'],
    description: 'Fast-growing ecosystem with Coinbase backing'
  },
  {
    chain: unichain,
    name: 'Unichain',
    shortName: 'UNI',
    color: '#FF007A',
    emoji: '🟡',
    protocols: ['Uniswap V4', 'UNI Staking', 'Native Hooks'],
    description: 'Next-gen DEX infrastructure with UNI incentives'
  },
  {
    chain: worldchain,
    name: 'World Chain',
    shortName: 'WORLD',
    color: '#00D395',
    emoji: '🟢',
    protocols: ['World ID', 'WLD Staking', 'Identity Yields'],
    description: 'Identity-based DeFi with Worldcoin integration'
  }
];

export const getSuperchainConfig = (chainId: number): SuperchainConfig | undefined => {
  return superchainConfigs.find(config => config.chain.id === chainId);
}; 