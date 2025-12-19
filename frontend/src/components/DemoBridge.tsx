'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import axios from 'axios';
import { demoData, Token, BridgeTransaction } from '@/lib/demo-config';
import { bridgeTokens } from '@/lib/fhe-bridge';
import { simulateRoutingIntentEncryption } from '@/lib/fhe-mock';

export default function DemoBridge() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [fromToken, setFromToken] = useState<Token>(demoData.tokens[0]);
  const [toToken, setToToken] = useState<Token>(demoData.tokens[2]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [routingPreference, setRoutingPreference] = useState<'fastest' | 'cheapest'>('fastest');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEncryptingRouting, setIsEncryptingRouting] = useState(false);
  const [encryptedIntentPayload, setEncryptedIntentPayload] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BridgeTransaction[]>(demoData.transactions);
  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null);
  const [selectedChain, setSelectedChain] = useState(11155111);
  const [viewingPrivateRouting, setViewingPrivateRouting] = useState<string | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [estimatedReceived, setEstimatedReceived] = useState<string>('');

  // Privacy Premium fee (0.1%)
  const PRIVACY_PREMIUM_FEE = 0.001;

  const supportedChains = [
    { id: 11155111, name: 'Ethereum Sepolia' },
    { id: 8009, name: 'Zama Devnet' },
    { id: 84532, name: 'Base Sepolia' },
    { id: 80002, name: 'Polygon Amoy' },
    { id: 421614, name: 'Arbitrum Sepolia' },
    { id: 11155420, name: 'Optimism Sepolia' },
    { id: 80085, name: 'Berachain Artio' },
    { id: 168587773, name: 'Blast Sepolia' },
    { id: 59141, name: 'Linea Sepolia' },
    { id: 534351, name: 'Scroll Sepolia' },
  ];

  const walletAddress = wallets?.[0]?.address || '';
  const displayAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  // Helper function to truncate addresses
  const truncateAddress = (address: string, start: number = 6, end: number = 4): string => {
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  const handleBridge = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    setIsProcessing(true);
    setIsEncryptingRouting(true);
    setEncryptedIntentPayload(null);

    try {
      // Step 1: Encrypt routing preferences with FHE
      const encryptedIntent = await simulateRoutingIntentEncryption(routingPreference);
      setIsEncryptingRouting(false);
      setEncryptedIntentPayload(encryptedIntent);

      // Step 2: Bridge tokens with FHE encryption
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await bridgeTokens({
        fromToken,
        toToken,
        amount: fromAmount,
      });

      // Generate route string
      const route = `${fromToken.chain} → ${toToken.chain}`;

      // Add new transaction
      const newTransaction: BridgeTransaction = {
        id: result.transactionHash,
        fromToken,
        toToken,
        amount: fromAmount,
        status: result.status,
        timestamp: new Date().toISOString(),
        routingPreference,
        encryptedRoutingIntent: encryptedIntent,
        route,
      };

      setTransactions([newTransaction, ...transactions]);
      setIsProcessing(false);
      setFromAmount('');
      setToAmount('');
      setEncryptedIntentPayload(null);

      // Show success modal
      setSuccessTxHash(result.transactionHash);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Bridge error:', error);
      setIsProcessing(false);
      setIsEncryptingRouting(false);
      setEncryptedIntentPayload(null);
      alert('Bridge failed. Please try again.');
    }
  };

  const selectToken = (token: Token, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromToken(token);
      const compatibleToken = demoData.tokens.find(
        t => t.symbol === token.symbol && t.chain !== token.chain
      );
      if (compatibleToken) {
        setToToken(compatibleToken);
      }
    } else {
      setToToken(token);
    }
    setShowTokenSelector(null);
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const availableTokens = (type: 'from' | 'to') => {
    if (type === 'from') {
      return demoData.tokens.filter(t => t.chain !== toToken.chain);
    }
    return demoData.tokens.filter(t => t.chain !== fromToken.chain);
  };

  // Fetch ETH price from CoinGecko
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const price = response.data.ethereum.usd;
        setEthPrice(price);
        setConversionRate(price);
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        // Fallback price if API fails
        setEthPrice(3000);
        setConversionRate(3000);
      }
    };

    // Fetch immediately
    fetchEthPrice();

    // Update every 15 seconds
    const interval = setInterval(fetchEthPrice, 15000);

    return () => clearInterval(interval);
  }, []);

  // Update conversion when amount or price changes
  useEffect(() => {
    if (fromAmount && ethPrice && fromToken.symbol === 'ETH') {
      const amount = parseFloat(fromAmount);
      if (!isNaN(amount) && amount > 0) {
        // Calculate: Amount * LivePrice * (1 - Privacy Premium)
        const baseAmount = amount * ethPrice;
        const afterFee = baseAmount * (1 - PRIVACY_PREMIUM_FEE);
        setEstimatedReceived(afterFee.toFixed(2));
        
        // Update toAmount for display
        setToAmount(afterFee.toFixed(2));
      } else {
        setEstimatedReceived('');
        setToAmount('');
      }
    } else if (!fromAmount) {
      setEstimatedReceived('');
      setToAmount('');
    }
  }, [fromAmount, ethPrice, fromToken.symbol]);

  if (!ready) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '480px', 
      margin: '0 auto', 
      padding: '2rem 1rem',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        width: '100%',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            SilentBridge
          </h1>
        </div>
        
        {/* Wallet Connect/Disconnect Button */}
        <div style={{ marginLeft: 'auto' }}>
          {authenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                style={{
                  background: '#FEDA15',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.5rem 1.25rem',
                  color: '#000000',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>{displayAddress}</span>
                <span>▼</span>
              </button>
              {showWalletDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  minWidth: '200px',
                  zIndex: 1000,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}>
                  <div style={{
                    padding: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#71717A',
                    borderBottom: '1px solid #E4E4E7',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all',
                  }}>
                    {walletAddress}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowWalletDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={login}
              style={{
                background: '#FEDA15',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.5rem 1.25rem',
                color: '#000000',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Network Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(Number(e.target.value))}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '12px',
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            color: '#1A1A1A',
            fontSize: '0.9rem',
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          {supportedChains.map(chain => (
            <option key={chain.id} value={chain.id} style={{ background: '#FFFFFF' }}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bridge Card - High-Fidelity Relay Style */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '32px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(161, 161, 170, 0.1)',
        maxWidth: '100%',
        width: '100%',
      }}>
        {/* Seamless From/To Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* From Token Input - Seamless */}
          <div style={{
            background: '#FAFAFA',
            borderRadius: '0',
            padding: '1.5rem',
            borderBottom: '1px solid #F4F4F5',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#71717A', fontWeight: 500 }}>From</span>
              <span style={{ fontSize: '0.75rem', color: '#71717A' }}>
                Balance: {authenticated ? '1.234' : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => {
                  setFromAmount(e.target.value);
                }}
                placeholder="0.0"
                disabled={isProcessing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  color: '#1A1A1A',
                  width: '100%',
                  outline: 'none',
                  opacity: isProcessing ? 0.5 : 1,
                  letterSpacing: '-0.02em',
                  transition: 'all 0.2s',
                }}
              />
              <button
                onClick={() => setShowTokenSelector('from')}
                disabled={isProcessing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.5rem 1rem',
                  color: '#1A1A1A',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = '#FAFAFA';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {fromToken.symbol}
                <span style={{ fontSize: '0.75rem' }}>▼</span>
              </button>
            </div>
            {/* Live Price Label */}
            {fromToken.symbol === 'ETH' && ethPrice && (
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: '0.5rem', fontWeight: 400 }}>
                1 ETH = ${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Swap Button - Circular with Rotation */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0', position: 'relative' }}>
            <button
              onClick={() => {
                swapTokens();
                // Trigger rotation animation
                const btn = document.getElementById('swap-btn');
                if (btn) {
                  btn.style.animation = 'rotate-swap 0.3s ease-in-out';
                  setTimeout(() => {
                    btn.style.animation = '';
                  }, 300);
                }
              }}
              disabled={isProcessing}
              id="swap-btn"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                color: '#1A1A1A',
                opacity: isProcessing ? 0.5 : 1,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
            >
              ⇅
            </button>
          </div>

          {/* To Token Input - Seamless */}
          <div style={{
            background: '#FAFAFA',
            borderRadius: '0',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#71717A', fontWeight: 500 }}>To</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="number"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                placeholder="0.0"
                disabled={isProcessing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  color: '#1A1A1A',
                  width: '100%',
                  outline: 'none',
                  opacity: isProcessing ? 0.5 : 1,
                  letterSpacing: '-0.02em',
                  transition: 'all 0.2s',
                }}
              />
              <button
                onClick={() => setShowTokenSelector('to')}
                disabled={isProcessing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.5rem 1rem',
                  color: '#1A1A1A',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = '#FAFAFA';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {toToken.symbol}
                <span style={{ fontSize: '0.75rem' }}>▼</span>
              </button>
            </div>
            {/* Estimated Received */}
            {estimatedReceived && fromAmount && parseFloat(fromAmount) > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: '0.5rem', fontWeight: 400 }}>
                You Receive: ${estimatedReceived} USDC
                <span style={{ fontSize: '0.7rem', color: '#71717A', marginLeft: '0.25rem' }}>
                  (Privacy Premium: {(PRIVACY_PREMIUM_FEE * 100).toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Routing Preference Toggle */}
        <div style={{
          background: '#F7F8FA',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem',
          border: '1px solid #E4E4E7',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#71717A', marginBottom: '0.75rem', fontWeight: 500 }}>
            Routing Preference
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setRoutingPreference('fastest')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: routingPreference === 'fastest' ? '2px solid #000000' : '1px solid #E4E4E7',
                background: routingPreference === 'fastest' ? '#FEDA15' : '#F7F8FA',
                color: routingPreference === 'fastest' ? '#000000' : '#71717A',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              Fastest
            </button>
            <button
              onClick={() => setRoutingPreference('cheapest')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: routingPreference === 'cheapest' ? '2px solid #000000' : '1px solid #E4E4E7',
                background: routingPreference === 'cheapest' ? '#FEDA15' : '#F7F8FA',
                color: routingPreference === 'cheapest' ? '#000000' : '#71717A',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              Cheapest
            </button>
          </div>
        </div>

        {/* Encrypting Routing Intent Animation */}
        {isEncryptingRouting && (
          <div style={{
            background: '#F7F8FA',
            border: '1px solid #FEDA15',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            <div style={{ 
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '3px solid #F7F8FA',
              borderTop: '3px solid #FEDA15',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '0.5rem',
            }} />
            <div style={{ color: '#1A1A1A', fontSize: '0.9rem', fontWeight: 600 }}>
              Encrypting Routing Preferences with Zama FHE...
            </div>
          </div>
        )}

        {/* Encrypted Intent Payload Display */}
        {encryptedIntentPayload && (
          <div style={{
            background: '#F7F8FA',
            border: '1px solid #E4E4E7',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#71717A', marginBottom: '0.5rem', fontWeight: 500 }}>
              Encrypted Intent Payload:
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: '#1A1A1A',
              wordBreak: 'break-all',
              background: '#FFFFFF',
              padding: '0.75rem',
              borderRadius: '8px',
              lineHeight: '1.5',
              border: '1px solid #E4E4E7',
            }}>
              {encryptedIntentPayload}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#71717A', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Your routing preference is now hidden via FHE encryption
            </div>
          </div>
        )}

        {/* Bridge Button - High-Fidelity */}
        <button
          onClick={() => {
            if (!authenticated) {
              login();
            } else {
              handleBridge();
            }
          }}
          disabled={isProcessing || (authenticated && (!fromAmount || parseFloat(fromAmount) <= 0))}
          style={{
            width: '100%',
            padding: '1.25rem',
            borderRadius: '16px',
            border: 'none',
            background: isProcessing || (authenticated && (!fromAmount || parseFloat(fromAmount) <= 0))
              ? '#F4F4F5'
              : '#FEDA15',
            color: isProcessing || (authenticated && (!fromAmount || parseFloat(fromAmount) <= 0))
              ? '#71717A'
              : '#000000',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: isProcessing || (authenticated && (!fromAmount || parseFloat(fromAmount) <= 0)) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isProcessing || (authenticated && (!fromAmount || parseFloat(fromAmount) <= 0))
              ? 'none'
              : '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(254, 218, 21, 0.3)',
          }}
          onMouseOver={(e) => {
            if (!isProcessing && authenticated && fromAmount && parseFloat(fromAmount) > 0) {
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1), 0 0 20px rgba(254, 218, 21, 0.5), 0 6px 16px rgba(254, 218, 21, 0.4)';
              e.currentTarget.style.filter = 'drop-shadow(0 0 10px rgba(254, 218, 21, 0.5))';
            }
          }}
          onMouseOut={(e) => {
            if (!isProcessing && authenticated && fromAmount && parseFloat(fromAmount) > 0) {
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(254, 218, 21, 0.3)';
              e.currentTarget.style.filter = 'none';
            }
          }}
        >
          {isProcessing
            ? 'Processing...'
            : !authenticated
            ? 'Connect Wallet'
            : authenticated && fromAmount && parseFloat(fromAmount) > 0
            ? 'Bridge Now'
            : `Bridge ${fromToken.symbol} → ${toToken.symbol}`}
        </button>

        {/* Demo Notice */}
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#FAFAFA',
          border: '1px solid #F4F4F5',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#71717A',
          textAlign: 'center',
        }}>
          🔒 Demo Mode: FHE encryption simulated
        </div>
      </div>

      {/* Silent Explorer - Bento Box Grid */}
      {transactions.length > 0 && (
        <div style={{
          marginTop: '2rem',
        }}>
          <h3 style={{ color: '#1A1A1A', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Silent Explorer
          </h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {transactions.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: '1.25rem',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #F4F4F5',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {tx.status === 'completed' && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#FEDA15',
                        display: 'inline-block',
                        boxShadow: '0 0 8px rgba(254, 218, 21, 0.6)',
                        flexShrink: 0,
                      }} />
                    )}
                    <div style={{ color: '#1A1A1A', fontSize: '0.875rem', fontWeight: 600 }}>
                      {tx.fromToken.symbol} → {tx.toToken.symbol}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#71717A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}>
                    {truncateAddress(tx.id, 6, 6)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ color: '#1A1A1A', fontSize: '0.875rem', fontWeight: 600 }}>
                    {tx.amount} {tx.fromToken.symbol}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 'fit-content',
                    background: tx.status === 'completed'
                      ? '#F0FDF4'
                      : '#FEF3C7',
                    color: tx.status === 'completed' ? '#059669' : '#D97706',
                    border: tx.status === 'completed' ? '1px solid #D1FAE5' : '1px solid #FDE68A',
                    fontWeight: 600,
                  }}>
                    {tx.status === 'completed' ? 'Privacy Shielded' : 'Pending'}
                  </div>
                </div>
                {tx.status === 'completed' && (
                  <button
                    onClick={() => setViewingPrivateRouting(tx.id)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'transparent',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      color: '#1A1A1A',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginTop: '0.25rem',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#FAFAFA';
                      e.currentTarget.style.borderColor = '#FEDA15';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#E4E4E7';
                    }}
                  >
                    View Routing
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Private Routing Modal */}
      {viewingPrivateRouting && (() => {
        const tx = transactions.find(t => t.id === viewingPrivateRouting);
        if (!tx) return null;
        
        return (
          <div
            onClick={() => setViewingPrivateRouting(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '1rem',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#121212',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '600px',
                width: '100%',
                border: '1px solid rgba(254, 218, 21, 0.3)',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>
                  On-Chain Log
                </h3>
                <button
                  onClick={() => setViewingPrivateRouting(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(5, 5, 5, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(254, 218, 21, 0.05)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Status:</div>
                  <div style={{ color: '#10b981', fontSize: '1rem', fontWeight: 600 }}>Completed</div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(5, 5, 5, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(254, 218, 21, 0.05)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Route:</div>
                  <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{tx.route || `${tx.fromToken.chain} → ${tx.toToken.chain}`} (Public)</div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(5, 5, 5, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(254, 218, 21, 0.2)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Routing Intent:</div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#FEDA15',
                    wordBreak: 'break-all',
                    background: '#000000',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                  }}>
                    {tx.encryptedRoutingIntent || '[ENCRYPTED_DATA_SHIELDED]'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
                    This proves the FHE is "embedded"
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(5, 5, 5, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(254, 218, 21, 0.05)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Relayer Decision:</div>
                  <div style={{ color: '#10b981', fontSize: '1rem', fontWeight: 600 }}>Verified via FHE Proof</div>
                </div>
              </div>

              <button
                onClick={() => setViewingPrivateRouting(null)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                background: '#FEDA15',
                color: '#000000',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            </div>
          </div>
        );
      })()}

      {/* Success Modal */}
      {showSuccessModal && successTxHash && (
        <div
          onClick={() => setShowSuccessModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#121212',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '2rem',
              }}>
                ✓
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Bridge Successful!
              </h3>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>
                Cross-chain transfer completed
              </p>
            </div>
            <div style={{
              background: 'rgba(5, 5, 5, 0.6)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(254, 218, 21, 0.1)',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
                Transaction Hash:
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#FEDA15',
                wordBreak: 'break-all',
              }}>
                {successTxHash}
              </div>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessTxHash(null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                background: '#FEDA15',
                color: '#000000',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <div
          onClick={() => setShowTokenSelector(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#121212',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
                Select Token
              </h3>
              <button
                onClick={() => setShowTokenSelector(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {availableTokens(showTokenSelector).map((token) => (
                <button
                  key={`${token.chain}-${token.symbol}`}
                  onClick={() => selectToken(token, showTokenSelector)}
                  style={{
                    background: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {token.symbol}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {token.name} • {token.chain}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
