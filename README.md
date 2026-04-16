# CoinFlip

Provably fair coin-toss game on **Monad testnet** (chain ID **10143**). Players connect a wallet, sign in, and play against a **deployed `MonadCoinFlip` contract**: native **MON** bankroll, sessions, on-chain tosses, and cash-out. The UI uses **wagmi** for reads and writes; fairness is checked against chain data (see in-app **`/verify`** and [`docs/RNG.md`](./docs/RNG.md)).

## How it works

### Trust model

- **On-chain:** Game **bankroll, sessions, toss outcomes, and balances** live in **`MonadCoinFlip`**. Players `deposit()` MON, `openSession()` with risk mode and client seed, `toss()` for each flip, and `cashOut()` to return funds to their on-chain balance. The contract tracks liabilities; the **owner** can `recoverExcess()` for house surplus only (see [`contracts/README.md`](./contracts/README.md)).
- **Randomness (MVP):** Toss entropy uses **block-derived values** (`prevrandao`, block number, player, client seed, toss index)—suitable for **testnet demos**, not claimed miner-resistant for high stakes. See [`docs/RNG.md`](./docs/RNG.md).

### Authentication

1. The user connects a wallet (e.g. MetaMask) on **Monad testnet**.
2. The app requests a **nonce** from `/api/auth/nonce` and shows a short **sign-in message** (includes address and nonce).
3. The user **signs** that message with their wallet.
4. The server verifies the signature with **viem**, creates or loads a **User** row keyed by wallet address, and issues an **HTTP-only cookie** with a signed JWT (`AUTH_SECRET`). Optional API routes can use this identity; **game actions are on-chain** via the connected wallet.

### Playing

1. Set **`NEXT_PUBLIC_COINFLIP_ADDRESS`** in `.env` to your deployed contract (see [`contracts/README.md`](./contracts/README.md)).
2. Connect the wallet on Monad testnet, **sign in**, and ensure you have test **MON** ([faucet](https://faucet.monad.xyz)).
3. **`deposit()`** — send MON into the contract bankroll (subject to on-chain minimums).
4. **`openSession`** — choose risk mode and stake; pass a **client seed** (hashed on-chain).
5. **`toss`** — each toss is a transaction; outcome and balance updates come from **contract events**.
6. **`cashOut`** — end the session and credit your contract balance.

Use the in-app **`/verify`** flow to validate a toss against chain receipts and the documented entropy formula.

### Risk modes (multipliers)

Each mode applies different **up** (heads) and **down** (tails) multipliers on the **session** balance. Probability is still 50/50; long-run expectation is negative because the mode multipliers encode a house edge. Product detail remains in [PRD.md](./PRD.md).

## Stack

- **Next.js** (App Router), React, TypeScript, Tailwind CSS
- **wagmi** + **viem** for wallets and **MonadCoinFlip** calls
- **Three.js** (React Three Fiber) for the coin UI
- **Prisma ORM 7** + **SQLite** (`file:./dev.db`) for **auth-linked user records** (`@prisma/adapter-better-sqlite3`)
- **Foundry** — Solidity contract in [`contracts/`](./contracts/) (see [`contracts/README.md`](./contracts/README.md))

## Prerequisites

- Node.js 20+ recommended
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`) if you build or test the contract locally
- A wallet (e.g. MetaMask) with **Monad Testnet** added  
  - RPC: `https://testnet-rpc.monad.xyz`  
  - Explorer: [MonadVision (testnet)](https://testnet.monadvision.com)
- Test **MON** from the [official faucet](https://faucet.monad.xyz)

## Setup

1. Install dependencies (this runs `prisma generate` via `postinstall`):

   ```bash
   npm install
   ```

2. Copy environment variables and edit values:

   ```bash
   cp .env.example .env
   ```

   Required:

   - **`AUTH_SECRET`** — at least 32 random characters (used to sign session cookies).
   - **`NEXT_PUBLIC_COINFLIP_ADDRESS`** — deployed `MonadCoinFlip` address on Monad testnet. Deploy from [`contracts/`](./contracts/) or use an existing deployment.

   See [`.env.example`](./.env.example) for chain ID, RPC overrides, and legacy notes.

3. Create or update the database:

   ```bash
   npx prisma migrate deploy
   ```

   For local schema iteration you can use `npx prisma migrate dev` instead.

4. **Contract dependencies (first clone / clean `contracts/`):** `lib/`, `cache/`, and `out/` are gitignored. From `contracts/`:

   ```bash
   forge install foundry-rs/forge-std
   forge build
   ```

   Or from the repo root: `npm run contracts:build` (requires `lib/` present—run `forge install` once). Full detail: [`contracts/README.md`](./contracts/README.md).

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect the wallet, switch to Monad testnet, **sign in**, **deposit** via the UI, then **open session** and **toss**.

Other commands:

```bash
npm run build           # production build
npm run start           # run production server
npm run lint            # ESLint
npm run contracts:build # forge build in contracts/
npm run contracts:test  # forge test in contracts/
npx prisma studio       # optional DB browser
```

## Project layout (high level)

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages (`/`, `/verify`, …) and API routes (`/api/auth/*`, …) |
| `src/components/` | UI (`game-app.tsx`, `coin-3d.tsx`, `web3-provider.tsx`, …) |
| `src/lib/` | Chain config, ABIs, Prisma client, fairness helpers |
| `contracts/` | Foundry project: `MonadCoinFlip.sol`, tests, deploy script ([`contracts/README.md`](./contracts/README.md)) |
| `prisma/schema.prisma` | Data model (users / legacy tables as applicable) |
| `prisma.config.ts` | Prisma CLI config |
| `docs/RNG.md` | On-chain toss entropy and verification notes |
| `PRD.md` | Product requirements |

The generated Prisma client is written to `src/generated/prisma` (ignored by git; recreated by `npm install` / `prisma generate`).

## Production / Postgres

Local development uses SQLite. For production, point `DATABASE_URL` at PostgreSQL, switch the `provider` in `prisma/schema.prisma` to `postgresql`, use `@prisma/adapter-pg` in `src/lib/prisma.ts`, and run migrations against the new database. See [Prisma’s upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) and optional [docker-compose.yml](./docker-compose.yml) for a local Postgres example.

## Security note

Never commit `.env` or real private keys. Contract **owner** and deployer keys control privileged functions; treat testnet keys as disposable and plan multisig / custody before any mainnet use.

## Documentation

- [Monad testnets](https://docs.monad.xyz/developer-essentials/testnets)
- [Prisma config (v7)](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Foundry book](https://book.getfoundry.sh/)
