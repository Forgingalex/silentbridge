'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  lineaSepolia,
  scrollSepolia,
} from 'viem/chains';

// Custom chains using defineChain
const zamaDevnet = defineChain({
  id: 8009,
  name: 'Zama Devnet',
  network: 'zama-devnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://devnet.zama.ai'],
    },
    public: {
      http: ['https://devnet.zama.ai'],
    },
  },
});

const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
});

const berachainArtio = defineChain({
  id: 80085,
  name: 'Berachain Artio',
  network: 'berachain-artio',
  nativeCurrency: {
    name: 'BERA',
    symbol: 'BERA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://artio.rpc.berachain.com'],
    },
    public: {
      http: ['https://artio.rpc.berachain.com'],
    },
  },
});

const blastSepolia = defineChain({
  id: 168587773,
  name: 'Blast Sepolia',
  network: 'blast-sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.blast.io'],
    },
    public: {
      http: ['https://sepolia.blast.io'],
    },
  },
});

// Supported chains array - mix of standard and custom chains
const supportedChains = [
  sepolia, // Standard chain from viem/chains
  zamaDevnet, // Custom chain
  baseSepolia, // Standard chain from viem/chains
  polygonAmoy, // Custom chain
  arbitrumSepolia, // Standard chain from viem/chains
  optimismSepolia, // Standard chain from viem/chains
  berachainArtio, // Custom chain
  blastSepolia, // Custom chain
  lineaSepolia, // Standard chain from viem/chains
  scrollSepolia, // Standard chain from viem/chains
];

// Default chain (must be one of the supported chains)
const defaultChain = sepolia;

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmjc4x98n01umky0dv2rqu3jb'}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#FEDA15',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain,
        supportedChains,
      }}
    >
      {children}
    </PrivyProvider>
  );
}

