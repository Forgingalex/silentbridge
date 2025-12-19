/**
 * Mock FHE Service
 * 
 * Simulates Zama FHE encryption without WASM dependencies.
 * Replace with actual @zama-fhe/relayer-sdk when stable.
 */

/**
 * Simulates FHE encryption with a 2-second delay
 * Returns a fake ciphertext hex string
 */
export async function simulateFheEncryption(amount: number): Promise<string> {
  // Simulate encryption delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate fake ciphertext (hex string format)
  const randomHex = Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return `0x7f4a${randomHex}`;
}

/**
 * Simulates FHE encryption of routing preferences
 * Returns a long encrypted intent payload hex string
 */
export async function simulateRoutingIntentEncryption(preference: 'fastest' | 'cheapest'): Promise<string> {
  // Simulate encryption delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate longer fake ciphertext for routing intent (128 hex chars = 64 bytes)
  const randomHex = Array.from({ length: 120 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  // Prefix indicates encrypted routing intent
  return `0x${preference === 'fastest' ? 'ff' : 'cc'}${randomHex}`;
}

