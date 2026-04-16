# CoinFlip — Product Requirements Document (PRD)

## 1. Vision

CoinFlip is a crypto-based probabilistic game where users grow or shrink their **in-game balance** through repeated fair coin tosses. Each toss applies an **up-multiplier** (heads) or **down-multiplier** (tails) to the session balance, creating compounding variance. The product targets engagement and repeat play while maintaining a **controlled house edge** via multiplicative asymmetry (`winMult × lossMult < 1`).

## 2. Objectives

- Ship a simple, repeatable gameplay loop (deposit → play → cash out).
- Keep session state and outcomes **server-authoritative**; chain handles MON in/out only.
- Maintain explicit **provably fair** toss derivation (commit–reveal, per toss).
- Support **Monad testnet** in Phase 1; mainnet is out of scope until a separate readiness review.

## 3. User stories (Phase 1 — MVP)

- As a player, I connect an EVM wallet on Monad testnet and see my credited balance after deposit.
- As a player, I choose a **risk mode**, start a **session**, and run **one toss at a time** (or continue / cash out after each toss).
- As a player, I see **current balance**, **profit/loss vs session start**, **streak count** (display only), and **published fairness data** (commit hash; reveal after tosses).
- As a player, I **cash out** to move session winnings/losses into my withdrawable balance and optionally **withdraw MON** to my wallet.

## 4. Definitions

- **Up-multiplier:** Applied on heads; value `> 1`.
- **Down-multiplier:** Applied on tails; value in `(0, 1)` — not a “negative factor.”
- **Toss outcome:** Fair binary **50/50** (heads/tails). Risk modes change **multipliers only**, not probability (unless a future PRD explicitly adds bias).
- **Session balance:** Running balance for the active session, starting from a chosen **stake** slice of withdrawable balance.

## 5. Game rules and math

### 5.1 Risk modes

| Mode       | Heads (up) | Tails (down) | `win × loss` | Drift per fair toss* |
| ---------- | ---------- | -------------- | ------------ | --------------------- |
| Safe       | 1.05       | 0.95           | 0.9975       | ≈ 0.9987              |
| Normal     | 1.10       | 0.90           | 0.99         | ≈ 0.995               |
| Aggressive | 1.20       | 0.80           | 0.96         | ≈ 0.98                |

\*Geometric expectation per fair 50/50 step: √(winMult × lossMult).

House edge follows from **winMult × lossMult < 1** for each mode.

### 5.2 Loop

1. User has withdrawable balance (from confirmed deposits minus withdrawals and settled sessions).
2. User selects risk mode and **stake** (subject to minimums).
3. Each **toss:** server derives outcome from seeds (see §7); balance ← balance × multiplier.
4. User **continues** (next toss) or **cash out** (session ends; balance movement applied to withdrawable balance).
5. Session also ends if balance falls below minimum playable unit (configurable) or user abandons (timeout policy TBD).

## 6. Streak mechanics

**Phase 1:** Track and display **consecutive wins** and **consecutive losses** only; **no bonus payouts**.

**Phase 2 (to specify):** Bonus multipliers, caps, and impact on house edge — exact schedule required before implementation.

## 7. Provably fair (required)

- **Per toss:** Before the toss, the client/server agreement exposes `serverSeedHash = H(serverSeed)` and binds `clientSeed` and `nonce` (toss index).
- **Outcome:** `outcome = f(serverSeed, clientSeed, nonce)` → heads/tails via deterministic derivation (documented algorithm in code).
- **Reveal:** After the toss, `serverSeed` is stored/revealed so anyone can verify `H(serverSeed) === serverSeedHash` and recompute the outcome.

No UI copy shall imply prediction of the **next** outcome (“estimated next outcome” is **out of scope**).

## 8. On-chain scope — Monad testnet

- **Network:** Monad Testnet, **chain ID 10143**, symbol **MON**.
- **RPC:** `https://testnet-rpc.monad.xyz` (see [Monad testnets](https://docs.monad.xyz/developer-essentials/testnets)).
- **Faucet:** `https://faucet.monad.xyz` (users need test MON for gas and deposits).
- **Deposits:** User sends MON to the app **treasury** address; credits apply after **confirmed** transfer (depth configurable).
- **Withdrawals:** Server-initiated transfer from treasury to the user’s address; limits and key handling are operational risks (see §12).

**Minimum deposit:** For testnet, enforce a minimum in **wei** (MON smallest unit), not USD — e.g. align with product config; USD peg is artificial on testnet.

## 9. Cash-out and session stats

On cash-out / session summary, show:

- Current session balance and **profit/loss vs session start**
- **Session stats:** tosses played, heads/tails counts, current streaks
- **Fairness:** link to verification of seeds (see implementation: verify page/API)

Do **not** show predictive “next outcome” estimates.

## 10. User interface (Phase 1)

- Real-time **session balance** and **withdrawable balance**
- **Coin** toss animation
- **Streak** indicator (display only)
- **Risk mode** display
- **Continue** and **Cash out** actions
- Wallet connect / network switch to Monad testnet

## 11. Non-goals (Phase 1)

- Monad **mainnet** production deployment
- Fiat on-ramps
- Full social graph, OAuth-required accounts (wallet is primary identity)
- Streak **bonus** payouts (deferred to Phase 2 spec)

## 12. Risks and compliance

- **Regulatory:** Products resembling gambling may be restricted by jurisdiction. **This document is not legal advice** — obtain qualified counsel before real-money or mainnet launch.
- **Operational:** Treasury private key compromise or mis-sent withdrawals — use testnet-only keys with minimal exposure; plan HSM/KMS for production.
- **Trust:** Mitigated by provably fair verification and transparent rules.
- **Churn:** Loss streaks; handle via product design, not hidden odds changes without disclosure.

## 13. Metrics and analytics events

| Metric / question        | Suggested event name     |
| ------------------------ | ------------------------ |
| Session length           | `session_ended` (duration) |
| Tosses per session       | `toss_completed` count   |
| Cash-out vs bust         | `cashout` / `session_ended` (reason) |
| Retention                | `user_returned` (daily)  |
| Deposits / revenue proxy | `deposit_confirmed`, `withdrawal_sent` |

## 14. Technical requirements (product ↔ engineering)

- **Frontend:** Next.js App Router, `wagmi` + `viem`, Monad testnet in wallet config.
- **Backend:** Route Handlers / Server Actions; **no client-trusted** balance or toss results.
- **Persistence:** **Prisma ORM 7** with **SQLite** via `@prisma/adapter-better-sqlite3` (connection URL in `prisma.config.ts`, `file:./dev.db` locally); for production use **PostgreSQL** with `@prisma/adapter-pg` (see `docker-compose.yml` example).
- **Observability:** Structured logs; hook points for the events in §13.

## 15. Roadmap

| Phase   | Scope |
| ------- | ----- |
| **1**   | Core loop, risk modes, treasury deposit/withdraw on testnet, provably fair per toss, UI per §10, streak **display** only |
| **2**   | Streak **bonuses** (specified), tuning, leaderboards |
| **3**   | Social: sharing, public leaderboards |
| **4**   | Mainnet readiness, token/economy expansion (separate PRD) |
