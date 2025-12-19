# SilentBridge

A privacy-preserving cross-chain bridge with Fully Homomorphic Encryption (FHE) integration, featuring a high-fidelity Relay.link-inspired solar aesthetic.

![SilentBridge](https://img.shields.io/badge/SilentBridge-Private%20Bridge-FEDA15?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)

## 🌟 Features

### 🔐 Privacy-Preserving Bridge
- **FHE Encryption**: Simulated Fully Homomorphic Encryption for private routing preferences
- **Private Intent Routing**: Encrypt routing preferences (Fastest/Cheapest) without revealing them on-chain
- **Silent Explorer**: View encrypted transaction logs with privacy-shielded status

### 🎨 High-Fidelity UI
- **Relay-Style Solar Aesthetic**: Clean, bright design with #FEDA15 accent color
- **Seamless Input Flow**: Borderless, modern input design with oversized typography
- **Bento Box Grid**: Elegant transaction explorer with clean tile layout
- **Live Price Updates**: Real-time ETH price from CoinGecko API (updates every 15 seconds)

### 🔗 Multi-Chain Support
- **10+ EVM Testnets**: Sepolia, Zama Devnet, Base Sepolia, Polygon Amoy, Arbitrum Sepolia, Optimism Sepolia, Berachain Artio, Blast Sepolia, Linea Sepolia, Scroll Sepolia
- **Wallet Integration**: Privy.io authentication with embedded wallets
- **Network Selector**: Easy chain switching

### 🚀 Demo Mode
- **Mock FHE Service**: Simulates encryption without WASM dependencies
- **Full UI Functionality**: Complete bridge interface for demonstration
- **Transaction History**: Pre-populated with sample transactions
- **No External Dependencies**: Works without blockchain connections

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript
- **Styling**: CSS-in-JS (Inline styles)
- **Authentication**: Privy.io
- **Blockchain**: Viem
- **HTTP Client**: Axios
- **FHE SDK**: @zama-fhe/relayer-sdk (currently mocked)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Forgingalex/silentbridge.git
   cd silentbridge/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set **Root Directory** to `frontend`
   - Add environment variable: `NEXT_PUBLIC_PRIVY_APP_ID`
   - Click Deploy

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Main page component
│   │   ├── providers.tsx       # PrivyProvider wrapper
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   └── DemoBridge.tsx     # Main bridge UI component
│   └── lib/
│       ├── demo-config.ts     # Demo configuration & mock data
│       ├── fhe-bridge.ts      # FHE bridge integration (mocked)
│       └── fhe-mock.ts         # Mock FHE encryption service
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript configuration
```

## 🎯 Key Components

### DemoBridge Component
The main bridge interface featuring:
- Token selection (From/To)
- Amount input with live conversion rates
- Routing preference toggle (Fastest/Cheapest)
- Private intent encryption simulation
- Silent Explorer transaction grid

### FHE Mock Service
Simulates Zama FHE encryption:
- `simulateFheEncryption()`: Encrypts amounts with 2-second delay
- `simulateRoutingIntentEncryption()`: Encrypts routing preferences

### Demo Config
Pre-configured with:
- 10+ supported EVM testnets
- Mock tokens (ETH, USDC, etc.)
- Sample transaction history

## 🔧 Configuration

### Supported Chains

- **Sepolia** (ID: 11155111)
- **Zama Devnet** (ID: 8009)
- **Base Sepolia** (ID: 84532)
- **Polygon Amoy** (ID: 80002)
- **Arbitrum Sepolia** (ID: 421614)
- **Optimism Sepolia** (ID: 11155420)
- **Berachain Artio** (ID: 80085)
- **Blast Sepolia** (ID: 168587773)
- **Linea Sepolia** (ID: 59141)
- **Scroll Sepolia** (ID: 534351)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy.io App ID | Yes |

## 🎨 Design System

### Colors
- **Primary Accent**: #FEDA15 (Vibrant Yellow)
- **Background**: #F9FAFB (Off-White)
- **Card Background**: #FFFFFF (Pure White)
- **Text Primary**: #1A1A1A (Dark Charcoal)
- **Text Secondary**: #71717A (Light Grey)

### Typography
- **Font Family**: Inter, system fonts
- **Input Font Size**: 2.5rem (Oversized)
- **Font Weight**: 600-700 (Semi-bold to Bold)

## 🔒 Privacy Features

### Private Intent Routing
- User's routing preference (Fastest/Cheapest) is encrypted using simulated FHE
- Encrypted payload displayed as hex string
- On-chain logs show encrypted routing intent, proving privacy

### Silent Explorer
- Transaction history with privacy-shielded status
- Yellow dot indicator for completed/shielded transactions
- Truncated addresses (0x12...34) for clean display
- "View Private Routing" button reveals encrypted on-chain data

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### Build Errors
- **Module not found: axios**: Run `npm install axios`
- **Bufferutil errors**: Already configured in `next.config.js` as externals
- **WASM crashes**: All Zama SDK imports are commented out, using mock service

### Runtime Issues
- **Wallet connection fails**: Check `NEXT_PUBLIC_PRIVY_APP_ID` is set correctly
- **Price not updating**: Verify CoinGecko API is accessible (no API key required)
- **Styling issues**: Ensure all CSS is properly loaded

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🔗 Links

- **Repository**: [https://github.com/Forgingalex/silentbridge](https://github.com/Forgingalex/silentbridge)
- **Privy.io**: [https://privy.io](https://privy.io)
- **Zama FHE**: [https://zama.ai](https://zama.ai)
- **CoinGecko API**: [https://www.coingecko.com/api](https://www.coingecko.com/api)

## 🙏 Acknowledgments

- Inspired by [Relay.link](https://relay.link/bridge) design aesthetic
- Built with Next.js and Privy.io
- FHE concepts from Zama.ai

---

**Note**: This is a demo implementation with simulated FHE encryption. Replace mock services with actual Zama FHE SDK when stable.
