/**
 * Demo Mode Configuration
 * Set DEMO_MODE=true in your .env.local to enable demo mode
 * This bypasses all complex integrations and shows a working demo
 */

export const isDemoMode = () => {
  if (typeof window !== 'undefined') {
    // Check URL parameter first (for easy testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      return true;
    }
    // Check localStorage
    if (localStorage.getItem('demoMode') === 'true') {
      return true;
    }
  }
  // Check environment variable
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

export const setDemoMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('demoMode', 'true');
    } else {
      localStorage.removeItem('demoMode');
    }
  }
};

// Demo data
export interface Token {
  symbol: string;
  name: string;
  chain: string;
  address: string;
  decimals: number;
  logo?: string;
}

export interface BridgeTransaction {
  id: string;
  fromToken: Token;
  toToken: Token;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  routingPreference?: 'fastest' | 'cheapest';
  encryptedRoutingIntent?: string;
  route?: string; // e.g., "Base → Arbitrum"
}

export const demoData = {
  tokens: [
    { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum', address: '0x0', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', chain: 'Ethereum', address: '0xA0b8...', decimals: 6 },
    { symbol: 'USDC', name: 'USD Coin', chain: 'Polygon', address: '0x2791...', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', chain: 'Arbitrum', address: '0x0', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', chain: 'Arbitrum', address: '0xFF97...', decimals: 6 },
  ] as Token[],
  transactions: [
    {
      id: '0x1234...5678',
      fromToken: { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum', address: '0x0', decimals: 18 },
      toToken: { symbol: 'USDC', name: 'USD Coin', chain: 'Polygon', address: '0x2791...', decimals: 6 },
      amount: '1.5',
      status: 'completed' as const,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      routingPreference: 'fastest' as const,
      encryptedRoutingIntent: '0xff7f4a8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
      route: 'Ethereum → Polygon',
    },
    {
      id: '0xabcd...ef01',
      fromToken: { symbol: 'USDC', name: 'USD Coin', chain: 'Polygon', address: '0x2791...', decimals: 6 },
      toToken: { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum', address: '0x0', decimals: 18 },
      amount: '2500',
      status: 'completed' as const,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      routingPreference: 'cheapest' as const,
      encryptedRoutingIntent: '0xcc7f4a8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
      route: 'Polygon → Ethereum',
    },
  ] as BridgeTransaction[],
  chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
};

