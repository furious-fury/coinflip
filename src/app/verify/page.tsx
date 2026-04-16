"use client";

import { useState } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { ConfettiBackdrop } from "@/components/confetti-backdrop";
import { coinflipContractAddress } from "@/lib/monad-coin-flip";
import { verifyTossFromChain } from "@/lib/verify-chain-toss";
import type { VerifyTossChainResult } from "@/lib/verify-chain-toss";
import type { Hex } from "viem";

export default function VerifyPage() {
  const publicClient = usePublicClient();
  const coinflip = coinflipContractAddress();

  const [sessionTx, setSessionTx] = useState("");
  const [tossTx, setTossTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyTossChainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!coinflip) {
      setError("Set NEXT_PUBLIC_COINFLIP_ADDRESS to your MonadCoinFlip contract.");
      return;
    }
    if (!publicClient) {
      setError("RPC client not ready — refresh the page.");
      return;
    }
    setBusy(true);
    try {
      const out = await verifyTossFromChain(
        publicClient,
        coinflip,
        sessionTx.trim() as Hex,
        tossTx.trim() as Hex,
      );
      setResult(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConfettiBackdrop />
      <div className="relative z-[1] mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 py-12">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-cf-cyan underline-offset-4 hover:text-white"
          >
            Back to game
          </Link>
          <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,215,0,0.25)]">
            Fairness check
          </h1>
          <p className="mt-2 text-sm text-cf-muted leading-relaxed">
            Paste the two MonadVision transaction hashes: first where you opened the session, then the
            toss you want to check. The app loads block data and events from the chain—no manual seeds
            or block fields.
          </p>
        </div>

        <form onSubmit={verify} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="cf-label">Open session tx hash</span>
            <input
              className="cf-input font-mono text-xs"
              value={sessionTx}
              onChange={(e) => setSessionTx(e.target.value)}
              placeholder="0x…"
              required
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="cf-label">Toss tx hash</span>
            <input
              className="cf-input font-mono text-xs"
              value={tossTx}
              onChange={(e) => setTossTx(e.target.value)}
              placeholder="0x…"
              required
              spellCheck={false}
            />
          </label>
          <button type="submit" className="cf-btn-primary w-fit" disabled={busy}>
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        {result && (
          <div className="cf-panel flex flex-col gap-3 p-4 font-mono text-xs text-cf-muted">
            <p className="font-display text-sm font-bold text-cf-cyan">
              {result.match ? "Hash matches on-chain events" : "Mismatch — investigate RPC / fork"}
            </p>
            <p>
              <span className="text-cf-muted">Outcome: </span>
              <span className="text-white">{result.outcome}</span>
            </p>
            <p>
              <span className="text-cf-muted">Block: </span>
              {result.blockNumber}
            </p>
            <p>
              <span className="text-cf-muted">Toss index: </span>
              {result.tossIndex}
            </p>
            <p className="break-all">
              <span className="text-cf-muted">Player: </span>
              {result.player}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
