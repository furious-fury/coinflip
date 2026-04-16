"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useBalance,
  useChainId,
  useConnect,
  useConnection,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, formatEther, parseEther, type Hex } from "viem";

function randomClientSeedPhrase(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `session-${crypto.randomUUID()}`;
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
import { monadTestnet } from "@/lib/chain";
import { Coin3D } from "@/components/coin-3d";
import { monadCoinFlipAbi, coinflipContractAddress } from "@/lib/monad-coin-flip";
import { clientSeedStringToBytes32 } from "@/lib/client-seed";

type RiskLabel = "SAFE" | "NORMAL" | "AGGRESSIVE";

const RISK_TO_ENUM: Record<RiskLabel, number> = {
  SAFE: 0,
  NORMAL: 1,
  AGGRESSIVE: 2,
};

function riskLabel(mode: number): RiskLabel {
  if (mode === 0) return "SAFE";
  if (mode === 2) return "AGGRESSIVE";
  return "NORMAL";
}

type OnChainSession = {
  active: boolean;
  mode: number;
  stakeWei: bigint;
  sessionBalanceWei: bigint;
  tossCount: number;
  winStreak: number;
  lossStreak: number;
  headsCount: number;
  tailsCount: number;
};

export function GameApp() {
  const coinflip = coinflipContractAddress();
  const { address, chainId, status } = useConnection();
  const onMonad = chainId === monadTestnet.id;
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const walletChainId = useChainId();

  const { data: walletChainBalance, isPending: walletBalancePending, isError: walletBalanceError } =
    useBalance({
      address: address ? (address as `0x${string}`) : undefined,
      chainId: monadTestnet.id,
      query: {
        enabled: Boolean(status === "connected" && address && onMonad),
      },
    });

  const { data: bankrollWei, refetch: refetchBankroll } = useReadContract({
    address: coinflip,
    abi: monadCoinFlipAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(coinflip && address && onMonad),
    },
  });

  const { data: sessionView, refetch: refetchSession } = useReadContract({
    address: coinflip,
    abi: monadCoinFlipAbi,
    functionName: "getSession",
    args: address ? [address] : undefined,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(coinflip && address && onMonad),
    },
  });

  const { data: minDepositOnChain } = useReadContract({
    address: coinflip,
    abi: monadCoinFlipAbi,
    functionName: "minDepositWei",
    chainId: monadTestnet.id,
    query: { enabled: Boolean(coinflip && onMonad) },
  });

  const { data: minStakeOnChain } = useReadContract({
    address: coinflip,
    abi: monadCoinFlipAbi,
    functionName: "minStakeWei",
    chainId: monadTestnet.id,
    query: { enabled: Boolean(coinflip && onMonad) },
  });

  const { writeContractAsync, isPending: writePending } = useWriteContract();

  const [config, setConfig] = useState<{
    faucetUrl: string;
    coinFlipAddress: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [depositEth, setDepositEth] = useState("0.1");
  const [withdrawEth, setWithdrawEth] = useState("0.05");
  const [stakeEth, setStakeEth] = useState("0.01");
  const [riskMode, setRiskMode] = useState<RiskLabel>("NORMAL");
  const [lastToss, setLastToss] = useState<{
    outcome: "HEADS" | "TAILS";
    balanceAfterWei: string;
  } | null>(null);
  const [flip, setFlip] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<Hex | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const active = useMemo(() => {
    const s = sessionView as OnChainSession | undefined;
    if (!s?.active) return null;
    return {
      riskMode: riskLabel(Number(s.mode)),
      stakeWei: s.stakeWei.toString(),
      sessionBalanceWei: s.sessionBalanceWei.toString(),
      tossCount: Number(s.tossCount),
      winStreak: Number(s.winStreak),
      lossStreak: Number(s.lossStreak),
      headsCount: Number(s.headsCount),
      tailsCount: Number(s.tailsCount),
    };
  }, [sessionView]);

  async function ensureMonad() {
    if (walletChainId !== monadTestnet.id && switchChainAsync) {
      await switchChainAsync({ chainId: monadTestnet.id });
    }
  }

  const waitAndSync = useCallback(
    async (hash: Hex) => {
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await Promise.all([refetchBankroll(), refetchSession()]);
    },
    [publicClient, refetchBankroll, refetchSession],
  );

  async function deposit() {
    if (!coinflip || !address) return;
    setErr(null);
    setBusy(true);
    try {
      await ensureMonad();
      const value = parseEther(depositEth);
      const hash = await writeContractAsync({
        address: coinflip,
        abi: monadCoinFlipAbi,
        functionName: "deposit",
        value,
        chainId: monadTestnet.id,
      });
      setLastTxHash(hash);
      await waitAndSync(hash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!coinflip || !address) return;
    setErr(null);
    setBusy(true);
    try {
      await ensureMonad();
      const amountWei = parseEther(withdrawEth);
      const hash = await writeContractAsync({
        address: coinflip,
        abi: monadCoinFlipAbi,
        functionName: "withdraw",
        args: [amountWei],
        chainId: monadTestnet.id,
      });
      setLastTxHash(hash);
      await waitAndSync(hash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!coinflip || !address) return;
    setErr(null);
    setBusy(true);
    setLastToss(null);
    try {
      await ensureMonad();
      const stakeWei = parseEther(stakeEth);
      const seedBytes = clientSeedStringToBytes32(randomClientSeedPhrase());
      const hash = await writeContractAsync({
        address: coinflip,
        abi: monadCoinFlipAbi,
        functionName: "openSession",
        args: [RISK_TO_ENUM[riskMode], stakeWei, seedBytes],
        chainId: monadTestnet.id,
      });
      setLastTxHash(hash);
      await waitAndSync(hash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  async function toss() {
    if (!coinflip || !address || !active) return;
    if (busy || writePending || flip) return;
    setErr(null);
    setBusy(true);
    const animStart = Date.now();
    const minSpinMs = 950;
    setFlip(true);
    setLastToss(null);
    try {
      await ensureMonad();
      const hash = await writeContractAsync({
        address: coinflip,
        abi: monadCoinFlipAbi,
        functionName: "toss",
        chainId: monadTestnet.id,
      });
      setLastTxHash(hash);
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        let outcome: "HEADS" | "TAILS" = "HEADS";
        let balanceAfterWei = "0";
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== coinflip.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({
              abi: monadCoinFlipAbi,
              eventName: "TossResult",
              data: log.data,
              topics: log.topics as [Hex, ...Hex[]],
            });
            if (decoded.eventName === "TossResult") {
              const args = decoded.args as unknown as {
                heads: boolean;
                balanceAfterWei: bigint;
              };
              outcome = args.heads ? "HEADS" : "TAILS";
              balanceAfterWei = args.balanceAfterWei.toString();
            }
          } catch {
            /* skip */
          }
        }
        const elapsed = Date.now() - animStart;
        if (elapsed < minSpinMs) {
          await new Promise((resolve) => setTimeout(resolve, minSpinMs - elapsed));
        }
        setLastToss({ outcome, balanceAfterWei });
        setFlip(false);
      }
      await waitAndSync(hash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Toss failed");
      setFlip(false);
    } finally {
      setBusy(false);
    }
  }

  async function cashOut() {
    if (!coinflip || !address) return;
    setErr(null);
    setBusy(true);
    try {
      await ensureMonad();
      const hash = await writeContractAsync({
        address: coinflip,
        abi: monadCoinFlipAbi,
        functionName: "cashOut",
        chainId: monadTestnet.id,
      });
      setLastTxHash(hash);
      await waitAndSync(hash);
      setLastToss(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cash out failed");
    } finally {
      setBusy(false);
    }
  }

  const profitDeltaWei = active
    ? BigInt(active.sessionBalanceWei) - BigInt(active.stakeWei)
    : null;

  const minDep =
    minDepositOnChain !== undefined ? formatEther(minDepositOnChain as bigint) : null;
  const minSt =
    minStakeOnChain !== undefined ? formatEther(minStakeOnChain as bigint) : null;

  const bankrollDisplay =
    bankrollWei !== undefined ? formatEther(bankrollWei as bigint) : "—";

  const working = busy || writePending;

  return (
    <div className="relative z-[1] mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_24px_rgba(255,215,0,0.35)]">
            CoinFlip
          </h1>
          <Link
            href="/verify"
            className="text-sm font-medium text-cf-cyan underline-offset-4 transition-colors hover:text-white"
          >
            Verify fairness
          </Link>
        </div>
        <p className="text-sm text-cf-muted">
          Monad testnet (chain {monadTestnet.id}). Get MON from{" "}
          <a
            href={config?.faucetUrl ?? "https://faucet.monad.xyz"}
            className="font-semibold text-cf-gold underline decoration-cf-cyan/50 underline-offset-2 hover:text-cf-cyan"
            target="_blank"
            rel="noreferrer"
          >
            faucet
          </a>
          .
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-400/30 bg-red-950/50 px-3 py-2 text-sm text-red-100 backdrop-blur-sm">
          {err}
        </div>
      )}

      {!coinflip && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-50">
          Set <span className="font-mono">NEXT_PUBLIC_COINFLIP_ADDRESS</span> to your deployed{" "}
          <span className="font-mono">MonadCoinFlip</span> contract on Monad testnet, then restart the app.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-cf-muted">
          Wallet
        </h2>
        {status !== "connected" ? (
          <button
            type="button"
            disabled={working || !connectors[0]}
            onClick={() => connect({ connector: connectors[0] })}
            className="cf-btn-accent"
          >
            Connect wallet
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-cf-muted">{address}</span>
            {chainId !== monadTestnet.id && (
              <button
                type="button"
                onClick={() => switchChainAsync?.({ chainId: monadTestnet.id })}
                className="rounded-full border border-cf-gold/50 bg-cf-gold/10 px-3 py-1 text-xs font-semibold text-cf-gold"
              >
                Switch to Monad Testnet
              </button>
            )}
            <button
              type="button"
              onClick={() => disconnect()}
              className="text-xs text-cf-muted underline transition-colors hover:text-white"
            >
              Disconnect
            </button>
          </div>
        )}
        {status === "connected" && address && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cf-muted">
              Wallet balance (native MON)
            </p>
            {!onMonad ? (
              <p className="mt-1 text-sm text-cf-muted">
                Switch to <strong className="text-cf-gold">Monad Testnet</strong> to load your native
                MON balance.
              </p>
            ) : walletBalancePending ? (
              <p className="mt-1 font-mono text-xl tabular-nums text-white/70">Loading…</p>
            ) : walletBalanceError ? (
              <p className="mt-1 text-sm text-red-300/90">Could not load chain balance.</p>
            ) : (
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                {walletChainBalance ? `${formatEther(walletChainBalance.value)} MON` : "—"}
              </p>
            )}
          </div>
        )}
      </section>

      {status === "connected" && address && onMonad && coinflip && (
        <section className="cf-panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-cf-muted">Contract bankroll</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
            {bankrollDisplay} <span className="text-lg text-cf-gold">MON</span>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-cf-muted">
            MON held by the game contract for your address. Deposit sends native MON into the contract;
            withdraw pulls from your bankroll back to your wallet.
          </p>
          {config?.coinFlipAddress && (
            <p className="mt-2 break-all font-mono text-[10px] text-cf-muted/80">
              Contract: {config.coinFlipAddress}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
            <label className="cf-label block">
              Deposit (MON)
              <input
                type="text"
                value={depositEth}
                onChange={(e) => setDepositEth(e.target.value)}
                className="cf-input"
              />
            </label>
            <button
              type="button"
              disabled={working || !coinflip}
              onClick={() => deposit()}
              className="cf-btn-primary"
            >
              Deposit to contract
            </button>
            {minDep && (
              <p className="text-[11px] text-cf-muted">Min deposit {minDep} MON (on-chain)</p>
            )}
            <label className="cf-label block">
              Withdraw to wallet (MON)
              <input
                type="text"
                value={withdrawEth}
                onChange={(e) => setWithdrawEth(e.target.value)}
                className="cf-input"
              />
            </label>
            <button
              type="button"
              disabled={working}
              onClick={() => withdraw()}
              className="cf-btn-ghost"
            >
              Withdraw from contract
            </button>
          </div>
        </section>
      )}

      {status === "connected" && address && onMonad && coinflip && !active && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-cf-muted">
            New session
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cf-label block">
              Risk
              <select
                value={riskMode}
                onChange={(e) => setRiskMode(e.target.value as RiskLabel)}
                className="cf-input"
              >
                <option value="SAFE">Safe (1.05 / 0.95)</option>
                <option value="NORMAL">Normal (1.1 / 0.9)</option>
                <option value="AGGRESSIVE">Aggressive (1.2 / 0.8)</option>
              </select>
            </label>
            <label className="cf-label block">
              Stake (MON)
              <input
                type="text"
                value={stakeEth}
                onChange={(e) => setStakeEth(e.target.value)}
                className="cf-input"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={working || !coinflip}
            onClick={() => startSession()}
            className="cf-btn-primary"
          >
            Open session (tx)
          </button>
          {minSt && (
            <p className="text-[11px] text-cf-muted">Min stake {minSt} MON (on-chain)</p>
          )}
        </section>
      )}

      {status === "connected" && address && onMonad && coinflip && active && (
        <section className="cf-panel flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-cf-muted">
              Session
            </h2>
            <span className="rounded-full bg-cf-magenta/20 px-2.5 py-0.5 text-xs font-bold text-cf-magenta">
              {active.riskMode}
            </span>
          </div>

          <div className="relative mx-auto py-1">
            <Coin3D
              tossing={flip}
              outcome={
                lastToss?.outcome === "HEADS" || lastToss?.outcome === "TAILS"
                  ? lastToss.outcome
                  : null
              }
              onCoinClick={() => toss()}
              disableInteraction={working}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-cf-muted">Session balance</p>
              <p className="font-mono tabular-nums text-white">
                {formatEther(BigInt(active.sessionBalanceWei))} MON
              </p>
            </div>
            <div>
              <p className="text-xs text-cf-muted">P/L vs stake</p>
              <p className="font-mono tabular-nums text-cf-gold">
                {profitDeltaWei === null
                  ? "—"
                  : profitDeltaWei === 0n
                    ? `0 MON`
                    : `${profitDeltaWei < 0n ? "-" : "+"}${formatEther(
                        profitDeltaWei < 0n ? -profitDeltaWei : profitDeltaWei,
                      )} MON`}
              </p>
            </div>
            <div>
              <p className="text-xs text-cf-muted">Streak W / L</p>
              <p className="font-mono text-cf-cyan">
                {active.winStreak} / {active.lossStreak}
              </p>
            </div>
            <div>
              <p className="text-xs text-cf-muted">Tosses</p>
              <p className="font-mono text-white">{active.tossCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={working}
              onClick={() => toss()}
              className="cf-btn-primary"
            >
              Toss
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => cashOut()}
              className="cf-btn-ghost"
            >
              Cash out
            </button>
          </div>
        </section>
      )}

      {lastTxHash && (
        <section className="rounded-xl border border-cf-cyan/30 bg-cf-cyan/5 p-4 text-sm backdrop-blur-sm">
          <p className="font-display font-bold text-cf-cyan">Last transaction</p>
          <a
            href={`${monadTestnet.blockExplorers.default.url}/tx/${lastTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all font-mono text-xs text-cf-gold underline hover:text-white"
          >
            {lastTxHash}
          </a>
        </section>
      )}
    </div>
  );
}
