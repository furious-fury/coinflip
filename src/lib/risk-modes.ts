import type { RiskMode } from "@/generated/prisma/client";

export type RiskMultipliers = {
  winNum: number;
  winDen: number;
  lossNum: number;
  lossDen: number;
};

const MODES: Record<RiskMode, RiskMultipliers> = {
  SAFE: { winNum: 105, winDen: 100, lossNum: 95, lossDen: 100 },
  NORMAL: { winNum: 11, winDen: 10, lossNum: 9, lossDen: 10 },
  AGGRESSIVE: { winNum: 12, winDen: 10, lossNum: 8, lossDen: 10 },
};

export function multipliersFor(mode: RiskMode): RiskMultipliers {
  return MODES[mode];
}

export function applyMultiplier(
  balanceWei: bigint,
  num: number,
  den: number,
): bigint {
  return (balanceWei * BigInt(num)) / BigInt(den);
}
