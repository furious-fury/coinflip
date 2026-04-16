# Randomness strategy (Monad CoinFlip)

## Research summary (Phase 0)

- **Chainlink VRF** is listed for Monad in [Monad oracles docs](https://docs.monad.xyz/tooling-and-infra/oracles); production deployments should use VRF v2.5 with documented coordinator/wrapper addresses for the target network.
- **Pyth Entropy** has a testnet address in Monad docs (`0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320` per oracle table) — optional future integration.
- **Switchboard** advertises verifiable randomness on Monad — alternative if you standardize on their SDK.

## What the shipped contract uses (MVP)

`MonadCoinFlip.sol` derives each toss from:

`keccak256(abi.encodePacked(block.prevrandao, block.number, msg.sender, session.clientSeed, session.tossCount))`

with **heads** = LSB of the hash word (same 50/50 split idea as the legacy server).

This is **single-transaction**, needs **no LINK/subscription**, and is appropriate for **testnet demos**. It is **not** equivalent to Chainlink VRF: block proposers have theoretical influence on `prevrandao` / ordering. For mainnet or real-money play, **replace** this with VRF fulfillment in a dedicated upgrade.

## Upgrade path

1. Deploy VRF consumer (subscription or direct funding per Chainlink Monad addresses).
2. Change `toss()` to `requestRandomness()` and move outcome logic to `fulfillRandomWords`.
3. Keep session state; emit the same events for the indexer/UI.

## Deploy (testnet)

From `contracts/` (with `MIN_DEPOSIT_WEI` / `MIN_STAKE_WEI` optional):

```bash
forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url "$MONAD_TESTNET_RPC_URL"
```

Set `NEXT_PUBLIC_COINFLIP_ADDRESS` to the deployed address and verify on MonadVision if desired.
