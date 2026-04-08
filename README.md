# MediChain — Fake Medicine Detection & Supply Chain Verification

> Every Medicine. Verified. Always.

MediChain is a production-ready decentralized application (dApp) that uses Ethereum smart contracts to register, track, and verify medicine batches across the pharmaceutical supply chain. Patients can scan a QR code to instantly verify whether their medicine is genuine — no wallet required.

## Architecture

```
medichain/
├── contracts/                    ← Solidity smart contracts
│   ├── interfaces/IMediChain.sol ← Interface definition
│   ├── RoleManager.sol           ← OpenZeppelin AccessControl
│   └── MediChainCore.sol         ← Main supply chain contract
├── scripts/
│   ├── deploy.js                 ← Hardhat deployment script
│   └── verify.js                 ← Etherscan verification
├── test/
│   └── MediChain.test.js         ← 30+ comprehensive tests
├── hardhat.config.js
└── frontend/                     ← Next.js 14 + TypeScript
    ├── app/
    │   ├── page.tsx              ← Landing page
    │   ├── verify/               ← Patient verification (no wallet)
    │   ├── manufacturer/         ← Register batches
    │   ├── distributor/          ← Transfer batches
    │   ├── pharmacy/             ← Receive & sell
    │   └── dashboard/            ← Admin panel
    ├── components/
    │   ├── WalletConnect.tsx
    │   ├── QRScanner.tsx
    │   ├── QRGenerator.tsx
    │   ├── BatchCard.tsx
    │   ├── SupplyChainTimeline.tsx
    │   ├── RoleGuard.tsx
    │   └── TxButton.tsx
    └── lib/
        ├── contract.ts           ← All contract calls
        ├── web3.ts               ← ethers.js helpers
        └── types.ts              ← Shared TypeScript types
```

## Smart Contract Overview

### RoleManager.sol
- 4 roles: `MANUFACTURER_ROLE`, `DISTRIBUTOR_ROLE`, `PHARMACY_ROLE`, `DEFAULT_ADMIN_ROLE`
- Only `DEFAULT_ADMIN_ROLE` can grant/revoke roles
- Emits `RoleGrantedTo` / `RoleRevokedFrom` events

### MediChainCore.sol
- Inherits: `Ownable`, `Pausable`, `ReentrancyGuard`
- Batch lifecycle: `Manufactured → InTransit → AtPharmacy → Sold`
- Manufacturers can recall any batch at any stage
- Public `verifyBatch()` — works with read-only provider (no wallet)
- `isBatchGenuine()` — quick boolean check for QR scan results
- Full transfer history stored on-chain per batch

### Security Features
- `ReentrancyGuard` on all state-changing functions
- Owner-only `pause()` / `unpause()` for emergency stops
- Batch ID uniqueness enforced on registration
- Only current batch owner can transfer
- Only original manufacturer can recall
- Expiry date validation at registration time

---

## Local Development

### Prerequisites
- Node.js ≥ 18
- MetaMask browser extension
- (Optional) Alchemy account for Sepolia

### 1. Install dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Start local blockchain
```bash
npx hardhat node
```

### 3. Deploy contracts locally
```bash
# In a new terminal
npx hardhat run scripts/deploy.js --network localhost
```

This will:
- Deploy `RoleManager` and `MediChainCore`
- Grant all 3 roles to the deployer for testing
- Seed 3 demo batches (genuine, at-pharmacy, recalled)
- Write ABI to `frontend/public/abi/MediChain.json`
- Write contract address to `frontend/.env.local`

### 4. Start frontend
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Configure MetaMask for local
- Network: Localhost 8545
- Chain ID: 31337
- Import account using one of the private keys printed by `npx hardhat node`

---

## Deploy to Sepolia Testnet

### Step 1 — Get Sepolia ETH
Get free testnet ETH at: https://sepoliafaucet.com or https://faucet.sepolia.dev

### Step 2 — Get Alchemy API key
Sign up at https://www.alchemy.com, create an app on **Sepolia**, copy the HTTPS URL.

### Step 3 — Get Etherscan API key
Sign up at https://etherscan.io, go to My Profile → API Keys.

### Step 4 — Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
PRIVATE_KEY=your_wallet_private_key_without_0x
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key
```

### Step 5 — Deploy
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Output will show:
```
RoleManager:    0x...
MediChainCore:  0x...
View on Etherscan: https://sepolia.etherscan.io/address/0x...
```

### Step 6 — Verify contracts on Etherscan
```bash
npx hardhat run scripts/verify.js --network sepolia
```
or manually:
```bash
npx hardhat verify --network sepolia ROLE_MANAGER_ADDRESS "DEPLOYER_ADDRESS"
npx hardhat verify --network sepolia MEDICHAIN_ADDRESS "ROLE_MANAGER_ADDRESS"
```

### Step 7 — Deploy frontend to Vercel
```bash
cd frontend
vercel deploy --prod
```

Set these environment variables in Vercel dashboard:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_deployed_address
NEXT_PUBLIC_ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ROLE_MANAGER_ADDRESS=0x_role_manager_address
```

---

## Running Tests

```bash
npx hardhat test
```

```bash
npx hardhat test --grep "Batch Registration"   # Run specific suite
npx hardhat test --reporter verbose             # Verbose output
REPORT_GAS=true npx hardhat test               # Show gas costs
```

Test coverage:
1. Deployment — deployer roles, initial state
2. Role management — grant/revoke, access control
3. Batch registration — valid, duplicate, expired, zero quantity
4. Transfers — full chain, wrong role, wrong owner, state checks
5. Verification — verifyBatch, isBatchGenuine, getBatchHistory
6. Recall — manufacturer recall, cross-manufacturer protection
7. Pause/Emergency — pause/unpause, blocked operations
8. Stats & Enumeration — counters, getAllBatchIds

---

## User Guide

### Patient (no wallet needed)
1. Open `/verify` on any browser (desktop or mobile)
2. Tap **Scan QR** to use camera, or type the batch ID manually
3. Instant result: ✅ Genuine / ⚠️ Recalled / ❌ Not Found

### Manufacturer
1. Connect MetaMask on Sepolia
2. Go to `/manufacturer`
3. Fill in batch details → Submit → MetaMask popup appears
4. After confirmation: QR code is generated automatically
5. Print/download QR and attach to medicine packaging

### Distributor
1. Connect MetaMask (with `DISTRIBUTOR_ROLE`)
2. Go to `/distributor`
3. Enter batch ID + pharmacy wallet address → Transfer

### Pharmacy
1. Connect MetaMask (with `PHARMACY_ROLE`)
2. Go to `/pharmacy`
3. Look up batch → Verify it's assigned to you → Dispense units partially, or mark as entirely sold.

### Admin
1. Connect MetaMask (with `DEFAULT_ADMIN_ROLE`)
2. Go to `/dashboard`
3. Grant/revoke roles for participants

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity ^0.8.20 |
| Contract Libraries | OpenZeppelin 5.0 |
| Dev Framework | Hardhat 2.19 |
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS 3.4 |
| Web3 | ethers.js v6 |
| Wallet | MetaMask |
| QR Generation | qrcode.react |
| QR Scanning | html5-qrcode |
| Blockchain | Ethereum Sepolia |
| RPC | Alchemy |
| Frontend Deploy | Vercel |

---

## Demo Mode

The app includes built-in demo data that works even before contracts are deployed. Try these batch IDs on the `/verify` page:

| Batch ID | Status | Description |
|----------|--------|-------------|
| `DEMO-BATCH-001` | ✅ Sold | Fully dispensed/sold out |
| `DEMO-BATCH-002` | 🔄 Partially Dispensed | At Pharmacy, 150/500 units dispensed |
| `DEMO-BATCH-003` | 🚚 In Transit | At Distributor pending delivery |
| `DEMO-BATCH-004` | 🏭 Manufactured | Newly registered |
| `DEMO-BATCH-RECALLED` | ⚠️ Recalled | Contamination recall example |

---

## Environment Variables Summary

```bash
# Root (.env)
PRIVATE_KEY=                    # Deployer wallet private key
ALCHEMY_SEPOLIA_URL=            # Alchemy Sepolia RPC URL
ETHERSCAN_API_KEY=              # For contract verification

# Frontend (frontend/.env.local) — auto-written by deploy.js
NEXT_PUBLIC_CONTRACT_ADDRESS=   # MediChainCore address
NEXT_PUBLIC_ROLE_MANAGER_ADDRESS= # RoleManager address
NEXT_PUBLIC_ALCHEMY_URL=        # Same Alchemy URL (public)
```

---

## License

MIT — use freely for educational, research, or commercial purposes.
