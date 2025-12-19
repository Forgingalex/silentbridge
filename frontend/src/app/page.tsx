'use client';

import { useState, useEffect } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { isDemoMode, setDemoMode } from '@/lib/demo-config';
import DemoBridge from '@/components/DemoBridge';

export default function Home() {
  // All hooks must be at the very first lines - no conditionals before hooks
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [demoMode, setDemoModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDemoModeState(isDemoMode());
  }, []);

  const toggleDemoMode = () => {
    const newMode = !demoMode;
    setDemoMode(newMode);
    setDemoModeState(newMode);
    if (newMode) {
      window.location.href = '/?demo=true';
    } else {
      window.location.href = '/';
    }
  };

  if (!mounted || !ready) {
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
    <main style={{ minHeight: '100vh' }}>
      {/* Demo Mode Toggle */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        background: '#1a1a1a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ fontWeight: 500, color: '#888', fontSize: '0.875rem' }}>
          Demo:
        </span>
        <button
          onClick={toggleDemoMode}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            background: demoMode ? '#10b981' : '#333',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {demoMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {demoMode ? (
        <DemoBridge />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#fff',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            SilentBridge
          </h1>
          <p style={{ fontSize: '1rem', marginBottom: '2rem', opacity: 0.8 }}>
            Privacy-Preserving Cross-Chain Bridge
          </p>
          <div style={{
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '16px',
            maxWidth: '480px',
            marginTop: '2rem',
          }}>
            <p style={{ marginBottom: '1rem', fontSize: '1rem', color: '#888' }}>
              ⚠️ Application is currently experiencing issues.
            </p>
            <p style={{ marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
              Enable <strong>Demo Mode</strong> to see a working demonstration
              of SilentBridge functionality.
            </p>
            <button
              onClick={toggleDemoMode}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                borderRadius: '12px',
                border: 'none',
                background: '#fff',
                color: '#000',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Enable Demo Mode
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

