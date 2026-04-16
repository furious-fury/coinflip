# MonadCoinFlip (Foundry)

Solidity game contract for **full on-chain** bankroll, sessions, tosses, and cash-out on Monad. The Next.js app reads/writes this contract via wagmi (`NEXT_PUBLIC_COINFLIP_ADDRESS` in the repo root).

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, optional `anvil`)
- A Monad **testnet** RPC URL (e.g. `https://testnet-rpc.monad.xyz`) and a funded deployer account (testnet MON for gas)

## First-time setup (dependencies)

These paths are **not committed** (see the repo root `.gitignore`): `lib/`, `cache/`, `out/`.

- **`lib/`** — install with **`forge install`** (like `npm install` for Solidity deps).
- **`cache/`** / **`out/`** — created by **`forge build`**.

From this directory (`contracts/`), install **forge-std** (required by tests and scripts):

```bash
forge install foundry-rs/forge-std
```

Then build:

```bash
forge build
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/MonadCoinFlip.sol` | Contract: `deposit`, `withdraw`, `openSession`, `toss`, `cashOut`, `recoverExcess`, views |
| `test/MonadCoinFlip.t.sol` | Unit tests |
| `script/Deploy.s.sol` | Deployment script |
| `lib/` | Foundry libraries (e.g. `forge-std`), installed via `forge install` |

## Build and test

From this directory (`contracts/`):

```bash
forge build
forge test
forge test -vv   # verbose
```

From the **repository root** (optional npm scripts):

```bash
npm run contracts:build
npm run contracts:test
```

## Randomness (important)

The MVP uses **block-derived entropy** (`prevrandao`, block number, player, client seed, toss index)—documented in [`../docs/RNG.md`](../docs/RNG.md). That is suitable for **testnet demos**; production should plan a **VRF** (or similar) upgrade. Do not treat testnet randomness as miner-resistant for real stakes.

## Owner: recovering surplus MON

The deployer becomes **`owner`** (immutable). The contract tracks **`totalOwed`**: the sum of all player bankrolls plus active session balances.

- **`recoverExcess(address payable to)`** (only `owner`): sends `address(this).balance - totalOwed` to `to`. That is the **house surplus** from expected edge / busts, accidental transfers, or `selfdestruct` dust—**not** player liabilities.
- Reverts with `NothingToRecover` if there is no surplus.
- Anyone else calling it gets `Unauthorized`.

Use a **multisig or cold wallet** as deployer in production if this key can move funds.

## Deployment (Monad testnet)

### 1. Environment

Set **wei** amounts (18 decimals). Defaults match the app’s historical defaults if unset:

| Variable | Default (if omitted) | Meaning |
|----------|------------------------|---------|
| `MIN_DEPOSIT_WEI` | `10000000000000000` (0.01 MON) | Minimum each `deposit()` |
| `MIN_STAKE_WEI` | `1000000000000000` (0.001 MON) | Minimum `openSession` stake |

You can export them in the shell or put them in a **gitignored** `.env` in `contracts/` (Foundry loads `.env` automatically when running `forge script`).

### 2. Broadcast deploy

From `contracts/`:

```bash
export MONAD_TESTNET_RPC_URL="https://testnet-rpc.monad.xyz"

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$MONAD_TESTNET_RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY"
```

Replace `$PRIVATE_KEY` with your deployer key (testnet only; never commit keys). Alternatives Foundry supports: hardware wallet / keystore flags—see `forge script --help`.

The script logs:

```text
MonadCoinFlip deployed: 0x...
```

### 3. Wire the app

In the **repo root** `.env`:

```bash
NEXT_PUBLIC_COINFLIP_ADDRESS="0x<deployed_address>"
```

Restart the Next.js dev server so the client picks up the variable.

### 4. Verify on the explorer (optional)

On [MonadVision testnet](https://testnet.monadvision.com), use **Contract verification** with:

- Compiler: match `foundry.toml` / `forge build` output (e.g. Solidity `0.8.x`)
- Source: `src/MonadCoinFlip.sol` (flatten or standard-json if the explorer requires it)

If your Foundry version supports `forge verify-contract` for this chain, you can use that instead; configuration varies by explorer.

## Local chain (optional)

```bash
anvil
```

Deploy against local Anvil by pointing `--rpc-url` at `http://127.0.0.1:8545` and using Anvil’s default private key (see Anvil output). Fund the contract with test ETH/MON as needed for gameplay tests.

## Cast quick checks

After deployment (replace `ADDR` and `RPC`):

```bash
cast call ADDR "minDepositWei()(uint256)" --rpc-url RPC
cast call ADDR "minStakeWei()(uint256)" --rpc-url RPC
cast call ADDR "owner()(address)" --rpc-url RPC
cast call ADDR "totalOwed()(uint256)" --rpc-url RPC
cast call ADDR "balanceOf(address)(uint256)" YOUR_WALLET --rpc-url RPC
```

Recover surplus (must send from `owner`):

```bash
cast send ADDR "recoverExcess(address)" YOUR_SAFE_OR_EOA --rpc-url RPC --private-key OWNER_KEY
```

## Further reading

- Foundry book: https://book.getfoundry.sh/
- RNG notes and VRF upgrade path: [`../docs/RNG.md`](../docs/RNG.md)
- App env template: [`../.env.example`](../.env.example)
